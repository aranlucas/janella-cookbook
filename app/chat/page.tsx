import { ChatInterface } from "@/components/chatbot/chat-interface";
import { Header } from "@/components/layout/header";
import type { Metadata } from "next";
import { Suspense } from "react";
import { createPageMetadata } from "@/lib/metadata";

export const metadata: Metadata = createPageMetadata({
  title: "AI Chat Assistant | Janella Cookbook",
  description:
    "Chat with our AI assistant for personalized meal planning and cooking advice.",
  path: "/chat",
});

interface ChatPageProps {
  searchParams: Promise<{ recipe?: string; title?: string }>;
}

function ChatLoadingState() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4">
      <div className="h-12 w-12 animate-pulse rounded-full bg-rustic-blush" />
      <p className="font-serif text-lg text-rustic-charcoal/60">
        Warming up the kitchen...
      </p>
    </div>
  );
}

export default async function ChatPage({ searchParams }: ChatPageProps) {
  const params = await searchParams;
  const recipeContext =
    params.recipe && params.title
      ? { slug: params.recipe, title: params.title }
      : undefined;

  return (
    <div className="flex h-dvh flex-col bg-rustic-cream">
      <Header />
      <main className="relative flex min-h-0 flex-1 overflow-hidden bg-[radial-gradient(1200px_520px_at_50%_-12%,rgba(224,78,57,0.09),transparent_60%),linear-gradient(180deg,#f8f5f0_0%,#f3eee6_100%)]">
        <div className="relative z-10 flex min-h-0 w-full flex-1 px-2 py-2 sm:px-4 sm:py-4">
          <Suspense fallback={<ChatLoadingState />}>
            <ChatInterface recipeContext={recipeContext} />
          </Suspense>
        </div>
      </main>
    </div>
  );
}
