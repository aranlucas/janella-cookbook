import { cn } from "@/lib/utils";

type AspectRatioProps = React.ComponentProps<"div"> & { readonly ratio: number };

function AspectRatio({ ratio, className, style, ...props }: AspectRatioProps) {
  return (
    <div
      data-slot="aspect-ratio"
      style={{ aspectRatio: ratio, ...style }}
      className={cn("relative", className)}
      {...props}
    />
  );
}

export { AspectRatio };
