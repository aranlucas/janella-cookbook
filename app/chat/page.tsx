import { ChatInterface } from "@/components/chatbot/chat-interface";
import { Header } from "@/components/layout/header";
import type { Metadata } from "next";
import { Suspense } from "react";
import { createPageMetadata } from "@/lib/metadata";

export const metadata: Metadata = createPageMetadata({
  title: "AI Chat Assistant | Janella Cookbook",
  description: "Chat with our AI assistant for personalized meal planning and cooking advice.",
  path: "/chat",
});

interface ChatPageProps {
  readonly searchParams: Promise<{ recipe?: string; title?: string }>;
}

function ChatLoadingState() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4">
      <div className="size-12 animate-pulse rounded-full bg-secondary" />
      <p className="font-display text-lg text-muted-foreground">Warming up the kitchen…</p>
    </div>
  );
}

export default async function ChatPage({ searchParams }: ChatPageProps) {
  const params = await searchParams;

  const recipeContext =
    params.recipe && params.title ? { slug: params.recipe, title: params.title } : undefined;

  return (
    <div className="flex h-dvh flex-col bg-background">
      <Header />
      <main className="relative flex min-h-0 flex-1 overflow-hidden">
        <div className="relative z-10 flex min-h-0 w-full flex-1 p-2 sm:p-4">
          <Suspense fallback={<ChatLoadingState />}>
            <ChatInterface recipeContext={recipeContext} />
          </Suspense>
        </div>
      </main>
    </div>
  );
}
