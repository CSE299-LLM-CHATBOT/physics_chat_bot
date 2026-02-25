"use client";

import Header from "@/app/components/Header";
import React, { useState, useRef, useEffect, useCallback } from "react";
import { PlaceholdersAndVanishInput } from "@/app/components/ui/placeholders-and-vanish-input";
import { Loader2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import botIcon from "../../assets/img/botIcon.png";
import Image from "next/image";
import { HeroHighlight } from "@/app/components/ui/hero-highlight";
import { About } from "../../components/About";
interface ChatEntry {
  question: string;
  response: string | null;
  isLoading: boolean;
  reformulated?: string;
  context?: any;
  timer?: number;
}

interface PageProps {
  params: {
    id: string;
  };
}
// Define the superscript and subscript maps using Record<string, string>
const superscriptMap: Record<string, string> = {
  "0": "⁰",
  "1": "¹",
  "2": "²",
  "3": "³",
  "4": "⁴",
  "5": "⁵",
  "6": "⁶",
  "7": "⁷",
  "8": "⁸",
  "9": "⁹",
  "+": "⁺",
  "-": "⁻",
  "=": "⁼",
  "(": "⁽",
  ")": "⁾",
  a: "ᵃ",
  b: "ᵇ",
  c: "ᶜ",
  d: "ᵈ",
  e: "ᵉ",
  f: "ᶠ",
  g: "ᶢ",
  h: "ʰ",
  i: "ⁱ",
  j: "ʲ",
  k: "ᵏ",
  l: "ˡ",
  m: "ᵐ",
  n: "ⁿ",
  o: "ᵒ",
  p: "ᵖ",
  r: "ʳ",
  s: "ˢ",
  t: "ᵗ",
  u: "ᵘ",
  v: "ᵛ",
  w: "ʷ",
  x: "ˣ",
  y: "ʸ",
  z: "ᶻ",
};

const subscriptMap: Record<string, string> = {
  "0": "₀",
  "1": "₁",
  "2": "₂",
  "3": "₃",
  "4": "₄",
  "5": "₅",
  "6": "₆",
  "7": "₇",
  "8": "₈",
  "9": "₉",
  "+": "₊",
  "-": "₋",
  "=": "₌",
  "(": "₍",
  ")": "₎",
  a: "ₐ",
  e: "ₑ",
  h: "ₕ",
  i: "ᵢ",
  j: "ⱼ",
  k: "ₖ",
  l: "ₗ",
  m: "ₘ",
  n: "ₙ",
  o: "ₒ",
  p: "ₚ",
  r: "ᵣ",
  s: "ₛ",
  t: "ₜ",
  u: "ᵤ",
  v: "ᵥ",
  x: "ₓ",
};

// Helper function to convert text to Unicode subscript/superscript
const convertToUnicode = (input: string): string => {
  // Convert <sup>...</sup> to superscript
  input = input.replace(/<sup>(.*?)<\/sup>/g, (_, text: string) =>
    text
      .split("")
      .map((char: string) => superscriptMap[char] || char)
      .join("")
  );

  // Convert <sub>...</sub> to subscript
  input = input.replace(/<sub>(.*?)<\/sub>/g, (_, text: string) =>
    text
      .split("")
      .map((char: string) => subscriptMap[char] || char)
      .join("")
  );

  return input;
};
function Page({ params }: PageProps) {
  const placeholders: string[] = [
    "What is Newton's first law of motion?",
    "What is the difference between speed and velocity?",
    "What is the first law of thermodynamics?",
    "What is the Heisenberg Uncertainty Principle?",
  ];

  const [inputValue, setInputValue] = useState<string>("");
  const [chatHistory, setChatHistory] = useState<ChatEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const chatEndRef = useRef<HTMLDivElement | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const [newQuestionAdded, setNewQuestionAdded] = useState<boolean>(false);

  // Scroll to the latest question only after submission
  const scrollToBottom = useCallback(() => {
    if (newQuestionAdded) {
      chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
      setNewQuestionAdded(false); // Reset after scrolling
    }
  }, [newQuestionAdded]);
  useEffect(() => {
    scrollToBottom(); // Scroll to the bottom whenever chat history changes
  }, [chatHistory, scrollToBottom]);

  useEffect(() => {
    // Cleanup on unmount
    return () => {
      eventSourceRef.current?.close();
    };
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  };

  const formatTime = (timeInSeconds: number): string => {
    const minutes = Math.floor(timeInSeconds / 60);
    const seconds = timeInSeconds % 60;
    return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(
      2,
      "0"
    )}`;
  };

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    if (!inputValue.trim()) return;

    setChatHistory((prevHistory) => [
      ...prevHistory,
      { question: inputValue, response: "", isLoading: true, timer: 0 },
    ]);
    setNewQuestionAdded(true);

    let timerInterval: NodeJS.Timeout | null = null;

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/question`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ question: inputValue, session_id: params.id }),
        }
      );

      const source = new EventSource(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/stream_response?session_id=${
          params.id
        }&question=${encodeURIComponent(inputValue)}`
      );
      eventSourceRef.current = source;

      timerInterval = setInterval(() => {
        setChatHistory((prevHistory) =>
          prevHistory.map((chat, index) =>
            index === prevHistory.length - 1
              ? { ...chat, timer: (chat.timer || 0) + 1 }
              : chat
          )
        );
      }, 1000);

      const decoder = new TextDecoder();

      source.onmessage = (event) => {
        const decodedChunk = decoder.decode(
          new TextEncoder().encode(event.data),
          { stream: true }
        );

        const formattedChunk = convertToUnicode(
          decodedChunk
            .replace(/<br\s*\/?>/gi, "\n")
            .replace(/<b>/gi, "**")
            .replace(/<\/b>/gi, "**")
        );

        setChatHistory((prevHistory) =>
          prevHistory.map((chat, index) =>
            index === prevHistory.length - 1
              ? { ...chat, response: (chat.response || "") + formattedChunk }
              : chat
          )
        );

        scrollToBottom();
      };

      // Listen for custom events
      source.addEventListener("done", () => {
        clearInterval(timerInterval); // Stop the timer
        setChatHistory((prevHistory) =>
          prevHistory.map((chat, index) =>
            index === prevHistory.length - 1
              ? { ...chat, isLoading: false }
              : chat
          )
        );
        source.close();
      });

      source.addEventListener("error", () => {
        clearInterval(timerInterval); // Stop the timer on error
        setChatHistory((prevHistory) =>
          prevHistory.map((chat, index) =>
            index === prevHistory.length - 1
              ? { ...chat, isLoading: false }
              : chat
          )
        );
        source.close();
      });
    } catch (error: any) {
      clearInterval(timerInterval); // Stop the timer on error
      setError(
        error.message || "An error occurred while processing the request."
      );
      setChatHistory((prevHistory) =>
        prevHistory.map((chat, index) =>
          index === prevHistory.length - 1
            ? { ...chat, isLoading: false }
            : chat
        )
      );
    }

    setInputValue(""); // Clear the input after submission
  };

  const clearChatHistory = async () => {
    setChatHistory([]);
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    const clearChatHistory = () => {
      setChatHistory([]);
    };
  };

  return (
    <HeroHighlight className="h-screen flex flex-col  justify-center items-center">
      {/* Header fixed at the top */}
      <Header onDeleteSession={clearChatHistory} session={params.id} />

      {/* Main content area */}
      <div className="flex-grow mt-20  w-full p-4 flex flex-col justify-center items-center">
        {/* Display the chat history in separate blocks with motion animation */}
        <div className="w-full max-w-5xl space-y-4 overflow-y-scroll overflow-x-hidden overflow-scrollbar-hidden h-[80vh] mb-16">
          {error && <p className="text-red-500">{error}</p>}
          {chatHistory.map((chat, index) => (
            <React.Fragment key={index}>
              {/* User Input */}
              <div className="flex justify-end">
                <div className="bg-[#b9a6a663] p-3 rounded-lg shadow-md max-w-sm w-full">
                  <p className=" text-[17px] font-bold">{chat.question}</p>
                </div>
              </div>

              {/* Response */}
              <div className="flex justify-start relative w-full">
                <div className="w-full relative">
                  <div className="absolute inset-0 h-full w-full bg-gradient-to-r from-red-50 to-purple-50 transform scale-[0.80] rounded-full blur-3xl" />
                  <div className="border p-4 h-full overflow-hidden rounded-2xl shadow-xl w-full relative flex flex-col justify-end items-start">
                    {chat.isLoading ? (
                      <>
                        <div className="flex justify-center items-center mb-4">
                          <Loader2 className="h-6 w-6 text-black animate-spin" />
                        </div>
                        <div>
                          <Image
                            src={botIcon}
                            alt="Bot Icon"
                            width={38}
                            height={38}
                            className="rounded-full"
                          />
                        </div>{" "}
                        {/* Show the streaming response here */}
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm]}
                          className="font-normal text-[18px] text-black"
                        >
                          {chat.response || ""}
                        </ReactMarkdown>
                        <p className="text-sm font-bold text-gray-600">
                          Time: {formatTime(chat.timer || 0)}
                        </p>
                      </>
                    ) : (
                      <>
                        <div>
                          <Image
                            src={botIcon}
                            alt="Bot Icon"
                            width={38}
                            height={38}
                            className="rounded-full"
                          />
                        </div>
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm]}
                          className="font-normal text-[20px] text-black mb-4 relative z-50"
                        >
                          {chat.response || "Sorry, out of context."}
                        </ReactMarkdown>
                        <p className="text-sm font-bold text-gray-600">
                          Total Time: {formatTime(chat.timer || 0)}
                        </p>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </React.Fragment>
          ))}
          <div ref={chatEndRef}></div>
        </div>
      </div>
      {/* Chat Input */}
      <div className="fixed bottom-0  w-full flex justify-center items-center mb-5">
        <PlaceholdersAndVanishInput
          placeholders={placeholders}
          onChange={handleChange}
          onSubmit={onSubmit}
          value={inputValue}
        />
      </div>

      <div className="fixed bottom-0 right-0 mr-8 flex items-center flex-col">
        <p className="text-neutral-400">Created By</p>
        <About />
      </div>
    </HeroHighlight>
  );
}

export default Page;
