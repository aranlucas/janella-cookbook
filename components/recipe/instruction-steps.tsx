import { cn } from "@/lib/utils";
import type { Instruction } from "@/types/recipe";

interface InstructionStepsProps {
  instructions: Instruction[];
  className?: string;
}

export function InstructionSteps({
  instructions,
  className,
}: InstructionStepsProps) {
  // Group instructions by their group field, preserving order within each group
  const groupedInstructions = instructions.reduce<
    Record<string, Instruction[]>
  >((acc, instruction) => {
    const group = instruction.group || "Instructions";
    if (!acc[group]) {
      acc[group] = [];
    }
    acc[group].push(instruction);
    return acc;
  }, {});

  // Sort instructions within each group by sortOrder
  Object.values(groupedInstructions).forEach((group) => {
    group.sort((a, b) => a.sortOrder - b.sortOrder);
  });

  const groups = Object.entries(groupedInstructions);

  return (
    <div className={cn("space-y-6", className)}>
      {groups.map(([groupName, groupInstructions]) => (
        <div key={groupName}>
          {groups.length > 1 && (
            <h4 className="mb-4 font-serif text-lg font-medium text-foreground">
              {groupName}
            </h4>
          )}
          <ol className="space-y-6">
            {groupInstructions.map((instruction, index) => (
              <li
                key={instruction.id}
                className="group/step relative pl-12 transition-all duration-200 hover:translate-x-1"
              >
                <span className="absolute top-0 left-0 flex h-8 w-8 items-center justify-center rounded-full bg-muted font-serif font-bold text-foreground transition-all duration-300 group-hover/step:scale-110 group-hover/step:bg-[var(--highlight)] group-hover/step:text-[var(--highlight-foreground)]">
                  {index + 1}
                </span>
                <div className="space-y-2">
                  <p className="leading-relaxed text-foreground">
                    {instruction.text}
                  </p>
                  {instruction.duration && (
                    <p className="text-sm text-muted-foreground">
                      <span className="inline-block transition-transform duration-300 group-hover/step:rotate-[360deg]">
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
