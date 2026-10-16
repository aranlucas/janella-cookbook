import { format } from "@aranlucas/oxforge/format";

export default format({
  sortTailwindcss: {
    stylesheet: "app/globals.css",
    functions: ["cn", "clsx", "cva", "twMerge", "twJoin"],
    attributes: ["classNames", "containerClassName", "labelClassName"],
  },
});
