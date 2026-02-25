"use client";
import React from "react";
import { AnimatedTooltip } from "./ui/animated-tooltip";
import fahim from "../assets/img/fahim.jpg";
import amit from "../assets/img/amit.webp";
import sazzad from "../assets/img/sazzad.jpg";
import aman from "../assets/img/aman.jpg";
const people = [
  {
    id: 1,
    name: "Fahim",
    designation: "2131059642",
    image: fahim,
  },
  {
    id: 2,
    name: "Amit",
    designation: "2132692642",
    image: amit,
  },
  {
    id: 3,
    name: "Sazzad",
    designation: "2132025642",
    image: sazzad,
  },
  {
    id: 4,
    name: "Aman",
    designation: "2131864642",
    image: aman,
  },
];

export function About() {
  return (
    <div className="flex flex-row items-center justify-center mb-10 w-full">
      <AnimatedTooltip items={people} />
    </div>
  );
}
