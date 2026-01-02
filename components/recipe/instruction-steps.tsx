"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import type { Instruction } from "@/types/recipe";

interface InstructionStepsProps {
  instructions: Instruction[];
  className?: string;
}

export function InstructionSteps({ instructions, className }: InstructionStepsProps) {
  const [currentStep, setCurrentStep] = useState<number | null>(null);

  const sortedInstructions = [...instructions].sort(
    (a, b) => a.stepNumber - b.stepNumber
  );

  return (
    <div className={cn("space-y-6", className)}>
      <ol className="space-y-6">
        {sortedInstructions.map((instruction, index) => (
          <li
            key={instruction.id}
            className={cn(
              "relative pl-12 transition-colors",
              currentStep === index && "bg-butter/30 -mx-4 px-4 py-4 rounded-lg pl-16"
            )}
          >
            <button
              onClick={() => setCurrentStep(currentStep === index ? null : index)}
              className={cn(
                "absolute left-0 top-0 flex h-8 w-8 items-center justify-center rounded-full font-serif font-bold transition-colors",
                currentStep === index
                  ? "bg-terracotta text-warm-white"
                  : "bg-butter text-charcoal hover:bg-terracotta hover:text-warm-white"
              )}
            >
              {instruction.stepNumber}
            </button>
            <div className="space-y-2">
              <p className="text-charcoal leading-relaxed">{instruction.text}</p>
              {instruction.duration && (
                <p className="text-sm text-muted-foreground">
                  ⏱️ {instruction.duration} min
                </p>
              )}
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
