"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
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
import { importFromText } from "@/lib/actions";
import { textImportSchema, type TextImportSchema } from "@/lib/validations";
import type { RecipeWithRelations } from "@/types/recipe";

interface TextImportFormProps {
  onSuccess?: (recipe: RecipeWithRelations) => void;
}

export function TextImportForm({ onSuccess }: TextImportFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const form = useForm<TextImportSchema>({
    resolver: zodResolver(textImportSchema),
    defaultValues: {
      text: "",
    },
  });

  const onSubmit = async (data: TextImportSchema) => {
    startTransition(async () => {
      const result = await importFromText(data.text);

      if (!result.success) {
        form.setError("text", { type: "manual", message: result.error });
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
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="text"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Recipe Text</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      placeholder={`Paste your recipe here. For example:

Grandma's Chocolate Chip Cookies

Ingredients:
- 2 1/4 cups flour
- 1 cup butter, softened
- 3/4 cup sugar
- 2 eggs
- 1 tsp vanilla
- 2 cups chocolate chips

Instructions:
1. Preheat oven to 375°F
2. Mix butter and sugar until fluffy
3. Add eggs and vanilla
4. Gradually add flour
5. Fold in chocolate chips
6. Bake for 9-11 minutes`}
                      className="bg-cream border-butter focus:border-terracotta min-h-[300px]"
                      disabled={isPending}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="text-muted-foreground text-sm">
              <p>
                Paste any recipe text - from a cookbook, email, or anywhere
                else. We&apos;ll use AI to extract and organize it
                automatically.
              </p>
            </div>

            <Button
              type="submit"
              className="bg-terracotta hover:bg-rust text-warm-white w-full"
              disabled={isPending}
            >
              {isPending ? (
                <>
                  <span className="mr-2 animate-spin">⏳</span>
                  Parsing...
                </>
              ) : (
                "Parse Recipe"
              )}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
