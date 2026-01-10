"use client";

import { useChat, Chat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useEffect, useRef, useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { RecipeWithRelations } from "@/types/recipe";

interface RecipeChatAssistantProps {
  recipe: RecipeWithRelations;
  onApplySuggestion?: (suggestion: string) => void;
}

export function RecipeChatAssistant({
  recipe,
  onApplySuggestion,
}: RecipeChatAssistantProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [input, setInput] = useState("");

  // Create chat instance with configuration
  const chat = useMemo(
    () =>
      new Chat({
        transport: new DefaultChatTransport({
          api: "/api/recipe-chat",
          body: {
            recipeData: {
              title: recipe.title,
              description: recipe.description,
              prepTime: recipe.prepTime,
              cookTime: recipe.cookTime,
              servings: recipe.servings,
              difficulty: recipe.difficulty,
              cuisine: recipe.cuisine,
              course: recipe.course,
              ingredients: recipe.ingredients.map((ing) => ({
                quantity: ing.quantity,
                unit: ing.unit,
                name: ing.name,
                notes: ing.notes,
                group: ing.group,
              })),
              instructions: recipe.instructions.map((inst) => ({
                text: inst.text,
                group: inst.group,
              })),
            },
          },
        }),
      }),
    [recipe],
  );

  const { messages, sendMessage, status, error } = useChat({ chat });

  const isLoading = status === "submitted" || status === "streaming";

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <Card className="bg-warm-white flex h-[600px] flex-col">
      <CardHeader className="border-butter border-b pb-3">
        <CardTitle className="text-lg">AI Recipe Assistant</CardTitle>
        <p className="text-muted-foreground text-sm">
          Ask questions or request modifications to your recipe
        </p>
      </CardHeader>

      <CardContent className="flex flex-1 flex-col gap-4 overflow-hidden p-4">
        {/* Messages area */}
        <ScrollArea className="flex-1 pr-4">
          <div ref={scrollRef} className="space-y-4">
            {messages.length === 0 && (
              <div className="text-muted-foreground flex h-full items-center justify-center text-center text-sm">
                <div className="space-y-2">
                  <p>💬 Start a conversation!</p>
                  <p className="text-xs">
                    Try asking: "How can I make this healthier?" or "Suggest a
                    substitution for butter"
                  </p>
                </div>
              </div>
            )}

            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[80%] rounded-lg px-4 py-2 ${
                    message.role === "user"
                      ? "bg-terracotta text-warm-white"
                      : "bg-cream border-butter border"
                  }`}
                >
                  <div className="text-sm break-words whitespace-pre-wrap">
                    {message.parts
                      .filter((part) => part.type === "text")
                      .map((part, idx) => (
                        <span key={idx}>{"text" in part ? part.text : ""}</span>
                      ))}
                  </div>
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-cream border-butter max-w-[80%] rounded-lg border px-4 py-2">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="animate-pulse">●</span>
                    <span className="animate-pulse">●</span>
                    <span className="animate-pulse">●</span>
                  </div>
                </div>
              </div>
            )}

            {error && (
              <div className="bg-destructive/10 text-destructive rounded-lg border px-4 py-2 text-sm">
                Error: {error.message}
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Input area */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (input.trim()) {
              sendMessage({ text: input });
              setInput("");
            }
          }}
          className="flex gap-2"
        >
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about the recipe or request changes..."
            className="bg-cream border-butter min-h-[60px] resize-none"
            disabled={isLoading}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                if (input.trim()) {
                  sendMessage({ text: input });
                  setInput("");
                }
              }
            }}
          />
          <Button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="bg-terracotta hover:bg-rust text-warm-white shrink-0"
          >
            {isLoading ? "..." : "Send"}
          </Button>
        </form>

        <p className="text-muted-foreground text-xs">
          Press Enter to send, Shift+Enter for new line
        </p>
      </CardContent>
    </Card>
  );
}
