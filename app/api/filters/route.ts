import { NextResponse } from "next/server";
import { getFilterOptions } from "@/lib/search";

export async function GET() {
  try {
    const filters = await getFilterOptions();

    return NextResponse.json({ data: filters });
  } catch (error) {
    console.error("Error fetching filters:", error);
    return NextResponse.json(
      { error: "Failed to fetch filters" },
      { status: 500 },
    );
  }
}
