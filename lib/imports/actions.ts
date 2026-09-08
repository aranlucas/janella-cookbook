"use server";

import { randomUUID } from "node:crypto";
import { z } from "zod";
import sharp from "sharp";
import { prisma } from "@/lib/prisma";
import {
  parseRecipeFromUrl,
  parseRecipeFromYouTube,
  parseRecipeFromText,
  parseRecipeFromPhoto,
} from "@/lib/recipe-parser";
import {
  recipeInputSchema,
  textImportSchema,
  urlImportSchema,
  youtubeImportSchema,
  type RecipeInputSchema,
} from "@/lib/validations";
import type { ActionResult } from "@/lib/actions";
import type { RecipeWithRelations } from "@/types/recipe";

export interface ImportPreview {
  id: string;
  draft: RecipeInputSchema;
  existing: RecipeWithRelations | null;
}

export async function previewRecipe(form: FormData): Promise<ActionResult<ImportPreview>> {
  try {
    const source = form.get("source");
    const content = form.get("content");
    let sourceUrl: string | undefined;
    let sourceType: RecipeInputSchema["sourceType"] = "NATURAL_LANGUAGE";
    let parsed;
    if (source === "link") {
      const input = urlImportSchema.parse({ url: content });
      const url = new URL(input.url);
      if (url.username || url.password)
        return { success: false, error: "Use a link without embedded credentials." };
      sourceUrl = url.toString();
      sourceType = "URL_IMPORT";
      const youtube = youtubeImportSchema.safeParse({ url: sourceUrl }).success;
      if (youtube) {
        const videoId =
          url.hostname === "youtu.be"
            ? url.pathname.slice(1)
            : url.searchParams.get("v") || url.pathname.split("/")[2];
        if (!videoId || !/^[\w-]{11}$/.test(videoId))
          return { success: false, error: "Enter a YouTube video or Shorts link." };
        sourceUrl = `https://www.youtube.com/watch?v=${videoId}`;
      }
      parsed = await (youtube ? parseRecipeFromYouTube(sourceUrl) : parseRecipeFromUrl(sourceUrl));
    } else if (source === "photo") {
      const file = form.get("file");
      if (!(file instanceof File) || !file.size)
        return { success: false, error: "Choose a recipe photo first." };
      if (file.size > 4 * 1024 * 1024)
        return { success: false, error: "Choose a photo smaller than 4 MB." };
      const bytes = Buffer.from(await file.arrayBuffer());
      const picture = sharp(bytes, { limitInputPixels: 25000000 });
      const meta = await picture.metadata();
      if (!meta.format || !["jpeg", "png", "webp"].includes(meta.format) || (meta.pages ?? 1) > 1)
        return { success: false, error: "Use a single JPEG, PNG or WebP image." };
      const image = await picture
        .rotate()
        .resize({ width: 2000, height: 2000, fit: "inside", withoutEnlargement: true })
        .jpeg()
        .toBuffer();
      sourceType = "PHOTO";
      parsed = await parseRecipeFromPhoto(image);
    } else if (source === "text") {
      const input = textImportSchema.parse({ text: content });
      parsed = await parseRecipeFromText(input.text);
    } else return { success: false, error: "Choose a supported recipe source." };
    if (parsed.isErr()) {
      const message = parsed.error.message;
      return {
        success: false,
        error: /timeout|aborted|No object|429|rate.limit/i.test(message)
          ? "The free model could not finish reading this recipe. Your input is still here. Try again, or paste the text and edit it manually."
          : message,
      };
    }
    const validated = recipeInputSchema.safeParse({ ...parsed.value, sourceType, sourceUrl });
    if (!validated.success)
      return {
        success: false,
        error:
          "The source did not contain a complete recipe. Try clearer text or enter it manually.",
      };
    const existing = sourceUrl
      ? await prisma.recipe.findFirst({
          where: { sourceUrl },
          include: {
            ingredients: { orderBy: { sortOrder: "asc" } },
            instructions: { orderBy: { sortOrder: "asc" } },
            tags: true,
            images: true,
          },
        })
      : null;
    return { success: true, data: { id: randomUUID(), draft: validated.data, existing } };
  } catch (error) {
    console.error("Recipe preview failed:", error);
    return {
      success: false,
      error:
        "Could not read this recipe. Check the format and size, or paste its text instead. Your input has been kept.",
    };
  }
}

export async function restoreRecipePreview(value: unknown): Promise<ActionResult<ImportPreview>> {
  const saved = z
    .object({
      id: z.string().uuid(),
      draft: recipeInputSchema,
      existingId: z.string().nullable(),
      expectedUpdatedAt: z.string().datetime().nullable(),
    })
    .safeParse(value);
  if (!saved.success)
    return { success: false, error: "That draft could not be restored. Choose its source again." };
  try {
    const existing = saved.data.existingId
      ? await prisma.recipe.findUnique({
          where: { id: saved.data.existingId },
          include: { ingredients: true, instructions: true, tags: true, images: true },
        })
      : null;
    if (saved.data.existingId && !existing)
      return { success: false, error: "The recipe being updated no longer exists." };
    if (existing && saved.data.expectedUpdatedAt)
      existing.updatedAt = new Date(saved.data.expectedUpdatedAt);
    return { success: true, data: { id: saved.data.id, draft: saved.data.draft, existing } };
  } catch {
    return {
      success: false,
      error: "Could not restore the draft. Check your connection and reload.",
    };
  }
}
