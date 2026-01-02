import { NextRequest, NextResponse } from "next/server";
import { parseRecipeFromText } from "@/lib/recipe-parser";
import { prisma } from "@/lib/prisma";
import { generateUniqueSlug } from "@/lib/slug";
import { generateRecipeEmbedding } from "@/lib/embeddings";
import type { TextImportRequest } from "@/types/recipe";

export async function POST(request: NextRequest) {
  try {
    const body: TextImportRequest = await request.json();

    if (!body.text || body.text.trim().length === 0) {
      return NextResponse.json(
        { error: "Text is required" },
        { status: 400 }
      );
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: "Text parsing requires OpenAI API configuration" },
        { status: 503 }
      );
    }

    // Parse recipe from text
    const parsed = await parseRecipeFromText(body.text);

    // Generate slug
    const slug = await generateUniqueSlug(parsed.title);

    // Generate embedding
    let searchText: string | undefined;
    let embeddingData: number[] | undefined;

    try {
      const embedResult = await generateRecipeEmbedding({
        title: parsed.title,
        description: parsed.description,
        cuisine: parsed.cuisine,
        course: parsed.course,
        ingredients: parsed.ingredients,
        instructions: parsed.instructions,
        totalTime: parsed.totalTime,
        difficulty: parsed.difficulty,
      });
      searchText = embedResult.searchText;
      embeddingData = embedResult.embedding;
    } catch (e) {
      console.error("Failed to generate embedding:", e);
    }

    // Create recipe
    const recipe = await prisma.recipe.create({
      data: {
        title: parsed.title,
        slug,
        description: parsed.description,
        prepTime: parsed.prepTime,
        cookTime: parsed.cookTime,
        totalTime: parsed.totalTime || ((parsed.prepTime || 0) + (parsed.cookTime || 0)) || undefined,
        servings: parsed.servings,
        difficulty: parsed.difficulty || "MEDIUM",
        cuisine: parsed.cuisine,
        course: parsed.course,
        sourceType: "NATURAL_LANGUAGE",
        imageUrl: parsed.imageUrl,
        searchText,
        ingredients: {
          create: parsed.ingredients.map((ing, index) => ({
            quantity: ing.quantity,
            unit: ing.unit,
            name: ing.name,
            notes: ing.notes,
            group: ing.group,
            sortOrder: ing.sortOrder ?? index,
          })),
        },
        instructions: {
          create: parsed.instructions.map((inst, index) => ({
            stepNumber: inst.stepNumber ?? index + 1,
            text: inst.text,
            duration: inst.duration,
          })),
        },
      },
      include: {
        ingredients: { orderBy: { sortOrder: "asc" } },
        instructions: { orderBy: { stepNumber: "asc" } },
        tags: true,
        images: true,
      },
    });

    // Update embedding
    if (embeddingData) {
      const embeddingString = `[${embeddingData.join(",")}]`;
      await prisma.$executeRaw`
        UPDATE "Recipe"
        SET embedding = ${embeddingString}::vector
        WHERE id = ${recipe.id}
      `;
    }

    return NextResponse.json({ data: recipe }, { status: 201 });
  } catch (error) {
    console.error("Error importing recipe from text:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to parse recipe" },
      { status: 500 }
    );
  }
}
