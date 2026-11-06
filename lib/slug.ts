import slugify from "slugify";
import { ResultAsync } from "neverthrow";
import { prisma } from "./prisma";
import { AppError } from "./errors";

export function generateUniqueSlug(
  title: string,
  existingId?: string,
): ResultAsync<string, AppError> {
  const baseSlug = slugify(title, {
    lower: true,
    strict: true,
    trim: true,
  });

  const findAvailable = async (slug: string, counter: number): Promise<string> => {
    const existing = await prisma.recipe.findUnique({
      where: { slug },
      select: { id: true },
    });

    if (!existing || existing.id === existingId) {
      return slug;
    }

    const nextCounter = counter + 1;

    if (nextCounter > 100) {
      throw new AppError("Could not generate unique slug", "SLUG_ERROR");
    }

    return findAvailable(`${baseSlug}-${counter}`, nextCounter);
  };

  return ResultAsync.fromPromise(findAvailable(baseSlug, 1), (error) =>
    error instanceof AppError
      ? error
      : new AppError(
          error instanceof Error ? error.message : "Slug generation failed",
          "SLUG_ERROR",
        ),
  );
}

export function generateTagSlug(name: string): string {
  return slugify(name, {
    lower: true,
    strict: true,
    trim: true,
  });
}
