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
import { importFromYouTube } from "@/lib/actions";
import {
  youtubeImportSchema,
  type YouTubeImportSchema,
} from "@/lib/validations";
import type { RecipeWithRelations } from "@/types/recipe";

interface YouTubeImportFormProps {
  onSuccess?: (recipe: RecipeWithRelations) => void;
}

export function YouTubeImportForm({ onSuccess }: YouTubeImportFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const form = useForm<YouTubeImportSchema>({
    resolver: zodResolver(youtubeImportSchema),
    defaultValues: {
      url: "",
    },
  });

  const onSubmit = async (data: YouTubeImportSchema) => {
    startTransition(async () => {
      const result = await importFromYouTube(data.url);

      if (!result.success) {
        form.setError("url", { type: "manual", message: result.error });
        toast.error(result.error);
        return;
      }

      toast.success("Recipe imported from YouTube");
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
              name="url"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>YouTube URL</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      type="url"
                      placeholder="https://www.youtube.com/watch?v=..."
                      className="bg-cream border-butter focus:border-terracotta"
                      disabled={isPending}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="text-muted-foreground text-sm">
              <p>
                Paste a YouTube video URL of a cooking tutorial. We&apos;ll
                automatically extract the recipe from the video&apos;s
                transcript:
              </p>
              <ul className="mt-2 list-inside list-disc space-y-1">
                <li>Recipe title and description</li>
                <li>Ingredients with quantities</li>
                <li>Step-by-step cooking instructions</li>
                <li>Cooking times and servings</li>
                <li>Video thumbnail as recipe image</li>
              </ul>
              <div className="bg-butter/20 mt-3 rounded-md p-2 text-xs">
                <p className="font-medium">Enhanced Import:</p>
                <p className="mt-1">
                  Using advanced transcript fetching that works with most
                  YouTube videos, including those with auto-generated captions.
                  If a video doesn&apos;t work, try the &quot;Paste Text&quot;
                  tab instead.
                </p>
              </div>
            </div>

            <Button
              type="submit"
              className="bg-terracotta hover:bg-rust text-warm-white w-full"
              disabled={isPending}
            >
              {isPending ? (
                <>
                  <span className="mr-2 animate-spin">⏳</span>
                  Importing from YouTube...
                </>
              ) : (
                "Import from YouTube"
              )}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
