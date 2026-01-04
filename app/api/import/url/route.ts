import { NextRequest, NextResponse } from "next/server";
import { parseRecipeFromUrl } from "@/lib/recipe-parser";
import { prisma } from "@/lib/prisma";
import { generateUniqueSlug } from "@/lib/slug";
import { generateRecipeEmbedding } from "@/lib/embeddings";
import type { UrlImportRequest } from "@/types/recipe";

export async function POST(request: NextRequest) {
  try {
    const body: UrlImportRequest = await request.json();

    if (!body.url) {
      return NextResponse.json({ error: "URL is required" }, { status: 400 });
    }

    // Validate URL
    let url: URL;
    try {
      url = new URL(body.url);
    } catch {
      return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
    }

    // Parse recipe from URL
    const parsed = await parseRecipeFromUrl(url.toString());

    // Generate slug
    const slug = await generateUniqueSlug(parsed.title);

    // Generate embedding
    let searchText: string | undefined;
    let embeddingData: number[] | undefined;

    if (process.env.HUGGINGFACE_API_KEY) {
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
    }

    // Create recipe
    const recipe = await prisma.recipe.create({
      data: {
        title: parsed.title,
        slug,
        description: parsed.description,
        prepTime: parsed.prepTime,
        cookTime: parsed.cookTime,
        totalTime:
          parsed.totalTime ||
          (parsed.prepTime || 0) + (parsed.cookTime || 0) ||
          undefined,
        servings: parsed.servings,
        difficulty: parsed.difficulty || "MEDIUM",
        cuisine: parsed.cuisine,
        course: parsed.course,
        sourceUrl: url.toString(),
        sourceType: "URL_IMPORT",
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
    console.error("Error importing recipe from URL:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to import recipe",
      },
      { status: 500 },
    );
  }
}
