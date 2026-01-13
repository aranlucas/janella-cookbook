import { ChatInterface } from "@/components/chatbot/chat-interface";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "AI Chat Assistant | Janella Cookbook",
  description:
    "Chat with our AI assistant for personalized meal planning and cooking advice",
};

export default function ChatPage() {
  return (
    <div className="container mx-auto max-w-5xl px-4 py-8">
      {/* Page header */}
      <div className="mb-6 text-center">
        <h1 className="text-charcoal mb-2 text-3xl font-bold">
          AI Cooking Assistant
        </h1>
        <p className="text-charcoal/70 mx-auto max-w-2xl">
          Get personalized meal planning suggestions, recipe recommendations,
          and cooking tips from our AI assistant powered by advanced meal
          planning tools.
        </p>
      </div>

      {/* Chat interface */}
      <ChatInterface />

      {/* Footer info */}
      <div className="text-charcoal/50 mt-6 text-center text-sm">
        <p>
          This assistant uses AI to provide meal planning suggestions and
          cooking advice. Responses are generated in real-time and may vary.
        </p>
      </div>
    </div>
  );
}
