import os
import asyncio
import numpy as np
from fastapi import FastAPI, Request, HTTPException
from fastapi.responses import StreamingResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.sessions import SessionMiddleware
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_huggingface import HuggingFaceEmbeddings
from langchain.docstore.document import Document
from langchain_community.vectorstores import FAISS
from langchain_ollama import ChatOllama
from langchain.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain.chains import create_history_aware_retriever, create_retrieval_chain
from langchain_core.messages import HumanMessage, AIMessage
from langchain.chains.combine_documents import create_stuff_documents_chain
from config import Config
import logging
from html import escape
from sentence_transformers import CrossEncoder
from sentence_transformers import SentenceTransformer

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize the FastAPI app
app = FastAPI()

# Allow CORS for all origins (for testing purposes; restrict in production)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.add_middleware(SessionMiddleware, secret_key="your_secret_key")

# In-memory session store (session_id -> chat_history)
session_store = {}

# Initialize the LLM model
llm = ChatOllama(
    model="gemma2:2b", 
)

# Initialize PDF and FAISS
txt_save_path = Config.TXT_SAVE_PATH

# Read text file content
with open(txt_save_path, 'r', encoding='utf-8') as file:
    content = file.read()

documents = [Document(page_content=content)]

# Split the text into chunks
text_splitter = RecursiveCharacterTextSplitter(
    chunk_size=900,
    chunk_overlap=100,
    separators=["\n\n", "\n", ". "]
)
texts = text_splitter.split_documents(documents)

# Initialize SentenceTransformer model for dense retrieval
embedding_model = SentenceTransformer('all-MiniLM-L6-v2')
document_embeddings = embedding_model.encode([doc.page_content for doc in texts], convert_to_tensor=True)

# FAISS and embedding initialization
faiss_index_save_path = Config.FAISS_INDEX_PATH
embedding_model_name = Config.EMBEDDING_MODEL_PATH
embeddings = HuggingFaceEmbeddings(model_name=embedding_model_name)
print('embedding starting')



# Initialize FAISS retriever
def initialize_faiss_and_embeddings(split_documents):
    db = None
    try:
        if os.path.exists(faiss_index_save_path):
            db = FAISS.load_local(faiss_index_save_path, embeddings, allow_dangerous_deserialization=True)
            print("FAISS index loaded from existing file.")
        else:
            texts = [doc.page_content for doc in split_documents]
            db = FAISS.from_texts(texts, embeddings)
            db.save_local(faiss_index_save_path)
            print("FAISS index created and saved.")
    except Exception as e:
        print(f"Error loading/creating FAISS index: {e}")
        return None

    retriever = db.as_retriever(k=5) if db else None
    return retriever

retriever = initialize_faiss_and_embeddings(texts)


cross_encoder = CrossEncoder('cross-encoder/ms-marco-MiniLM-L-6-v2')

if retriever is None:
    print("Error initializing retriever.")
    exit(1)


# Dense retriever using SentenceTransformer
# def dense_retriever(query, document_embeddings, top_k=3):
#     query_embedding = embedding_model.encode(query, convert_to_tensor=True)
#     cosine_similarities = np.dot(document_embeddings, query_embedding.T)
#     top_k_indices = np.argsort(cosine_similarities)[-top_k:][::-1]
#     return [texts[i] for i in top_k_indices]


def dense_retriever(query, document_embeddings, top_k=3):
    query_embedding = embedding_model.encode(query, convert_to_tensor=True).cpu()  
    cosine_similarities = np.dot(document_embeddings.cpu(), query_embedding.T)  
    top_k_indices = np.argsort(cosine_similarities)[-top_k:][::-1]
    return [texts[i] for i in top_k_indices]

# Hybrid retrieval using FAISS and dense retriever
def hybrid_retrieval(query):
    faiss_results = retriever.get_relevant_documents(query)
    dense_results = dense_retriever(query, document_embeddings)
    combined_results = faiss_results[:3] + dense_results[:3]
    return combined_results


# Re-rank retrieved documents by relevance
def rerank_with_cross_encoder(retrieved_documents,query):
    # Use cross-encoder to rerank documents based on relevance to the query
    scored_documents = [(doc, cross_encoder.predict([query, doc.page_content])) for doc in retrieved_documents]
    reranked_documents = sorted(scored_documents, key=lambda x: x[1], reverse=True)
    return [doc[0] for doc in reranked_documents if doc[1] > 0.5]



def format_chunk(chunk: str) -> str:

    formatted_text = escape(chunk)
    formatted_text = formatted_text.replace("\n", "<br>")  
    formatted_text = formatted_text.replace("**", "<b>").replace("**", "</b>")  

    return formatted_text

def chat_with_rag_stream(question: str, chat_history: list, session_id: str):
    # Retrieve and re-rank relevant documents
    retrieved_context = hybrid_retrieval(question)
    reranked_context = rerank_with_cross_encoder(retrieved_context, question)
    context_text = "\n\n".join([doc.page_content for doc in reranked_context])
    print("Before Context")
    logger.info(f"Context text: {context_text}---------------------------------------------")

    if not reranked_context:
        logger.info("No relevant context found. Falling back to chat history.")
        fallback_context = [
            message.content for message in chat_history if isinstance(message, AIMessage)
        ]
        if not fallback_context:
            fallback_context = ["No relevant context found in previous conversation."]
    else:
        fallback_context = [doc.page_content for doc in reranked_context]

    # Create a combined context to send to the retriever
    context_for_retriever = fallback_context if not reranked_context else [doc.page_content for doc in reranked_context]

    # Multi-prompting for different question types
    # Factual Prompt
    factual_prompt = """
    Role: Physics Intelligent Chatbot
    Task: Answer physics-related questions with clear, concise, and factual responses. Use the provided context if available; otherwise, draw upon general physics knowledge.

    Guidelines:
    1. **Domain-Specific Focus**:
    - Respond only to physics-related questions.
    - For non-physics questions, respond only with: "This question is outside the scope of physics expertise." Do not elaborate further.
    2. **Context-Driven First**:
    - Prioritize the given context to formulate responses. If no context is provided, rely on fundamental physics principles.
    3. **Emphasize Accuracy**:
    - Provide technically accurate and precise answers, using appropriate physics terminology.
    4. **Keep Responses Concise**:
    - Focus on brevity and relevance without sacrificing clarity.

    Context:
    {context}
    """

    # Reasoning Prompt
    reasoning_prompt = """
    Role: Analytical Physics Intelligent Chatbot
    Task: Answer physics-related questions by applying logical reasoning and analysis. Use provided context if available, or reason independently based on physics principles.

    Guidelines:
    1. **Strict Domain Adherence**:
    - Address only physics-related queries.
    - For non-physics questions, respond only with: "This question is outside the scope of physics expertise." Do not provide additional details.
    2. **Context-Driven Responses**:
    - Use the given context for reasoning. If context is missing, derive answers based on general physics laws and principles.
    3. **Logical and Clear**:
    - Present well-structured answers grounded in logic, avoiding unnecessary jargon or unsupported conclusions.
    4. **Concise and Focused**:
    - Keep responses clear and brief while explaining reasoning as needed.

    Context:
    {context}
    """

    # General Prompt
    general_prompt = """
    Role: Knowledgeable Physics Intelligent Chatbot
    Task: Provide concise, accurate answers to physics-related questions. Use the context if provided, or respond independently within the scope of physics.

    Guidelines:
    1. **Physics-Specific Expertise**:
    - Respond only to physics-related questions. For non-physics questions, respond only with: "This question is outside the scope of physics expertise." Do not elaborate further.
    2. **Context or Independent Response**:
    - Use the provided context if available; otherwise, rely on core physics knowledge to answer.
    3. **Clarity and Brevity**:
    - Keep responses concise, clear, and to the point.
    4. **Technical Accuracy**:
    - Use correct physics terminology and avoid assumptions beyond the domain.

    Context:
    {context}
    """

    # Physics Math Prompt
    math_prompt = """
    Role: Physics and Math Intelligent Chatbot
    Task: Solve physics-related mathematical problems. Use the provided context if available; otherwise, solve using general physics and math knowledge.

    Guidelines:
    1. **Physics and Math Focus**:
    - Respond only to physics-related mathematical questions. For non-physics questions, respond only with: "This question is outside the scope of physics expertise." Do not add any further details.
    2. **Context-Driven or General Solution**:
    - Solve using the given context or general principles when context is absent.
    3. **Show Key Steps**:
    - Include essential steps for problem-solving while maintaining simplicity and clarity.
    4. **Concise and Accurate**:
    - Keep responses brief, accurate, and focused on the solution.
    5. **Simple Notation**:
    - Use clear and standard math notation, avoiding unnecessary elaboration.

    Context:
    {context}
    """



    def select_prompt(question):
        print("Selecting prompt for question: ", question)
        question_lower = question.lower()

        # Expanded keyword and phrase matching for different types of queries
        reasoning_indicators = [
            "why", "explain", "how does", "describe", "reason", "cause", 
            "purpose", "what happens if", "impact", "effect", "analyze", 
            "relationship", "function of", "significance", "interpret"
        ]

        factual_indicators = [
            "who", "what", "define", "is there", "can", "when", "where", 
            "list", "name", "identify", "state", "does", "are", "was", 
            "were", "has", "have", "had", "did"
        ]
        
        # Keywords for mathematical queries
        math_indicators = [
            "calculate", "value of", "formula", "equation", "constant", 
            "factor", "number", "find", "solve", "derive", "compute", 
            "integrate", "differentiate", "express", "determine", 
            "velocity", "acceleration", "force", "energy", "momentum", 
            "power", "mass", "distance", "speed", "work", "pressure"
        ]

        # Check if reasoning indicators are in the question
        if any(indicator in question_lower for indicator in reasoning_indicators):
            logger.info("Reasoning prompt selected.-------------------------------------------")
            return reasoning_prompt
        # Check if factual indicators are in the question
        elif any(indicator in question_lower for indicator in factual_indicators):
            logger.info("Factual prompt selected.---------------------------------------------------")
            return factual_prompt
        # Check if math indicators are in the question
        elif any(indicator in question_lower for indicator in math_indicators):
            logger.info("Physics Math prompt selected.-----------------------------------------------")
            return math_prompt
        else:
            logger.info("General prompt selected.-----------------------------------------------")
            return general_prompt
  
        
    selected_prompt = select_prompt(question)
    qa_prompt = ChatPromptTemplate.from_messages([
    ("system", selected_prompt),
    ("human", "{input}") 
    ])
    contextualize_q_system_prompt = """
    Role: Contextual Question Reformulator
    Task: Reformulate the latest question into a standalone format, incorporating necessary context from the chat history to make it fully understandable on its own.

    Guidelines:
    1. **Preserve Essential Context**:
    - Use relevant details from chat history for clarity, but only if essential.
    2. **Maintain Tone and Specificity**:
    - Match the user’s tone and technical level. Avoid oversimplification.
    3. **Avoid Superfluous Details**:
    - Exclude unnecessary or irrelevant information.
    4. **Do Not Answer**:
    - Focus solely on rephrasing the question.
    5. **Return As-Is If Clear**:
    - If the question is already standalone, return it unchanged.

    Examples:
    - **Chat History**: "What are Newton's laws?"
    **Latest Question**: "How does that relate to energy?"
    **Reformulated**: "How do Newton's laws relate to energy?"

    - **Chat History**: "We discussed the pressure-volume relationship."
    **Latest Question**: "Can you explain again?"
    **Reformulated**: "Can you explain the pressure-volume relationship again?"

    Input:
    Chat History: {chat_history}
    Latest User Question: {input}
    """


    contextualize_q_prompt = ChatPromptTemplate.from_messages([("system", contextualize_q_system_prompt), MessagesPlaceholder("chat_history"), ("human", "{input}")])

    history_aware_retriever=create_history_aware_retriever(
    llm=llm,
    retriever=FAISS.from_texts(context_for_retriever, embeddings).as_retriever(k=3),
    prompt=contextualize_q_prompt
    )
    question_answer_chain = create_stuff_documents_chain(llm, qa_prompt)
    rag_chain = create_retrieval_chain(history_aware_retriever, question_answer_chain)


    # Stream the response using rag_chain with the re-ranked context
    full_response = []
    for chunk in rag_chain.stream({"input": question, "chat_history": chat_history, "context": context_text}):
        if answer_chunk := chunk.get("answer"):
            formatted_chunk = format_chunk(answer_chunk)
            full_response.append(formatted_chunk)
            yield f"data: {formatted_chunk}\n\n"

    complete_answer = ''.join(full_response)
    # Only add to chat history if the answer is not "This question is outside the scope of physics expertise."
    if "This question is outside the scope of physics expertise." not in complete_answer:
        session_store[session_id].append(HumanMessage(content=question))
        session_store[session_id].append(AIMessage(content=complete_answer))
    else:
        logger.info("Answer was out of context; not adding to chat history.")
    

@app.post("/question")
async def ask_question(request: Request):
    data = await request.json()
    question = data.get("question")
    session_id = data.get("session_id")
    
    if not question or not session_id:
        raise HTTPException(status_code=400, detail="Question and session_id are required.")

    if session_id not in session_store:
        session_store[session_id] = []

    return JSONResponse({"message": "Question received."})


@app.get("/stream_response")
async def stream_response(request: Request, session_id: str, question: str):
    chat_history = session_store.get(session_id, [])
    return StreamingResponse(chat_with_rag_stream(question, chat_history, session_id), media_type='text/event-stream')


@app.delete("/delete_session/{session_id}")
async def delete_session(session_id: str):
    logger.info(f"Received request to delete session: {session_id}")
    if session_id in session_store:
        del session_store[session_id]
        logger.info(f"Session {session_id} deleted successfully.")
        return JSONResponse({"message": "Session deleted successfully."})
    else:
        logger.warning(f"Session {session_id} not found.")
        raise HTTPException(status_code=404, detail="Session not found.")

if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)