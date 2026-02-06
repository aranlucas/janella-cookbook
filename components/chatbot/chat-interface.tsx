"use client";

import { useChat } from "@ai-sdk/react";
import {
  Attachment,
  AttachmentPreview,
  AttachmentRemove,
  Attachments,
} from "@/components/ai-elements/attachments";
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import {
  Message,
  MessageContent,
  MessageResponse,
} from "@/components/ai-elements/message";
import {
  Tool,
  ToolContent,
  ToolHeader,
  ToolInput,
  ToolOutput,
} from "@/components/ai-elements/tool";
import {
  PromptInput,
  PromptInputActionAddAttachments,
  PromptInputActionMenu,
  PromptInputActionMenuContent,
  PromptInputActionMenuItem,
  PromptInputActionMenuTrigger,
  PromptInputBody,
  PromptInputButton,
  PromptInputFooter,
  PromptInputHeader,
  type PromptInputMessage,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputTools,
  usePromptInputAttachments,
} from "@/components/ai-elements/prompt-input";
import { DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Suggestion, Suggestions } from "@/components/ai-elements/suggestion";
import { Loader } from "@/components/ai-elements/loader";
import { VoiceInput } from "@/components/chatbot/voice-input";
import { MessageContextMenu } from "@/components/chatbot/message-context-menu";
import { quickActions } from "@/components/chatbot/quick-actions-fab";
import { MobileChatHeader } from "@/components/chatbot/mobile-chat-header";
import { hapticLight, hapticSuccess } from "@/lib/haptics";
import {
  Camera,
  ChefHat,
  CookingPot,
  Flame,
  Heart,
  ImageIcon,
  MapPin,
  MapPinOff,
  Sparkles,
  Leaf,
  UtensilsCrossed,
} from "lucide-react";
import { useCallback, useState, useEffect, useRef } from "react";
import { toast } from "sonner";

const cookingSuggestions = [
  { text: "What can I make with chicken and rice?", icon: <CookingPot className="h-3 w-3" /> },
  { text: "Quick 30-min dinner ideas", icon: <Flame className="h-3 w-3" /> },
  { text: "Healthy meal prep for the week", icon: <Leaf className="h-3 w-3" /> },
  { text: "Easy pasta recipes for beginners", icon: <UtensilsCrossed className="h-3 w-3" /> },
  { text: "Cozy comfort food suggestions", icon: <Heart className="h-3 w-3" /> },
  { text: "How to meal plan on a budget?", icon: <Sparkles className="h-3 w-3" /> },
];

interface LocationData {
  latitude: number;
  longitude: number;
  accuracy: number;
}

interface RecipeContext {
  slug: string;
  title: string;
}

interface ChatInterfaceProps {
  recipeContext?: RecipeContext;
}

const PromptInputAttachmentsDisplay = () => {
  const attachments = usePromptInputAttachments();

  if (attachments.files.length === 0) {
    return null;
  }

  return (
    <Attachments variant="inline">
      {attachments.files.map((attachment) => (
        <Attachment
          data={attachment}
          key={attachment.id}
          onRemove={() => attachments.remove(attachment.id)}
        >
          <AttachmentPreview />
          <AttachmentRemove />
        </Attachment>
      ))}
    </Attachments>
  );
};

export function ChatInterface({ recipeContext }: ChatInterfaceProps) {
  const [text, setText] = useState<string>("");
  const [location, setLocation] = useState<LocationData | null>(null);
  const [locationEnabled, setLocationEnabled] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [hasInitialized, setHasInitialized] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Detect mobile device
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768 || "ontouchstart" in window);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Handle mobile keyboard - adjust viewport when keyboard opens
  useEffect(() => {
    if (!isMobile) return;

    const handleResize = () => {
      // Scroll to bottom when keyboard opens
      if (document.activeElement === inputRef.current) {
        setTimeout(() => {
          inputRef.current?.scrollIntoView({
            behavior: "smooth",
            block: "center",
          });
        }, 100);
      }
    };

    const visualViewport = window.visualViewport;
    if (visualViewport) {
      visualViewport.addEventListener("resize", handleResize);
      return () => visualViewport.removeEventListener("resize", handleResize);
    }
  }, [isMobile]);

  const { messages, sendMessage, status, setMessages, error } = useChat({
    onError: (error: Error) => {
      console.error("Chat error:", error.message);

      // Try to parse structured error responses
      try {
        const jsonMatch = error.message.match(/\{.*\}/);
        if (jsonMatch) {
          const data = JSON.parse(jsonMatch[0]);

          // Handle auth required error with redirect
          if (data.error === "auth_required" && data.authorizationUrl) {
            toast.info("Authentication required", {
              description: "Redirecting to login...",
            });
            window.location.href = data.authorizationUrl;
            return;
          }

          // Handle rate limit errors
          if (
            data.error === "rate_limit" ||
            error.message.includes("rate limit")
          ) {
            toast.error("Rate limit exceeded", {
              description:
                "Please wait a moment before sending another message.",
            });
            return;
          }

          // Handle other structured errors
          if (data.message) {
            toast.error("Error", {
              description: data.message,
            });
            return;
          }
        }
      } catch {
        // Not a JSON error, continue to default handling
      }

      // Handle network errors
      if (
        error.message.includes("fetch") ||
        error.message.includes("network") ||
        error.message.includes("Failed to fetch")
      ) {
        toast.error("Network error", {
          description: "Please check your internet connection and try again.",
        });
        return;
      }

      // Handle timeout errors
      if (
        error.message.includes("timeout") ||
        error.message.includes("timed out")
      ) {
        toast.error("Request timed out", {
          description: "The server took too long to respond. Please try again.",
        });
        return;
      }

      // Default error message
      toast.error("Something went wrong", {
        description:
          "An error occurred while processing your message. Please try again.",
      });
    },
  });

  const isLoading = status === "streaming" || status === "submitted";

  // Auto-send initial message when recipe context is provided
  useEffect(() => {
    if (recipeContext && !hasInitialized && messages.length === 0) {
      setHasInitialized(true);
      const initialMessage = `I'd like to chat about the recipe "${recipeContext.title}". Can you help me with cooking tips, ingredient substitutions, or ordering the ingredients?`;
      sendMessage({
        role: "user",
        parts: [{ type: "text", text: initialMessage }],
      });
    }
  }, [recipeContext, hasInitialized, messages.length, sendMessage]);

  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported by your browser");
      return;
    }

    setLocationLoading(true);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const locationData: LocationData = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
        };
        setLocation(locationData);
        setLocationEnabled(true);
        setLocationLoading(false);
        toast.success("Location enabled", {
          description:
            "Your location will be shared with the AI for better recommendations",
        });
      },
      (error) => {
        setLocationLoading(false);
        setLocationEnabled(false);
        switch (error.code) {
          case error.PERMISSION_DENIED:
            toast.error("Location permission denied", {
              description:
                "Please enable location access in your browser settings",
            });
            break;
          case error.POSITION_UNAVAILABLE:
            toast.error("Location unavailable", {
              description: "Unable to determine your location",
            });
            break;
          case error.TIMEOUT:
            toast.error("Location request timed out", {
              description: "Please try again",
            });
            break;
          default:
            toast.error("Failed to get location");
        }
      },
      {
        enableHighAccuracy: false,
        timeout: 10000,
        maximumAge: 300000, // Cache location for 5 minutes
      },
    );
  }, []);

  const toggleLocation = useCallback(() => {
    if (locationEnabled) {
      setLocationEnabled(false);
      setLocation(null);
      toast.info("Location disabled");
    } else {
      requestLocation();
    }
  }, [locationEnabled, requestLocation]);

  const handleSubmit = async (message: PromptInputMessage) => {
    const hasText = Boolean(message.text?.trim());
    const hasFiles = message.files && message.files.length > 0;

    if ((!hasText && !hasFiles) || isLoading) {
      return;
    }

    // Build message parts
    const parts: Array<
      | { type: "text"; text: string }
      | { type: "file"; url: string; mediaType: string }
    > = [];

    // Add text part
    if (message.text?.trim()) {
      parts.push({ type: "text", text: message.text });
    }

    // Add file parts (images)
    if (hasFiles) {
      for (const file of message.files) {
        if (file.url && file.mediaType) {
          parts.push({
            type: "file",
            url: file.url,
            mediaType: file.mediaType,
          });
        }
      }
    }

    sendMessage({
      role: "user",
      parts,
    });
    setText("");
  };

  const handleSuggestionClick = (suggestion: string) => {
    if (isLoading) return;
    hapticLight();

    sendMessage({
      role: "user",
      parts: [{ type: "text", text: suggestion }],
    });
  };

  // Voice input handler
  const handleVoiceTranscript = useCallback((transcript: string) => {
    setText((prev) => prev + transcript);
    hapticSuccess();
  }, []);

  // Quick action handler (from FAB)
  const handleQuickAction = useCallback(
    (prompt: string) => {
      if (isLoading) return;
      hapticLight();

      sendMessage({
        role: "user",
        parts: [{ type: "text", text: prompt }],
      });
    },
    [isLoading, sendMessage],
  );

  // Clear chat handler
  const handleClearChat = useCallback(() => {
    hapticLight();
    setMessages([]);
    toast.success("Chat cleared");
  }, [setMessages]);

  // Camera capture handler
  const handleCameraCapture = useCallback(() => {
    hapticLight();
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.capture = "environment";
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        toast.info("Photo captured! Use the attachment button to upload.");
      }
    };
    input.click();
  }, []);

  return (
    <div className="chat-container flex h-full w-full max-w-4xl flex-col overflow-hidden rounded-3xl border border-rustic-sand/80 bg-white/95 shadow-2xl shadow-rustic-charcoal/5 backdrop-blur-sm">
      {/* Header */}
      {isMobile ? (
        <MobileChatHeader
          locationEnabled={locationEnabled}
          onClearChat={handleClearChat}
        />
      ) : (
        <div className="relative flex shrink-0 items-center gap-4 border-b border-rustic-sand/60 bg-gradient-to-r from-rustic-cream via-rustic-blush/30 to-rustic-butter/40 px-6 py-4">
          {/* Decorative dots */}
          <div className="absolute top-2 right-4 flex gap-1 opacity-30">
            <div className="h-1.5 w-1.5 rounded-full bg-rustic-terracotta" />
            <div className="h-1.5 w-1.5 rounded-full bg-rustic-marigold" />
            <div className="h-1.5 w-1.5 rounded-full bg-rustic-moss" />
          </div>

          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-rustic-terracotta to-rustic-terracotta/80 text-white shadow-lg shadow-rustic-terracotta/20 transition-transform hover:scale-105">
            <ChefHat className="h-6 w-6" />
          </div>
          <div className="flex-1">
            <h2 className="font-serif text-xl font-bold tracking-tight text-rustic-charcoal">
              Janella&apos;s Kitchen Assistant
            </h2>
            <p className="text-xs text-rustic-charcoal/50">
              Your personal cooking companion
            </p>
          </div>
          {locationEnabled && (
            <div className="flex items-center gap-1.5 rounded-full bg-rustic-moss/10 px-3 py-1.5 text-xs font-medium text-rustic-moss ring-1 ring-rustic-moss/20">
              <MapPin className="h-3 w-3" />
              <span>Location on</span>
            </div>
          )}
        </div>
      )}

      {/* Messages area */}
      <Conversation className="flex-1 bg-gradient-to-b from-rustic-cream/30 via-white to-rustic-cream/20">
        <ConversationContent className="px-4 py-6 md:px-6">
          {messages.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-6 px-4">
              {/* Cute chef illustration area */}
              <div className="relative">
                <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-rustic-blush to-rustic-butter shadow-inner">
                  <ChefHat className="h-10 w-10 text-rustic-terracotta" />
                </div>
                <div className="absolute -top-1 -right-1 flex h-7 w-7 animate-bounce items-center justify-center rounded-full bg-rustic-marigold shadow-md">
                  <Sparkles className="h-3.5 w-3.5 text-white" />
                </div>
                <div className="absolute -bottom-1 -left-2 flex h-6 w-6 items-center justify-center rounded-full bg-rustic-moss/90 shadow-md">
                  <Leaf className="h-3 w-3 text-white" />
                </div>
              </div>

              <div className="text-center">
                <h3 className="mb-2 font-serif text-2xl font-bold tracking-tight text-rustic-charcoal">
                  Hello there, chef!
                </h3>
                <p className="max-w-sm text-sm leading-relaxed text-rustic-charcoal/60">
                  I&apos;m here to help with recipes, meal planning, cooking tips,
                  and even grocery orders. What shall we cook today?
                </p>
              </div>

              {/* Feature hints */}
              <div className="flex flex-wrap justify-center gap-3 text-xs">
                <span className="flex items-center gap-1.5 rounded-full bg-rustic-blush/50 px-3 py-1.5 text-rustic-charcoal/60">
                  <ImageIcon className="h-3 w-3 text-rustic-terracotta" />
                  Snap a recipe photo
                </span>
                <span className="flex items-center gap-1.5 rounded-full bg-rustic-butter/50 px-3 py-1.5 text-rustic-charcoal/60">
                  <MapPin className="h-3 w-3 text-rustic-moss" />
                  Find nearby stores
                </span>
                <span className="flex items-center gap-1.5 rounded-full bg-rustic-cream px-3 py-1.5 text-rustic-charcoal/60">
                  <UtensilsCrossed className="h-3 w-3 text-rustic-marigold" />
                  Get cooking tips
                </span>
              </div>

              {/* Suggestion prompt */}
              <div className="mt-2 flex items-center gap-2 rounded-full bg-rustic-terracotta/5 px-4 py-2 text-xs">
                <Sparkles className="h-3 w-3 text-rustic-terracotta" />
                <span className="font-medium text-rustic-charcoal/70">
                  Try a suggestion below to get started
                </span>
              </div>
            </div>
          ) : (
            <>
              {messages.map(({ role, parts }, index) => {
                const textContent = parts
                  .filter((p) => p.type === "text")
                  .map((p) => (p as { type: "text"; text: string }).text)
                  .join("\n");

                return (
                  <MessageContextMenu
                    key={index}
                    messageContent={textContent}
                    messageRole={role === "user" ? "user" : "assistant"}
                  >
                    <Message from={role}>
                      <MessageContent
                        className={
                          role === "user"
                            ? "bg-gradient-to-br from-rustic-terracotta to-rustic-terracotta/90 text-white shadow-md shadow-rustic-terracotta/10"
                            : "bg-rustic-cream/50 text-rustic-charcoal ring-1 ring-rustic-sand/40"
                        }
                      >
                        {parts.map((part, i) => {
                          switch (part.type) {
                            case "dynamic-tool":
                              return (
                                <Tool key={`${role}-tool-${i}`}>
                                  <ToolHeader
                                    type="dynamic-tool"
                                    state={part.state}
                                    toolName={part.toolName}
                                    title={part.toolName}
                                  />
                                  <ToolContent>
                                    <ToolInput input={part.input} />
                                    {(part.state === "output-available" ||
                                      part.state === "output-error") && (
                                      <ToolOutput
                                        output={part.output}
                                        errorText={part.errorText}
                                      />
                                    )}
                                  </ToolContent>
                                </Tool>
                              );
                            case "text":
                              return (
                                <MessageResponse key={`${role}-${i}`}>
                                  {part.text}
                                </MessageResponse>
                              );
                            case "file":
                              return (
                                <img
                                  key={`${role}-${i}`}
                                  src={part.url}
                                  alt="Uploaded image"
                                  className="max-h-48 rounded-xl object-cover shadow-sm"
                                />
                              );
                            default:
                              return null;
                          }
                        })}
                      </MessageContent>
                    </Message>
                  </MessageContextMenu>
                );
              })}
              {isLoading && messages[messages.length - 1]?.role === "user" && (
                <Message from="assistant">
                  <MessageContent className="bg-rustic-cream/50 ring-1 ring-rustic-sand/40">
                    <div className="flex items-center gap-3 py-2">
                      <div className="flex gap-1">
                        <span className="chat-typing-dot h-2 w-2 rounded-full bg-rustic-terracotta/60" style={{ animationDelay: "0ms" }} />
                        <span className="chat-typing-dot h-2 w-2 rounded-full bg-rustic-terracotta/60" style={{ animationDelay: "150ms" }} />
                        <span className="chat-typing-dot h-2 w-2 rounded-full bg-rustic-terracotta/60" style={{ animationDelay: "300ms" }} />
                      </div>
                      <span className="text-sm italic text-rustic-charcoal/40">
                        Cooking up a response...
                      </span>
                    </div>
                  </MessageContent>
                </Message>
              )}
              {error &&
                !isLoading &&
                messages[messages.length - 1]?.role === "user" && (
                  <Message from="assistant">
                    <MessageContent className="border border-red-200/60 bg-red-50/80 ring-1 ring-red-100">
                      <div className="flex flex-col gap-3 py-2">
                        <div className="flex items-center gap-2 text-red-600">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-5 w-5"
                            viewBox="0 0 20 20"
                            fill="currentColor"
                          >
                            <path
                              fillRule="evenodd"
                              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                              clipRule="evenodd"
                            />
                          </svg>
                          <span className="text-sm font-medium">
                            Oops, something went wrong
                          </span>
                        </div>
                        <p className="text-sm text-red-600/80">
                          The kitchen had a little mishap. Let&apos;s try that again!
                        </p>
                        <button
                          onClick={() => {
                            const lastUserMessage =
                              messages[messages.length - 1];
                            if (lastUserMessage?.role === "user") {
                              hapticLight();
                              sendMessage({
                                role: "user",
                                parts: lastUserMessage.parts,
                              });
                            }
                          }}
                          className="self-start rounded-lg bg-rustic-terracotta px-4 py-2 text-sm font-medium text-white shadow-sm transition-all hover:bg-rustic-terracotta/90 hover:shadow active:scale-[0.98]"
                        >
                          Try again
                        </button>
                      </div>
                    </MessageContent>
                  </Message>
                )}
            </>
          )}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>

      {/* Input area */}
      <div className="shrink-0 border-t border-rustic-sand/50 bg-gradient-to-b from-white to-rustic-cream/40">
        <div className="grid gap-3 p-3 md:p-4">
          {/* Suggestions */}
          <Suggestions className="pb-1">
            {cookingSuggestions.map((suggestion) => (
              <Suggestion
                key={suggestion.text}
                onClick={() => handleSuggestionClick(suggestion.text)}
                suggestion={suggestion.text}
                className="group/chip gap-1.5 border-rustic-sand/60 bg-white text-rustic-charcoal/80 shadow-sm transition-all hover:border-rustic-terracotta/30 hover:bg-rustic-blush/30 hover:text-rustic-terracotta hover:shadow"
              >
                <span className="text-rustic-charcoal/40 transition-colors group-hover/chip:text-rustic-terracotta">
                  {suggestion.icon}
                </span>
                {suggestion.text}
              </Suggestion>
            ))}
          </Suggestions>

          {/* Input */}
          <PromptInput
            globalDrop
            multiple
            accept="image/*"
            onSubmit={handleSubmit}
            className="overflow-hidden rounded-2xl border border-rustic-sand/60 bg-white shadow-sm transition-all focus-within:border-rustic-terracotta/40 focus-within:shadow-md focus-within:ring-2 focus-within:ring-rustic-terracotta/10"
          >
            <PromptInputHeader>
              <PromptInputAttachmentsDisplay />
            </PromptInputHeader>
            <PromptInputBody>
              <PromptInputTextarea
                onChange={(event) => setText(event.target.value)}
                value={text}
                placeholder={
                  locationEnabled
                    ? "Ask me anything... (location enabled)"
                    : "What shall we cook today?"
                }
                className="text-rustic-charcoal placeholder:text-rustic-charcoal/35"
              />
            </PromptInputBody>
            <PromptInputFooter>
              <PromptInputTools>
                <PromptInputActionMenu>
                  <PromptInputActionMenuTrigger className="h-8 w-8 rounded-xl border border-rustic-sand/60 bg-white text-rustic-charcoal/50 transition-all hover:border-rustic-terracotta/30 hover:bg-rustic-blush/30 hover:text-rustic-terracotta" />
                  <PromptInputActionMenuContent className="w-56">
                    <PromptInputActionAddAttachments label="Add recipe photo" />
                    <PromptInputActionMenuItem onClick={handleCameraCapture}>
                      <Camera className="mr-2 h-4 w-4" />
                      Take a photo
                    </PromptInputActionMenuItem>
                    <DropdownMenuSeparator />
                    {quickActions.map((action) => (
                      <PromptInputActionMenuItem
                        key={action.id}
                        onClick={() => handleQuickAction(action.prompt)}
                        disabled={isLoading}
                      >
                        <span className="mr-2">{action.icon}</span>
                        {action.label}
                      </PromptInputActionMenuItem>
                    ))}
                  </PromptInputActionMenuContent>
                </PromptInputActionMenu>

                {/* Voice input button */}
                <VoiceInput
                  onTranscript={handleVoiceTranscript}
                  disabled={isLoading}
                />

                <PromptInputButton
                  onClick={toggleLocation}
                  disabled={locationLoading}
                  variant={locationEnabled ? "default" : "ghost"}
                  className={
                    locationEnabled
                      ? "bg-rustic-moss text-white hover:bg-rustic-moss/90"
                      : "text-rustic-charcoal/40 hover:bg-rustic-cream hover:text-rustic-moss"
                  }
                >
                  {locationLoading ? (
                    <Loader className="h-4 w-4" />
                  ) : locationEnabled ? (
                    <MapPin className="h-4 w-4" />
                  ) : (
                    <MapPinOff className="h-4 w-4" />
                  )}
                  <span className="sr-only">
                    {locationEnabled ? "Disable location" : "Enable location"}
                  </span>
                </PromptInputButton>
              </PromptInputTools>
              <PromptInputSubmit
                disabled={!text.trim() || isLoading}
                status={status}
                className="bg-gradient-to-br from-rustic-terracotta to-rustic-terracotta/85 text-white shadow-sm transition-all hover:from-rustic-terracotta/95 hover:to-rustic-terracotta/80 hover:shadow-md disabled:from-rustic-sand disabled:to-rustic-sand disabled:text-rustic-charcoal/30 disabled:shadow-none"
              />
            </PromptInputFooter>
          </PromptInput>

          {/* Powered by badge */}
          <div className="flex justify-center">
            <span className="text-[10px] tracking-wide text-rustic-charcoal/25">
              Powered by Janella&apos;s Kitchen
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
