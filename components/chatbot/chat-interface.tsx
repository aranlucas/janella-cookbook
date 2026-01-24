"use client";

import { useChat } from "@ai-sdk/react";
import {
  Conversation,
} from "@/components/ai-elements/conversation";
import {
  Message,
  MessageContent,
  MessageResponse,
} from "@/components/ai-elements/message";
import { useEffect, useRef, useState } from "react";
import { Bot } from "lucide-react";

export function ChatInterface() {
  const { messages, sendMessage, status } = useChat({
    onError: (error) => {
      console.log("onError called:", error.message);
      // Parse auth URL from error message
      try {
        const jsonMatch = error.message.match(/\{.*\}/);
        if (jsonMatch) {
          const data = JSON.parse(jsonMatch[0]);
          if (data.error === "auth_required" && data.authorizationUrl) {
            console.log("Redirecting to:", data.authorizationUrl);
            window.location.href = data.authorizationUrl;
          }
        }
      } catch (e) {
        console.error("Failed to parse auth error:", e);
      }
    },
  });

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [inputValue, setInputValue] = useState("");

  const isLoading = status === "streaming" || status === "submitted";

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const onSubmit = () => {
    if (inputValue.trim() && !isLoading) {
      sendMessage({
        role: "user",
        parts: [{ type: "text", text: inputValue }],
      });
      setInputValue("");
    }
  };

  return (
    <div className="bg-warm-white border-sage/20 flex h-[calc(100vh-200px)] flex-col rounded-2xl border shadow-lg">
      {/* Chat header */}
      <div className="border-sage/20 bg-cream flex items-center gap-3 rounded-t-2xl border-b px-6 py-4">
        <div className="bg-terracotta text-warm-white flex h-10 w-10 items-center justify-center rounded-full">
          <Bot className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-charcoal text-lg font-semibold">
            AI Cooking Assistant
          </h2>
          <p className="text-charcoal/60 text-sm">
            Powered by Janella Cookbook
          </p>
        </div>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-hidden">
        <Conversation className="h-full px-6 py-4">
          {messages.map(({ role, parts }, index) => (
            <Message from={role} key={index}>
              <MessageContent>
                {parts.map((part, i) => {
                  switch (part.type) {
                    case "text":
                      return (
                        <MessageResponse key={`${role}-${i}`}>
                          {part.text}
                        </MessageResponse>
                      );
                  }
                })}
              </MessageContent>
            </Message>
          ))}

          <div ref={messagesEndRef} />
        </Conversation>
      </div>

      {/* Input area */}
      <div className="border-sage/20 bg-cream rounded-b-2xl border-t px-6 py-4">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit();
          }}
          className="flex gap-2"
        >
          <input
            value={inputValue}
            onChange={(e) => {
              setInputValue(e.target.value);
            }}
            onSubmit={onSubmit}
            placeholder="Ask me anything about cooking or meal planning..."
            className="flex-1"
          />
        </form>
      </div>
    </div>
  );
}
