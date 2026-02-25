"use client";

import { useScroll } from "framer-motion";
import React from "react";
import { HeroHighlight } from "../components/ui/hero-highlight";
import { BackgroundLines } from "../components/ui/background-lines";
import { About } from "../components/About";
import Link from "next/link";
import { CardMove } from "../components/CardMove";
import { Button } from "../components/ui/moving-border";
import { v4 as uuidv4 } from "uuid";

function Home() {
  const ref = React.useRef(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });

  // Generate session token
  const [sessionId, setSessionId] = React.useState("");

  const handleEnterChat = () => {
    const newSessionId = uuidv4(); // Generate unique session token
    setSessionId(newSessionId); // Set sessionId to state
    localStorage.setItem("sessionId", newSessionId); // Store it in localStorage
  };

  return (
    <HeroHighlight
      className="h-screen w-full bg-dot-black/[0.2] rounded-md relative pt-40 overflow-clip"
      ref={ref}
    >
      <BackgroundLines className="flex items-center w-full flex-col px-4">
        <h2 className="bg-clip-text text-transparent text-center bg-gradient-to-b from-neutral-900 to-neutral-700 text-2xl md:text-4xl lg:text-7xl font-sans py-2 md:py-10 relative z-20 font-bold tracking-tight">
          Physics ChatBot
        </h2>
        <div className="w-[40rem] h-5 relative">
          {/* Gradients */}
          <div className="absolute inset-x-20 top-0 bg-gradient-to-r from-transparent via-red-500 to-transparent h-[2px] w-3/4 blur-sm" />
          <div className="absolute inset-x-20 top-0 bg-gradient-to-r from-transparent via-sky-500 to-transparent h-px w-3/4" />
          <div className="absolute inset-x-60 top-0 bg-gradient-to-r from-transparent via-red-600 to-transparent h-[5px] w-1/4 blur-sm" />
          <div className="absolute inset-x-60 top-0 bg-gradient-to-r from-transparent via-green-500 to-transparent h-px w-1/4" />
        </div>
        <p className="max-w-xl mx-auto text-sm md:text-lg text-neutral-700 text-center">
          Get instant answers to your physics questions. From classical
          mechanics to quantum physics, our chatbot is here to help—totally free
          of charge.
        </p>

        <div className="relative -top-40">
          <CardMove />
        </div>
        <div className="w-full h-[890px] mt-9  flex items-center justify-center  absolute">
          <Link href={`/${sessionId}`} className="  z-30  ">
            <Button onClick={handleEnterChat}> Enter a chat</Button>
          </Link>
        </div>
      </BackgroundLines>

      {/* Fixed footer at the bottom */}
      <div className="fixed bottom-0 w-full flex items-center justify-center py-4  ">
        <div className="flex-col w-fit items-center mx-auto justify-end">
          <p className="text-center text-neutral-400">Created By</p>
          <About />
        </div>
      </div>
    </HeroHighlight>
  );
}

export default Home;
