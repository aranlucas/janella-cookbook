"use client";

import { useChat } from "@ai-sdk/react";
import Image from "next/image";
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
import { Message, MessageContent, MessageResponse } from "@/components/ai-elements/message";
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
} from "@/components/ai-elements/prompt-input";
import { usePromptInputAttachments } from "@/components/ai-elements/prompt-input-context";
import { DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Suggestion, Suggestions } from "@/components/ai-elements/suggestion";
import { Loader } from "@/components/ai-elements/loader";
import { VoiceInput } from "@/components/chatbot/voice-input";
import { MessageContextMenu } from "@/components/chatbot/message-context-menu";
import { quickActions } from "@/components/chatbot/quick-actions";
import { hapticLight, hapticSuccess } from "@/lib/haptics";
import { jsonValueSchema, readJsonObject, readJsonString } from "@/lib/json";
import {
  Camera,
  ChefHat,
  CookingPot,
  Flame,
  MapPin,
  MapPinOff,
  Leaf,
  UtensilsCrossed,
} from "lucide-react";
import { useCallback, useState, useEffect, useRef } from "react";
import { toast } from "sonner";

const cookingSuggestions = [
  {
    text: "What can I make with chicken and rice?",
    icon: <CookingPot className="size-3" />,
  },
  { text: "Quick 30-min dinner ideas", icon: <Flame className="size-3" /> },
  {
    text: "Healthy meal prep for the week",
    icon: <Leaf className="size-3" />,
  },
  {
    text: "Easy pasta recipes for beginners",
    icon: <UtensilsCrossed className="size-3" />,
  },
];

interface LocationData {
  latitude: number;
  longitude: number;
  accuracy: number;
}

interface RecipeContext {
  readonly slug: string;
  readonly title: string;
}

interface ChatInterfaceProps {
  readonly recipeContext?: RecipeContext;
}

interface TextPart {
  type: "text";
  text: string;
}

interface FilePart {
  type: "file";
  url: string;
  mediaType: string;
}

type MessagePart = TextPart | FilePart;

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
  const [, setLocation] = useState<LocationData | null>(null);
  const [locationEnabled, setLocationEnabled] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const hasInitializedRef = useRef(false);
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
    if (!isMobile) {
      return () => {};
    }

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

    return () => {};
  }, [isMobile]);

  const { messages, sendMessage, status, error } = useChat({
    onError: (chatError: Error) => {
      console.error("Chat error:", chatError.message);

      // Try to parse structured error responses
      try {
        const jsonMatch = chatError.message.match(/\{.*\}/);

        if (jsonMatch) {
          const parsed = jsonValueSchema.parse(JSON.parse(jsonMatch[0]));
          const data = readJsonObject(parsed) ?? {};
          const authorizationUrl = readJsonString(data.authorizationUrl ?? null);

          // Handle auth required error with redirect
          if (data.error === "auth_required" && authorizationUrl !== undefined) {
            toast.info("Authentication required", {
              description: "Redirecting to login...",
            });
            window.location.href = authorizationUrl;

            return;
          }

          // Handle rate limit errors
          if (data.error === "rate_limit" || chatError.message.includes("rate limit")) {
            toast.error("Rate limit exceeded", {
              description: "Please wait a moment before sending another message.",
            });

            return;
          }

          // Handle other structured errors
          const message = readJsonString(data.message ?? null);

          if (message !== undefined) {
            toast.error("Error", {
              description: message,
            });

            return;
          }
        }
      } catch {
        // Not a JSON error, continue to default handling
      }

      // Handle network errors
      if (
        chatError.message.includes("fetch") ||
        chatError.message.includes("network") ||
        chatError.message.includes("Failed to fetch")
      ) {
        toast.error("Network error", {
          description: "Please check your internet connection and try again.",
        });

        return;
      }

      // Handle timeout errors
      if (chatError.message.includes("timeout") || chatError.message.includes("timed out")) {
        toast.error("Request timed out", {
          description: "The server took too long to respond. Please try again.",
        });

        return;
      }

      // Default error message
      toast.error("Something went wrong", {
        description: "An error occurred while processing your message. Please try again.",
      });
    },
  });

  const isLoading = status === "streaming" || status === "submitted";

  // Auto-send initial message when recipe context is provided
  useEffect(() => {
    if (recipeContext && !hasInitializedRef.current && messages.length === 0) {
      hasInitializedRef.current = true;
      const initialMessage = `I'd like to chat about the recipe "${recipeContext.title}". Can you help me with cooking tips, ingredient substitutions, or ordering the ingredients?`;
      sendMessage({
        role: "user",
        parts: [{ type: "text", text: initialMessage }],
      }).catch(() => {});
    }
  }, [recipeContext, messages.length, sendMessage]);

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
          description: "Your location will be shared with the AI for better recommendations",
        });
      },
      (geoError) => {
        setLocationLoading(false);
        setLocationEnabled(false);

        switch (geoError.code) {
          case geoError.PERMISSION_DENIED:
            toast.error("Location permission denied", {
              description: "Please enable location access in your browser settings",
            });
            break;
          case geoError.POSITION_UNAVAILABLE:
            toast.error("Location unavailable", {
              description: "Unable to determine your location",
            });
            break;
          case geoError.TIMEOUT:
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

  const handleSubmit = (message: PromptInputMessage) => {
    const hasText = Boolean(message.text?.trim());
    const hasFiles = message.files && message.files.length > 0;

    if ((!hasText && !hasFiles) || isLoading) {
      return;
    }

    // Build message parts
    const parts: MessagePart[] = [];

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
    }).catch(() => {});
    setText("");
  };

  const handleSuggestionClick = (suggestion: string) => {
    if (isLoading) {
      return;
    }

    hapticLight();

    sendMessage({
      role: "user",
      parts: [{ type: "text", text: suggestion }],
    }).catch(() => {});
  };

  // Voice input handler
  const handleVoiceTranscript = useCallback((transcript: string) => {
    setText((prev) => prev + transcript);
    hapticSuccess();
  }, []);

  // Quick action handler (from FAB)
  const handleQuickAction = useCallback(
    (prompt: string) => {
      if (isLoading) {
        return;
      }

      hapticLight();

      sendMessage({
        role: "user",
        parts: [{ type: "text", text: prompt }],
      }).catch(() => {});
    },
    [isLoading, sendMessage],
  );

  // Camera capture handler
  const handleCameraCapture = useCallback(() => {
    hapticLight();
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.capture = "environment";
    input.addEventListener(
      "change",
      () => {
        const file = input.files?.[0];

        if (file) {
          toast.info("Photo captured! Use the attachment button to upload.");
        }
      },
      { once: true },
    );

    input.click();
  }, []);

  return (
    <div className="chat-container relative flex size-full flex-col overflow-hidden bg-transparent">
      {/* Messages area */}
      <Conversation className="relative z-10 flex-1 bg-transparent">
        <ConversationContent className="mx-auto w-full max-w-3xl px-4 py-6 md:px-6 md:pbs-8">
          {messages.length === 0 ? (
            <div className="flex h-full min-h-10vh flex-col items-center justify-center gap-4 px-4 text-center">
              <div className="flex size-12 items-center justify-center rounded-2xl bg-rustic-terracotta text-white shadow-sm">
                <ChefHat className="size-6" />
              </div>
              <div className="flex flex-col gap-2">
                <h3 className="font-serif text-4xl font-semibold tracking-tight text-rustic-charcoal">
                  Hello there!
                </h3>
                <p className="mx-auto max-w-md text-base leading-relaxed text-rustic-charcoal/75">
                  Ask for recipes, substitutions, meal prep ideas, or cooking help based on what you
                  have.
                </p>
                <p className="text-sm text-rustic-charcoal/60">
                  Start with a quick prompt below or type your own question.
                </p>
              </div>
            </div>
          ) : (
            <>
              {messages.map(({ id, role, parts }) => {
                const textContent = parts
                  .filter((part): part is TextPart => part.type === "text")
                  .map((part) => part.text)
                  .join("\n");

                return (
                  <MessageContextMenu
                    key={id}
                    messageContent={textContent}
                    messageRole={role === "user" ? "user" : "assistant"}
                  >
                    <Message
                      from={role}
                      className={role === "user" ? "max-w-chat-user" : "max-w-chat-assistant"}
                    >
                      <MessageContent
                        className={
                          role === "user"
                            ? "rounded-3xl bg-linear-to-br from-rustic-terracotta to-rustic-terracotta/92 px-4 py-3 text-white shadow-sm shadow-rustic-terracotta/20"
                            : "rounded-3xl border border-rustic-sand/55 bg-white px-4 py-3 text-rustic-charcoal shadow-bubble"
                        }
                      >
                        {parts
                          .map((part, i) => ({ part, key: `${id}-part-${i}` }))
                          .map(({ part, key }) => {
                            switch (part.type) {
                              case "dynamic-tool":
                                return (
                                  <Tool key={key}>
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
                                  <MessageResponse
                                    key={key}
                                    className={
                                      role === "user"
                                        ? "text-white [&_*]:text-white"
                                        : "text-rustic-charcoal/95 [&_*]:text-rustic-charcoal/95"
                                    }
                                  >
                                    {part.text}
                                  </MessageResponse>
                                );
                              case "file":
                                return (
                                  <Image
                                    key={key}
                                    alt="Uploaded image"
                                    className="max-h-48 rounded-xl object-cover shadow-sm"
                                    height={512}
                                    src={part.url}
                                    unoptimized
                                    width={512}
                                  />
                                );
                              case "custom": {
                                throw new Error('Not implemented yet: "custom" case');
                              }

                              case "reasoning": {
                                throw new Error('Not implemented yet: "reasoning" case');
                              }

                              case "reasoning-file": {
                                throw new Error('Not implemented yet: "reasoning-file" case');
                              }

                              case "source-document": {
                                throw new Error('Not implemented yet: "source-document" case');
                              }

                              case "source-url": {
                                throw new Error('Not implemented yet: "source-url" case');
                              }

                              case "step-start": {
                                throw new Error('Not implemented yet: "step-start" case');
                              }

                              default:
                                return null;
                            }
                          })}
                      </MessageContent>
                    </Message>
                  </MessageContextMenu>
                );
              })}
              {isLoading && messages.at(-1)?.role === "user" && (
                <Message from="assistant" className="max-w-chat-assistant">
                  <MessageContent className="rounded-3xl border border-rustic-sand/55 bg-white px-4 py-3 shadow-bubble">
                    <div className="flex items-center gap-3 py-2">
                      <div className="flex gap-1">
                        <span
                          className="chat-typing-dot size-2 rounded-full bg-rustic-terracotta/85"
                          style={{ animationDelay: "0ms" }}
                        />
                        <span
                          className="chat-typing-dot size-2 rounded-full bg-rustic-terracotta/85"
                          style={{ animationDelay: "150ms" }}
                        />
                        <span
                          className="chat-typing-dot size-2 rounded-full bg-rustic-terracotta/85"
                          style={{ animationDelay: "300ms" }}
                        />
                      </div>
                      <span className="text-sm font-medium text-rustic-charcoal/75 italic">
                        Cooking up a response...
                      </span>
                    </div>
                  </MessageContent>
                </Message>
              )}
              {error && !isLoading && messages.at(-1)?.role === "user" && (
                <Message from="assistant">
                  <MessageContent className="border border-red-200/60 bg-red-50/80 ring-1 ring-red-100">
                    <div className="flex flex-col gap-3 py-2">
                      <div className="flex items-center gap-2 text-red-600">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="size-5"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                        >
                          <path
                            fillRule="evenodd"
                            d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                            clipRule="evenodd"
                          />
                        </svg>
                        <span className="text-sm font-medium">Oops, something went wrong</span>
                      </div>
                      <p className="text-sm text-red-600/80">
                        The kitchen had a little mishap. Let&apos;s try that again!
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          const lastUserMessage = messages.at(-1);

                          if (lastUserMessage?.role === "user") {
                            hapticLight();
                            sendMessage({
                              role: "user",
                              parts: lastUserMessage.parts,
                            }).catch(() => {});
                          }
                        }}
                        className="self-start rounded-lg bg-rustic-terracotta px-4 py-2 text-sm font-medium text-white shadow-sm transition-all hover:bg-rustic-terracotta/90 hover:shadow active:scale-98"
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
      <div className="sticky inset-be-0 z-10 shrink-0 bg-linear-to-t from-rustic-cream via-rustic-cream/96 to-transparent pbs-2 pbe-3">
        <div className="mx-auto grid w-full max-w-3xl gap-3 px-3 md:px-4">
          {/* Suggestions */}
          {messages.length === 0 && (
            <>
              <div className="hidden grid-cols-2 gap-2 md:grid">
                {cookingSuggestions.map((suggestion) => (
                  <Suggestion
                    key={suggestion.text}
                    onClick={() => handleSuggestionClick(suggestion.text)}
                    suggestion={suggestion.text}
                    variant="ghost"
                    className="group/chip h-11 w-full justify-start gap-2 bg-white text-rustic-charcoal/95 shadow-chip outline-1 outline-rustic-sand/35 transition-all hover:bg-rustic-blush/45 hover:text-rustic-terracotta hover:outline-rustic-terracotta/35"
                  >
                    <span className="text-rustic-charcoal/65 transition-colors group-hover/chip:text-rustic-terracotta">
                      {suggestion.icon}
                    </span>
                    {suggestion.text}
                  </Suggestion>
                ))}
              </div>
              <Suggestions className="pbe-1 md:hidden">
                {cookingSuggestions.map((suggestion) => (
                  <Suggestion
                    key={suggestion.text}
                    onClick={() => handleSuggestionClick(suggestion.text)}
                    suggestion={suggestion.text}
                    variant="ghost"
                    className="group/chip gap-1.5 bg-white text-rustic-charcoal/95 shadow-chip-strong outline-1 outline-rustic-sand/35 transition-all hover:bg-rustic-blush/45 hover:text-rustic-terracotta hover:outline-rustic-terracotta/35"
                  >
                    <span className="text-rustic-charcoal/65 transition-colors group-hover/chip:text-rustic-terracotta">
                      {suggestion.icon}
                    </span>
                    {suggestion.text}
                  </Suggestion>
                ))}
              </Suggestions>
            </>
          )}

          {/* Input */}
          <PromptInput
            globalDrop
            multiple
            accept="image/*"
            onSubmit={handleSubmit}
            className="overflow-hidden rounded-3xl bg-white shadow-composer outline-1 outline-rustic-sand/35 transition-all focus-within:shadow-composer-focus focus-within:outline-rustic-terracotta/45 [&_[data-slot=input-group]]:border-0 [&_[data-slot=input-group]]:bg-transparent [&_[data-slot=input-group]]:shadow-none [&_[data-slot=input-group]]:ring-0"
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
                className="min-h-12 text-rustic-charcoal placeholder:text-rustic-charcoal/65"
              />
            </PromptInputBody>
            <PromptInputFooter>
              <PromptInputTools>
                <PromptInputActionMenu>
                  <PromptInputActionMenuTrigger className="size-8 rounded-xl bg-rustic-cream/70 text-rustic-charcoal/70 transition-all hover:bg-rustic-blush/45 hover:text-rustic-terracotta" />
                  <PromptInputActionMenuContent className="w-56">
                    <PromptInputActionAddAttachments label="Add recipe photo" />
                    <PromptInputActionMenuItem onClick={handleCameraCapture}>
                      <Camera className="me-2 size-4" />
                      Take a photo
                    </PromptInputActionMenuItem>
                    <DropdownMenuSeparator />
                    {quickActions.map((action) => (
                      <PromptInputActionMenuItem
                        key={action.id}
                        onClick={() => handleQuickAction(action.prompt)}
                        disabled={isLoading}
                      >
                        <span className="me-2">{action.icon}</span>
                        {action.label}
                      </PromptInputActionMenuItem>
                    ))}
                  </PromptInputActionMenuContent>
                </PromptInputActionMenu>

                {/* Voice input button */}
                <VoiceInput
                  onTranscript={handleVoiceTranscript}
                  disabled={isLoading}
                  className="text-rustic-charcoal/70 hover:bg-rustic-cream/80 hover:text-rustic-charcoal"
                />

                <PromptInputButton
                  onClick={toggleLocation}
                  disabled={locationLoading}
                  variant={locationEnabled ? "default" : "ghost"}
                  className={
                    locationEnabled
                      ? "bg-rustic-moss text-white hover:bg-rustic-moss/90"
                      : "text-rustic-charcoal/65 hover:bg-rustic-cream hover:text-rustic-moss"
                  }
                >
                  {locationLoading ? (
                    <Loader className="size-4" />
                  ) : locationEnabled ? (
                    <MapPin className="size-4" />
                  ) : (
                    <MapPinOff className="size-4" />
                  )}
                  <span className="sr-only">
                    {locationEnabled ? "Disable location" : "Enable location"}
                  </span>
                </PromptInputButton>
              </PromptInputTools>
              <PromptInputSubmit
                disabled={!text.trim() || isLoading}
                status={status}
                className="bg-linear-to-br from-rustic-terracotta to-rustic-terracotta/85 text-white shadow-sm transition-all hover:from-rustic-terracotta/95 hover:to-rustic-terracotta/80 hover:shadow-md disabled:from-rustic-sand disabled:to-rustic-sand disabled:text-rustic-charcoal/30 disabled:shadow-none"
              />
            </PromptInputFooter>
          </PromptInput>
        </div>
      </div>
    </div>
  );
}
