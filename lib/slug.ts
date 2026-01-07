import slugify from "slugify";
import { prisma } from "./prisma";

/**
 * Generate a unique slug for a recipe
 * For duplicate imports (when counter > 0), creates more distinct slugs
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

    // Try with counter suffix - this allows multiple imports of the same recipe
    // Each import gets a unique slug: recipe-name, recipe-name-1, recipe-name-2, etc.
    slug = `${baseSlug}-${counter}`;
    counter++;

    // Safety limit to prevent infinite loops
    if (counter > 1000) {
      // Use timestamp as fallback to ensure uniqueness
      const timestamp = Date.now();
      slug = `${baseSlug}-${timestamp}`;
      const finalCheck = await prisma.recipe.findUnique({
        where: { slug },
        select: { id: true },
      });
      if (!finalCheck) {
        return slug;
      }
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
