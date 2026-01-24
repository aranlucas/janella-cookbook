import { ChatInterface } from "@/components/chatbot/chat-interface";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "AI Chat Assistant | Janella Cookbook",
  description:
    "Chat with our AI assistant for personalized meal planning and cooking advice",
};

export default function ChatPage() {
  return (
    <main className="fixed inset-0 flex items-center justify-center bg-stone-100 p-4">
      <ChatInterface />
    </main>
  );
}
