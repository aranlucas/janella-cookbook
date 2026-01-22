"use client";

import { useChat } from "@ai-sdk/react";
import { Conversation } from "@/components/ai-elements/conversation";
import {
  Message,
  MessageContent,
  MessageResponse,
  Thinking,
} from "@/components/ai-elements/message";
import { PromptInput } from "@/components/ai-elements/prompt-input";
import { useEffect, useRef, useState } from "react";
import { Bot, User } from "lucide-react";

export function ChatInterface() {
  const { messages, sendMessage, status } = useChat();

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

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputValue(e.target.value);
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
          {messages.map((message, index) => (
            <Message
              key={message.id || index}
              from={message.role as "user" | "assistant" | "system"}
            >
              <div className="flex w-full gap-3">
                {/* Avatar */}
                <div
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                    message.role === "user"
                      ? "bg-sage text-warm-white"
                      : "bg-terracotta text-warm-white"
                  }`}
                >
                  {message.role === "user" ? (
                    <User className="h-4 w-4" />
                  ) : (
                    <Bot className="h-4 w-4" />
                  )}
                </div>

                {/* Message content */}
                <MessageContent data-from={message.role}>
                  <MessageResponse>
                    {message.parts.map((part, i) => {
                      if (part.type === "text") {
                        return <span key={i}>{part.text}</span>;
                      }
                      return null;
                    })}
                  </MessageResponse>
                </MessageContent>
              </div>
            </Message>
          ))}

          {/* Loading indicator */}
          {isLoading && (
            <Message from="assistant">
              <div className="flex w-full gap-3">
                <div className="bg-terracotta text-warm-white flex h-8 w-8 shrink-0 items-center justify-center rounded-full">
                  <Bot className="h-4 w-4" />
                </div>
                <MessageContent data-from="assistant">
                  <Thinking />
                </MessageContent>
              </div>
            </Message>
          )}

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
          <PromptInput
            value={inputValue}
            onChange={(e) => {
              setInputValue(e.target.value);
              handleInputChange(e);
            }}
            onSubmit={onSubmit}
            isLoading={isLoading}
            placeholder="Ask me anything about cooking or meal planning..."
            className="flex-1"
          />
        </form>
      </div>
    </div>
  );
}
