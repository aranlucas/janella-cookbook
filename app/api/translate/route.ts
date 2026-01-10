import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { translateRecipe } from "@/lib/translate";

/**
 * POST /api/translate
 * Translate a recipe to a target language
 *
 * Request body:
 * {
 *   recipeId: string;
 *   targetLocale: string; // ISO 639-1 code (e.g., "es", "fr", "de")
 *   apiKey?: string; // Optional: translation API key (defaults to env var)
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { recipeId, targetLocale, apiKey } = body;

    // Validation
    if (!recipeId || typeof recipeId !== "string") {
      return NextResponse.json(
        {
          success: false,
          error: "recipeId is required and must be a string",
        },
        { status: 400 },
      );
    }

    if (!targetLocale || typeof targetLocale !== "string") {
      return NextResponse.json(
        {
          success: false,
          error:
            "targetLocale is required and must be a string (e.g., 'es', 'fr')",
        },
        { status: 400 },
      );
    }

    // Validate locale format (ISO 639-1)
    if (!/^[a-z]{2}(-[A-Z]{2})?$/.test(targetLocale)) {
      return NextResponse.json(
        {
          success: false,
          error:
            "targetLocale must be a valid ISO 639-1 code (e.g., 'es', 'fr', 'en-US')",
        },
        { status: 400 },
      );
    }

    // Fetch recipe with all relations
    const recipe = await prisma.recipe.findUnique({
      where: { id: recipeId },
      include: {
        ingredients: {
          orderBy: { sortOrder: "asc" },
        },
        instructions: {
          orderBy: { sortOrder: "asc" },
        },
        tags: true,
      },
    });

    if (!recipe) {
      return NextResponse.json(
        {
          success: false,
          error: "Recipe not found",
        },
        { status: 404 },
      );
    }

    // Check if translation already exists
    const existingTranslation = await prisma.recipeTranslation.findUnique({
      where: {
        recipeId_locale: {
          recipeId,
          locale: targetLocale,
        },
      },
    });

    if (existingTranslation) {
      return NextResponse.json(
        {
          success: false,
          error: `Translation for locale '${targetLocale}' already exists. Use PUT to update.`,
        },
        { status: 409 },
      );
    }

    // Perform translation
    const translation = await translateRecipe(recipe, targetLocale, apiKey);

    return NextResponse.json({
      success: true,
      data: {
        translation,
        recipeId,
        locale: targetLocale,
      },
      meta: {
        timestamp: new Date().toISOString(),
        version: "1.0",
      },
    });
  } catch (error) {
    console.error("Translation error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Translation failed",
      },
      { status: 500 },
    );
  }
}

/**
 * GET /api/translate?recipeId=xxx&locale=es
 * Get a translation for a recipe
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const recipeId = searchParams.get("recipeId");
    const locale = searchParams.get("locale");

    if (!recipeId || !locale) {
      return NextResponse.json(
        {
          success: false,
          error: "Both recipeId and locale query parameters are required",
        },
        { status: 400 },
      );
    }

    const translation = await prisma.recipeTranslation.findUnique({
      where: {
        recipeId_locale: {
          recipeId,
          locale,
        },
      },
      include: {
        ingredients: true,
        instructions: true,
      },
    });

    if (!translation) {
      return NextResponse.json(
        {
          success: false,
          error: `Translation not found for locale '${locale}'`,
        },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      data: translation,
      meta: {
        timestamp: new Date().toISOString(),
        version: "1.0",
      },
    });
  } catch (error) {
    console.error("Translation fetch error:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to fetch translation",
      },
      { status: 500 },
    );
  }
}

/**
 * PUT /api/translate
 * Update an existing translation
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { recipeId, targetLocale, apiKey } = body;

    if (!recipeId || !targetLocale) {
      return NextResponse.json(
        {
          success: false,
          error: "recipeId and targetLocale are required",
        },
        { status: 400 },
      );
    }

    // Fetch recipe with all relations
    const recipe = await prisma.recipe.findUnique({
      where: { id: recipeId },
      include: {
        ingredients: {
          orderBy: { sortOrder: "asc" },
        },
        instructions: {
          orderBy: { sortOrder: "asc" },
        },
        tags: true,
      },
    });

    if (!recipe) {
      return NextResponse.json(
        {
          success: false,
          error: "Recipe not found",
        },
        { status: 404 },
      );
    }

    // Delete existing translation and its relations (cascade will handle children)
    await prisma.recipeTranslation.deleteMany({
      where: {
        recipeId,
        locale: targetLocale,
      },
    });

    // Create new translation
    const translation = await translateRecipe(recipe, targetLocale, apiKey);

    return NextResponse.json({
      success: true,
      data: {
        translation,
        recipeId,
        locale: targetLocale,
      },
      meta: {
        timestamp: new Date().toISOString(),
        version: "1.0",
      },
    });
  } catch (error) {
    console.error("Translation update error:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Translation update failed",
      },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/translate?recipeId=xxx&locale=es
 * Delete a translation
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const recipeId = searchParams.get("recipeId");
    const locale = searchParams.get("locale");

    if (!recipeId || !locale) {
      return NextResponse.json(
        {
          success: false,
          error: "Both recipeId and locale query parameters are required",
        },
        { status: 400 },
      );
    }

    await prisma.recipeTranslation.deleteMany({
      where: {
        recipeId,
        locale,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        message: `Translation for locale '${locale}' deleted successfully`,
      },
      meta: {
        timestamp: new Date().toISOString(),
        version: "1.0",
      },
    });
  } catch (error) {
    console.error("Translation delete error:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to delete translation",
      },
      { status: 500 },
    );
  }
}
