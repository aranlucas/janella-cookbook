import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateUniqueSlug, generateTagSlug } from "@/lib/slug";
import { generateRecipeEmbedding } from "@/lib/embeddings";
import type {
  RecipeInput,
  Difficulty,
  Course,
  SourceType,
} from "@/types/recipe";
import { Prisma } from "@prisma/client";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const pageSize = parseInt(searchParams.get("pageSize") || "20", 10);
    const cuisine = searchParams.get("cuisine");
    const course = searchParams.get("course") as Course | null;
    const isFavorite = searchParams.get("isFavorite");
    const sortBy = searchParams.get("sortBy") || "updatedAt";
    const sortOrder = searchParams.get("sortOrder") || "desc";

    const where: Prisma.RecipeWhereInput = {};

    if (cuisine) {
      where.cuisine = cuisine;
    }
    if (course) {
      where.course = course;
    }
    if (isFavorite === "true") {
      where.isFavorite = true;
    }

    const orderBy: Prisma.RecipeOrderByWithRelationInput = {};
    if (sortBy === "title") {
      orderBy.title = sortOrder as Prisma.SortOrder;
    } else if (sortBy === "totalTime") {
      orderBy.totalTime = sortOrder as Prisma.SortOrder;
    } else if (sortBy === "rating") {
      orderBy.rating = sortOrder as Prisma.SortOrder;
    } else if (sortBy === "cookCount") {
      orderBy.cookCount = sortOrder as Prisma.SortOrder;
    } else {
      orderBy.updatedAt = sortOrder as Prisma.SortOrder;
    }

    const [recipes, total] = await Promise.all([
      prisma.recipe.findMany({
        where,
        include: {
          ingredients: { orderBy: { sortOrder: "asc" } },
          instructions: { orderBy: { stepNumber: "asc" } },
          tags: true,
          images: true,
        },
        orderBy,
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.recipe.count({ where }),
    ]);

    return NextResponse.json({
      data: recipes,
      total,
      page,
      pageSize,
      hasMore: page * pageSize < total,
    });
  } catch (error) {
    console.error("Error fetching recipes:", error);
    return NextResponse.json(
      { error: "Failed to fetch recipes" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: RecipeInput = await request.json();

    // Validate required fields
    if (!body.title) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }

    // Generate unique slug
    const slug = await generateUniqueSlug(body.title);

    // Calculate total time if not provided
    const totalTime =
      body.totalTime ||
      (body.prepTime || 0) + (body.cookTime || 0) ||
      undefined;

    // Create or find tags
    const tagConnections = body.tags
      ? await Promise.all(
          body.tags.map(async (tagName) => {
            const tagSlug = generateTagSlug(tagName);
            const tag = await prisma.tag.upsert({
              where: { slug: tagSlug },
              create: { name: tagName, slug: tagSlug },
              update: {},
            });
            return { id: tag.id };
          }),
        )
      : [];

    // Prepare recipe data for embedding
    const recipeForEmbedding = {
      title: body.title,
      description: body.description,
      cuisine: body.cuisine,
      course: body.course,
      tags: body.tags?.map((t) => ({ name: t })),
      ingredients: body.ingredients,
      instructions: body.instructions,
      totalTime,
      difficulty: body.difficulty,
    };

    // Generate embedding if HuggingFace is configured
    let searchText: string | undefined;
    let embeddingData: number[] | undefined;

    if (process.env.HUGGINGFACE_API_KEY) {
      try {
        const embedResult = await generateRecipeEmbedding(recipeForEmbedding);
        searchText = embedResult.searchText;
        embeddingData = embedResult.embedding;
      } catch (e) {
        console.error("Failed to generate embedding:", e);
      }
    }

    // Create recipe with relations
    const recipe = await prisma.recipe.create({
      data: {
        title: body.title,
        slug,
        description: body.description,
        prepTime: body.prepTime,
        cookTime: body.cookTime,
        totalTime,
        servings: body.servings,
        difficulty: body.difficulty || "MEDIUM",
        cuisine: body.cuisine,
        course: body.course,
        sourceUrl: body.sourceUrl,
        sourceType: body.sourceType,
        imageUrl: body.imageUrl,
        notes: body.notes,
        rating: body.rating,
        searchText,
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
        instructions: {
          create: body.instructions.map((inst, index) => ({
            stepNumber: inst.stepNumber ?? index + 1,
            text: inst.text,
            duration: inst.duration,
            imageUrl: inst.imageUrl,
          })),
        },
        tags: {
          connect: tagConnections,
        },
      },
      include: {
        ingredients: { orderBy: { sortOrder: "asc" } },
        instructions: { orderBy: { stepNumber: "asc" } },
        tags: true,
        images: true,
      },
    });

    // Update embedding separately (Prisma doesn't support Unsupported in create)
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
    console.error("Error creating recipe:", error);
    return NextResponse.json(
      { error: "Failed to create recipe" },
      { status: 500 },
    );
  }
}
