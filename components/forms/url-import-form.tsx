"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
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

  const form = useForm<UrlImportSchema>({
    resolver: zodResolver(urlImportSchema),
    defaultValues: {
      url: "",
    },
  });

  const onSubmit = async (data: UrlImportSchema) => {
    startTransition(async () => {
      const result = await importFromUrl(data.url);

      if (!result.success) {
        form.setError("url", { type: "manual", message: result.error });
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
    <Card className="bg-card">
      <CardContent className="pt-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="url"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Recipe URL</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      type="url"
                      placeholder="https://example.com/recipe/delicious-pasta"
                      className="border-border bg-background focus:border-primary"
                      disabled={isPending}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="text-sm text-muted-foreground">
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
              className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
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
        </Form>
      </CardContent>
    </Card>
  );
}
