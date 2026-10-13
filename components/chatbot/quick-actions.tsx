import { Clock, Leaf, ShoppingCart, ChefHat, Utensils } from "lucide-react";

export interface QuickAction {
  readonly id: string;
  readonly icon: React.ReactNode;
  readonly label: string;
  readonly prompt: string;
  readonly color: string;
}

export const quickActions: readonly QuickAction[] = [
  {
    id: "quick-dinner",
    icon: <Clock className="size-4" />,
    label: "Quick dinner",
    prompt: "What's a quick dinner I can make in under 30 minutes?",
    color: "bg-rustic-marigold hover:bg-rustic-marigold/90",
  },
  {
    id: "healthy",
    icon: <Leaf className="size-4" />,
    label: "Healthy meal",
    prompt: "Suggest a healthy and nutritious meal for tonight",
    color: "bg-rustic-moss hover:bg-rustic-moss/90",
  },
  {
    id: "shopping",
    icon: <ShoppingCart className="size-4" />,
    label: "Shopping list",
    prompt: "Help me create a shopping list for the week",
    color: "bg-rustic-terracotta/80 hover:bg-rustic-terracotta/70",
  },
  {
    id: "technique",
    icon: <ChefHat className="size-4" />,
    label: "Cooking tip",
    prompt: "Share a professional cooking technique I should learn",
    color: "bg-rustic-charcoal/70 hover:bg-rustic-charcoal/60",
  },
  {
    id: "leftovers",
    icon: <Utensils className="size-4" />,
    label: "Use leftovers",
    prompt: "What can I make with common leftover ingredients?",
    color: "bg-rustic-blush text-rustic-charcoal hover:bg-rustic-blush/80",
  },
];
