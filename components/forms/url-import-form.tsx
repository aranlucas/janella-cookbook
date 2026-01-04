"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { importFromUrl } from "@/lib/actions";
import { urlImportSchema, type UrlImportSchema } from "@/lib/validations";
import type { RecipeWithRelations } from "@/types/recipe";

interface UrlImportFormProps {
  onSuccess?: (recipe: RecipeWithRelations) => void;
}

export function UrlImportForm({ onSuccess }: UrlImportFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
  } = useForm<UrlImportSchema>({
    resolver: zodResolver(urlImportSchema),
    defaultValues: {
      url: "",
    },
  });

  const onSubmit = async (data: UrlImportSchema) => {
    startTransition(async () => {
      const result = await importFromUrl(data.url);

      if (!result.success) {
        setError("url", { type: "manual", message: result.error });
        toast.error(result.error);
        return;
      }

      toast.success("Recipe imported");
      if (onSuccess) {
        onSuccess(result.data);
      } else {
        router.push(`/recipe/${result.slug}`);
      }
    });
  };

  return (
    <Card className="bg-warm-white">
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="url">Recipe URL</Label>
            <Input
              id="url"
              type="url"
              {...register("url")}
              placeholder="https://example.com/recipe/delicious-pasta"
              className="bg-cream border-butter focus:border-terracotta"
              disabled={isPending}
            />
            {errors.url && (
              <p className="text-destructive text-sm">{errors.url.message}</p>
            )}
          </div>

          <div className="text-muted-foreground text-sm">
            <p>
              Paste a URL from your favorite recipe site. We&apos;ll
              automatically extract:
            </p>
            <ul className="mt-2 list-inside list-disc space-y-1">
              <li>Recipe title and description</li>
              <li>Ingredients with quantities</li>
              <li>Step-by-step instructions</li>
              <li>Cooking times and servings</li>
              <li>Recipe image</li>
            </ul>
          </div>

          <Button
            type="submit"
            className="bg-terracotta hover:bg-rust text-warm-white w-full"
            disabled={isPending}
          >
            {isPending ? (
              <>
                <span className="mr-2 animate-spin">⏳</span>
                Importing...
              </>
            ) : (
              "Import Recipe"
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
