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
            <h4 className="text-charcoal mb-4 font-serif text-lg font-medium">
              {groupName}
            </h4>
          )}
          <ol className="space-y-6">
            {groupInstructions.map((instruction, index) => (
              <li key={instruction.id} className="relative pl-12">
                <span className="bg-butter text-charcoal absolute top-0 left-0 flex h-8 w-8 items-center justify-center rounded-full font-serif font-bold">
                  {index + 1}
                </span>
                <div className="space-y-2">
                  <p className="text-charcoal leading-relaxed">
                    {instruction.text}
                  </p>
                  {instruction.duration && (
                    <p className="text-muted-foreground text-sm">
                      ⏱️ {instruction.duration} min
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
