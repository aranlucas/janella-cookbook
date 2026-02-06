import { ChatInterface } from "@/components/chatbot/chat-interface";
import { Header } from "@/components/layout/header";
import { Metadata } from "next";
import { Suspense } from "react";

export const metadata: Metadata = {
  title: "AI Chat Assistant | Janella Cookbook",
  description:
    "Chat with our AI assistant for personalized meal planning and cooking advice",
};

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
      <main className="relative flex min-h-0 flex-1 items-center justify-center p-2 sm:p-4 md:p-6">
        {/* Decorative background pattern */}
        <div className="pointer-events-none absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%232d2926' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }} />
        <Suspense fallback={<ChatLoadingState />}>
          <ChatInterface recipeContext={recipeContext} />
        </Suspense>
      </main>
    </div>
  );
}
