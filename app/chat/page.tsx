import { ChatInterface } from "@/components/chatbot/chat-interface";
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

export default async function ChatPage({ searchParams }: ChatPageProps) {
  const params = await searchParams;
  const recipeContext =
    params.recipe && params.title
      ? { slug: params.recipe, title: params.title }
      : undefined;

  return (
    <main className="fixed inset-0 flex items-center justify-center bg-stone-100 p-4">
      <Suspense
        fallback={<div className="text-stone-500">Loading chat...</div>}
      >
        <ChatInterface recipeContext={recipeContext} />
      </Suspense>
    </main>
  );
}
