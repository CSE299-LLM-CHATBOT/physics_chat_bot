"use client";
import { CardStack } from "../components/ui/card-stack";
import { cn } from "@/lib/utils";

export function CardMove() {
  return (
    <div className="h-[40rem] flex items-center justify-center w-full max-w-7xl">
      <CardStack items={CARDS} />
    </div>
  );
}

export const Highlight = ({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) => {
  return (
    <span
      className={cn(
        "font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-700/[0.2] dark:text-emerald-500 px-1 py-0.5",
        className
      )}
    >
      {children}
    </span>
  );
};

const CARDS = [
  {
    id: 0,
    name: "Physical Quantities",
    designation: "Chapter 1",
    content: (
      <p>
        <Highlight>Physical quantity</Highlight> refers to anything that can be
        measured in the physical world. Examples include{" "}
        <Highlight>length</Highlight>, <Highlight>mass</Highlight>, and{" "}
        <Highlight>time</Highlight>. Fundamental quantities like length and time
        are independent, while <Highlight>derived quantities</Highlight> like
        velocity depend on others.
      </p>
    ),
  },
  {
    id: 1,
    name: "Measurement",
    designation: "Chapter 1",
    content: (
      <p>
        Measurement involves determining the magnitude of a physical quantity.
        It requires a standard unit, such as the <Highlight>meter</Highlight>{" "}
        for length, or the <Highlight>second</Highlight> for time. The{" "}
        <Highlight>International System of Units (SI)</Highlight> provides a set
        of standards for measurement.
      </p>
    ),
  },
  {
    id: 2,
    name: "Motion",
    designation: "Chapter 2",
    content: (
      <p>
        Motion occurs when an object changes position with time. There are
        various types of motion including <Highlight>linear motion</Highlight>,{" "}
        <Highlight>rotational motion</Highlight>, and{" "}
        <Highlight>periodic motion</Highlight>. Understanding motion helps
        explain the physical laws governing bodies in motion.
      </p>
    ),
  },
];
