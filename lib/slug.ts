import slugify from "slugify";
import { ResultAsync } from "neverthrow";
import { prisma } from "./prisma";
import { AppError } from "./errors";

/**
 * Generate a unique slug for a recipe.
 * Returns a Result instead of throwing on failure.
 */
export function generateUniqueSlug(
  title: string,
  existingId?: string,
): ResultAsync<string, AppError> {
  const baseSlug = slugify(title, {
    lower: true,
    strict: true,
    trim: true,
  });

  return ResultAsync.fromPromise(
    (async () => {
      let slug = baseSlug;
      let counter = 1;

      while (true) {
        const existing = await prisma.recipe.findUnique({
          where: { slug },
          select: { id: true },
        });

        // If no recipe exists with this slug, or it's the same recipe we're updating
        if (!existing || existing.id === existingId) {
          return slug;
        }

        // Try with counter suffix
        slug = `${baseSlug}-${counter}`;
        counter++;

        // Safety limit
        if (counter > 100) {
          throw new AppError("Could not generate unique slug", "SLUG_ERROR");
        }
      }
    })(),
    (error) =>
      error instanceof AppError
        ? error
        : new AppError(
            error instanceof Error ? error.message : "Slug generation failed",
            "SLUG_ERROR",
          ),
  );
}

/**
 * Generate a slug for a tag
 */
export function generateTagSlug(name: string): string {
  return slugify(name, {
    lower: true,
    strict: true,
    trim: true,
  });
}
