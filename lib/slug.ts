import slugify from "slugify";
import { prisma } from "./prisma";

/**
 * Generate a unique slug for a recipe
 */
export async function generateUniqueSlug(
  title: string,
  existingId?: string,
): Promise<string> {
  const baseSlug = slugify(title, {
    lower: true,
    strict: true,
    trim: true,
  });

  // Check if slug already exists
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
      throw new Error("Could not generate unique slug");
    }
  }
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
