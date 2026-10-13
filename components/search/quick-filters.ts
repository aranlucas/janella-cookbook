export interface FilterChip {
  label: string;
  value: string;
  active?: boolean;
}

// Pre-defined quick filter chips
export const quickFilters: FilterChip[] = [
  { label: "❤️ Favorites", value: "favorites" },
  { label: "⚡ Quick (< 30 min)", value: "quick" },
  { label: "🆕 Recently Added", value: "recent" },
  { label: "⭐ Top Rated", value: "rated" },
];
