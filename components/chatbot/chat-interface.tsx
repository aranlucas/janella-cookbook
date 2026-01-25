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
  ImageIcon,
  MapPin,
  MapPinOff,
  Sparkles,
  UtensilsCrossed,
} from "lucide-react";
import { useCallback, useState, useEffect, useRef } from "react";
import { toast } from "sonner";

const cookingSuggestions = [
  "What can I make with chicken and rice?",
  "Quick dinner ideas for tonight",
  "Healthy meal prep suggestions",
  "Best pasta recipes for beginners",
  "Vegetarian dinner options",
  "How to meal plan for the week?",
];

interface LocationData {
  latitude: number;
  longitude: number;
  accuracy: number;
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

export function ChatInterface() {
  const [text, setText] = useState<string>("");
  const [location, setLocation] = useState<LocationData | null>(null);
  const [locationEnabled, setLocationEnabled] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
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

  const { messages, sendMessage, status, setMessages } = useChat({
    onError: (error) => {
      console.log("onError called:", error.message);
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

  const isLoading = status === "streaming" || status === "submitted";

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
    // Trigger the file input for camera capture
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.capture = "environment";
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        // This would integrate with the attachment system
        toast.info("Photo captured! Use the attachment button to upload.");
      }
    };
    input.click();
  }, []);

  return (
    <div className="flex h-[calc(100dvh-32px)] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-xl">
      {/* Mobile-optimized header */}
      {isMobile ? (
        <MobileChatHeader
          locationEnabled={locationEnabled}
          onClearChat={handleClearChat}
        />
      ) : (
        /* Desktop header */
        <div className="flex shrink-0 items-center gap-4 border-b border-stone-200 bg-gradient-to-r from-stone-50 to-orange-50 px-6 py-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-orange-500 to-orange-600 text-white shadow-md">
            <UtensilsCrossed className="h-6 w-6" />
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-bold tracking-tight text-stone-800">
              AI Cooking Assistant
            </h2>
            <p className="text-sm text-stone-500">
              Powered by Janella Cookbook
            </p>
          </div>
          {locationEnabled && (
            <div className="flex items-center gap-1.5 rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-700">
              <MapPin className="h-3 w-3" />
              <span>Location on</span>
            </div>
          )}
        </div>
      )}

      {/* Messages area */}
      <Conversation className="flex-1 bg-gradient-to-b from-stone-50/50 to-white">
        <ConversationContent className="px-4 py-6 md:px-6">
          {messages.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-5">
              <div className="relative">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-orange-100 to-orange-200 shadow-inner">
                  <ChefHat className="h-8 w-8 text-orange-600" />
                </div>
                <div className="absolute -top-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-white shadow-md">
                  <Sparkles className="h-3 w-3 text-orange-500" />
                </div>
              </div>
              <div className="text-center">
                <h3 className="mb-2 text-xl font-bold text-stone-800">
                  Welcome to your AI Cooking Assistant
                </h3>
                <p className="max-w-md text-sm leading-relaxed text-stone-500">
                  Ask me anything about recipes, meal planning, cooking
                  techniques, or ingredient substitutions.
                </p>
              </div>
              <div className="flex items-center gap-2 rounded-full bg-orange-50 px-3 py-1.5 text-xs">
                <Sparkles className="h-3 w-3 text-orange-500" />
                <span className="font-medium text-stone-600">
                  Try a suggestion below to get started
                </span>
              </div>
              <div className="mt-2 flex flex-wrap justify-center gap-2 text-xs text-stone-400">
                <span className="flex items-center gap-1">
                  <ImageIcon className="h-3 w-3" /> Upload recipe photos
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" /> Enable location for local
                  suggestions
                </span>
              </div>
            </div>
          ) : (
            <>
              {messages.map(({ role, parts }, index) => {
                // Extract text content for context menu
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
                            ? "bg-gradient-to-r from-orange-500 to-orange-600 text-white"
                            : ""
                        }
                      >
                        {parts.map((part, i) => {
                          switch (part.type) {
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
                                  className="max-h-48 rounded-lg object-cover"
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
                  <MessageContent>
                    <div className="flex items-center gap-3 py-2">
                      <Loader />
                      <span className="text-sm text-stone-500">
                        Thinking...
                      </span>
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
      <div className="shrink-0 border-t border-stone-200 bg-gradient-to-r from-stone-50 to-orange-50">
        <div className="grid gap-4 p-4">
          {/* Suggestions */}
          <Suggestions className="pb-1">
            {cookingSuggestions.map((suggestion) => (
              <Suggestion
                key={suggestion}
                onClick={() => handleSuggestionClick(suggestion)}
                suggestion={suggestion}
                className="border-stone-300 bg-white text-stone-700 shadow-sm transition-all hover:border-orange-300 hover:bg-orange-50 hover:text-orange-700 hover:shadow"
              />
            ))}
          </Suggestions>

          {/* Input */}
          <PromptInput
            globalDrop
            multiple
            accept="image/*"
            onSubmit={handleSubmit}
            className="overflow-hidden rounded-xl border border-stone-300 bg-white shadow-sm transition-all focus-within:border-orange-400 focus-within:shadow-md focus-within:ring-2 focus-within:ring-orange-100"
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
                    : "Ask me anything about cooking or meal planning..."
                }
                className="text-stone-800 placeholder:text-stone-400"
              />
            </PromptInputBody>
            <PromptInputFooter>
              <PromptInputTools>
                <PromptInputActionMenu>
                  <PromptInputActionMenuTrigger className="text-stone-500 hover:bg-stone-100 hover:text-stone-700" />
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

                {/* Voice input button - great for mobile */}
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
                      ? "bg-green-600 text-white hover:bg-green-700"
                      : "text-stone-500 hover:bg-stone-100 hover:text-stone-700"
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
                className="bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-sm transition-all hover:from-orange-600 hover:to-orange-700 hover:shadow disabled:from-stone-300 disabled:to-stone-300 disabled:shadow-none"
              />
            </PromptInputFooter>
          </PromptInput>
        </div>
      </div>

    </div>
  );
}
