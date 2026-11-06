import { Timer } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Instruction } from "@/types/recipe";

interface InstructionStepsProps {
  readonly instructions: readonly Instruction[];
  readonly className?: string;
}

export function InstructionSteps({ instructions, className }: InstructionStepsProps) {
  const groupedInstructions = new Map<string, Instruction[]>();

  for (const instruction of instructions) {
    const group = instruction.group?.trim() ?? "";
    const items = groupedInstructions.get(group) ?? [];
    items.push(instruction);
    groupedInstructions.set(group, items);
  }

  for (const group of groupedInstructions.values()) {
    group.sort((a, b) => a.sortOrder - b.sortOrder);
  }

  const groups = [...groupedInstructions.entries()];

  return (
    <div className={cn("flex flex-col gap-8", className)}>
      {groups.map(([groupName, groupInstructions]) => (
        <div key={groupName || "ungrouped"}>
          {groupName && (
            <h3 className="mbe-4 font-display text-2xl font-semibold text-foreground">
              {groupName}
            </h3>
          )}
          <ol className="flex flex-col gap-5">
            {groupInstructions.map((instruction, index) => (
              <li key={instruction.id} className="flex gap-x-4">
                <span
                  aria-hidden="true"
                  className="w-10 shrink-0 font-display text-3xl leading-none font-semibold text-primary tabular-nums sm:w-14 sm:text-4xl"
                >
                  {index + 1}
                </span>
                <div className="flex max-w-prose flex-col gap-1.5 pbs-0.5">
                  <p className="text-base leading-relaxed text-foreground sm:text-lg">
                    {instruction.text}
                  </p>
                  {instruction.duration && (
                    <p className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
                      <Timer className="size-3.5" aria-hidden="true" />
                      About {instruction.duration} min
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ol>
        </div>
      ))}
    </div>
  );
}
