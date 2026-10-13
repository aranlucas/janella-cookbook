import { cn } from "@/lib/utils";
import type { Instruction } from "@/types/recipe";

interface InstructionStepsProps {
  readonly instructions: readonly Instruction[];
  readonly className?: string;
}

export function InstructionSteps({ instructions, className }: InstructionStepsProps) {
  // Group instructions by their group field, preserving order within each group
  const groupedInstructions = instructions.reduce<Record<string, Instruction[]>>(
    (acc, instruction) => {
      const group = instruction.group ?? "Instructions";

      if (!acc[group]) {
        acc[group] = [];
      }

      acc[group].push(instruction);

      return acc;
    },
    {},
  );

  // Sort instructions within each group by sortOrder
  for (const group of Object.values(groupedInstructions)) {
    group.sort((a, b) => a.sortOrder - b.sortOrder);
  }

  const groups = Object.entries(groupedInstructions);

  return (
    <div className={cn("flex flex-col gap-6", className)}>
      {groups.map(([groupName, groupInstructions]) => (
        <div key={groupName}>
          {groups.length > 1 && (
            <h4 className="mbe-4 font-serif text-lg font-medium text-foreground">{groupName}</h4>
          )}
          <ol className="flex flex-col gap-4">
            {groupInstructions.map((instruction, index) => (
              <li
                key={instruction.id}
                className="group/step relative rounded-xl border border-border/35 bg-background/55 p-4 ps-12 transition-all duration-200 hover:translate-x-1 hover:border-primary/25"
              >
                <span className="absolute inset-s-0 inset-bs-0 flex size-8 items-center justify-center rounded-full bg-muted font-serif font-bold text-foreground transition-all duration-300 group-hover/step:scale-110 group-hover/step:bg-highlight group-hover/step:text-highlight-foreground">
                  {index + 1}
                </span>
                <div className="flex flex-col gap-2">
                  <p className="text-sm leading-relaxed text-foreground sm:text-base">
                    {instruction.text}
                  </p>
                  {instruction.duration && (
                    <p className="text-sm text-muted-foreground">
                      <span className="inline-block transition-transform duration-300 group-hover/step:rotate-360">
                        ⏱️
                      </span>{" "}
                      {instruction.duration} min
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
