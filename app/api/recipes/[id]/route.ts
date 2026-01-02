import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateUniqueSlug, generateTagSlug } from "@/lib/slug";
import { generateRecipeEmbedding } from "@/lib/embeddings";
import type { RecipeInput } from "@/types/recipe";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params;

    // Try to find by ID first, then by slug
    let recipe = await prisma.recipe.findUnique({
      where: { id },
      include: {
        ingredients: { orderBy: { sortOrder: "asc" } },
        instructions: { orderBy: { stepNumber: "asc" } },
        tags: true,
        images: true,
      },
    });

    if (!recipe) {
      recipe = await prisma.recipe.findUnique({
        where: { slug: id },
        include: {
          ingredients: { orderBy: { sortOrder: "asc" } },
          instructions: { orderBy: { stepNumber: "asc" } },
          tags: true,
          images: true,
        },
      });
    }

    if (!recipe) {
      return NextResponse.json(
        { error: "Recipe not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ data: recipe });
  } catch (error) {
    console.error("Error fetching recipe:", error);
    return NextResponse.json(
      { error: "Failed to fetch recipe" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params;
    const body: Partial<RecipeInput> & {
      isFavorite?: boolean;
      cookCount?: number;
      lastCooked?: string;
    } = await request.json();

    // Check if recipe exists
    const existing = await prisma.recipe.findUnique({
      where: { id },
      include: { tags: true },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Recipe not found" },
        { status: 404 }
      );
    }

    // Generate new slug if title changed
    let slug = existing.slug;
    if (body.title && body.title !== existing.title) {
      slug = await generateUniqueSlug(body.title, id);
    }

    // Calculate total time
    const totalTime = body.totalTime ||
      ((body.prepTime ?? existing.prepTime ?? 0) + (body.cookTime ?? existing.cookTime ?? 0)) || undefined;

    // Handle tags
    let tagConnections: { id: string }[] = [];
    if (body.tags) {
      tagConnections = await Promise.all(
        body.tags.map(async (tagName) => {
          const tagSlug = generateTagSlug(tagName);
          const tag = await prisma.tag.upsert({
            where: { slug: tagSlug },
            create: { name: tagName, slug: tagSlug },
            update: {},
          });
          return { id: tag.id };
        })
      );
    }

    // Prepare update data
    const updateData: Record<string, unknown> = {
      title: body.title,
      slug,
      description: body.description,
      prepTime: body.prepTime,
      cookTime: body.cookTime,
      totalTime,
      servings: body.servings,
      difficulty: body.difficulty,
      cuisine: body.cuisine,
      course: body.course,
      sourceUrl: body.sourceUrl,
      imageUrl: body.imageUrl,
      notes: body.notes,
      rating: body.rating,
      isFavorite: body.isFavorite,
      cookCount: body.cookCount,
      lastCooked: body.lastCooked ? new Date(body.lastCooked) : undefined,
    };

    // Remove undefined values
    Object.keys(updateData).forEach((key) => {
      if (updateData[key] === undefined) {
        delete updateData[key];
      }
    });

    // Update ingredients if provided
    if (body.ingredients) {
      await prisma.ingredient.deleteMany({ where: { recipeId: id } });
    }

    // Update instructions if provided
    if (body.instructions) {
      await prisma.instruction.deleteMany({ where: { recipeId: id } });
    }

    // Update recipe
    const recipe = await prisma.recipe.update({
      where: { id },
      data: {
        ...updateData,
        ...(body.ingredients && {
          ingredients: {
            create: body.ingredients.map((ing, index) => ({
              quantity: ing.quantity,
              unit: ing.unit,
              name: ing.name,
              notes: ing.notes,
              group: ing.group,
              sortOrder: ing.sortOrder ?? index,
            })),
          },
        }),
        ...(body.instructions && {
          instructions: {
            create: body.instructions.map((inst, index) => ({
              stepNumber: inst.stepNumber ?? index + 1,
              text: inst.text,
              duration: inst.duration,
              imageUrl: inst.imageUrl,
            })),
          },
        }),
        ...(body.tags && {
          tags: {
            set: tagConnections,
          },
        }),
      },
      include: {
        ingredients: { orderBy: { sortOrder: "asc" } },
        instructions: { orderBy: { stepNumber: "asc" } },
        tags: true,
        images: true,
      },
    });

    // Regenerate embedding if content changed
    if (process.env.OPENAI_API_KEY && (body.title || body.description || body.ingredients || body.instructions)) {
      try {
        const recipeForEmbedding = {
          title: recipe.title,
          description: recipe.description,
          cuisine: recipe.cuisine,
          course: recipe.course,
          tags: recipe.tags,
          ingredients: recipe.ingredients,
          instructions: recipe.instructions,
          totalTime: recipe.totalTime,
          difficulty: recipe.difficulty,
        };

        const { searchText, embedding } = await generateRecipeEmbedding(recipeForEmbedding);
        const embeddingString = `[${embedding.join(",")}]`;

        await prisma.$executeRaw`
          UPDATE "Recipe"
          SET "searchText" = ${searchText}, embedding = ${embeddingString}::vector
          WHERE id = ${id}
        `;
      } catch (e) {
        console.error("Failed to regenerate embedding:", e);
      }
    }

    return NextResponse.json({ data: recipe });
  } catch (error) {
    console.error("Error updating recipe:", error);
    return NextResponse.json(
      { error: "Failed to update recipe" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params;

    // Check if recipe exists
    const existing = await prisma.recipe.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Recipe not found" },
        { status: 404 }
      );
    }

    // Delete recipe (cascade will handle related records)
    await prisma.recipe.delete({ where: { id } });

    return NextResponse.json({ message: "Recipe deleted successfully" });
  } catch (error) {
    console.error("Error deleting recipe:", error);
    return NextResponse.json(
      { error: "Failed to delete recipe" },
      { status: 500 }
    );
  }
}
