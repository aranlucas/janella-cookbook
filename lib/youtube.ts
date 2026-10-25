import { YoutubeTranscript } from "youtube-transcript";
import { Innertube } from "youtubei.js/web";
import { ok, err, ResultAsync, type Result } from "neverthrow";
import { z } from "zod";
import { RecipeParseError, ExternalApiError, thrownValueSchema, type AppError } from "./errors";
import { cleanText } from "./imports/text";

export type TranscriptResult = {
  readonly text: string;
  readonly title?: string;
  readonly source?: "transcript" | "description";
  /** Video description, kept alongside a transcript because it often lists exact amounts. */
  readonly description?: string;
};

const transcriptDataSchema = z.object({
  content: z
    .object({
      body: z
        .object({
          initial_segments: z
            .array(
              z.object({
                snippet: z
                  .object({
                    runs: z.array(z.object({ text: z.string().optional() })).optional(),
                  })
                  .optional(),
              }),
            )
            .optional(),
        })
        .optional(),
    })
    .optional(),
});

export interface YouTubeVideoMetadata {
  thumbnailUrl: string;
  videoUrl: string;
}

/**
 * Extract YouTube video ID from various URL formats.
 * Returns Result instead of throwing.
 */
export function extractYouTubeVideoId(url: string): Result<string, RecipeParseError> {
  try {
    const parsedUrl = new URL(url);

    let videoId: string | null | undefined;

    if (["http:", "https:"].includes(parsedUrl.protocol)) {
      if (parsedUrl.hostname === "youtu.be") {
        videoId = parsedUrl.pathname.slice(1);
      } else if (["www.youtube.com", "youtube.com", "m.youtube.com"].includes(parsedUrl.hostname)) {
        videoId =
          parsedUrl.pathname === "/watch"
            ? parsedUrl.searchParams.get("v")
            : parsedUrl.pathname.match(/^\/(?:shorts|embed|v)\/([\w-]{11})\/?$/)?.[1];
      }
    }

    if (videoId && /^[\w-]{11}$/.test(videoId)) {
      return ok(videoId);
    }

    return err(new RecipeParseError("Could not extract video ID from YouTube URL", url));
  } catch {
    return err(new RecipeParseError("Invalid YouTube URL format", url));
  }
}

/**
 * Get video transcript from YouTube using youtubei.js (primary) with fallback to youtube-transcript.
 * If transcript is unavailable, falls back to video description.
 * Returns ResultAsync instead of throwing.
 */
export function getYouTubeTranscript(videoId: string): ResultAsync<TranscriptResult, AppError> {
  return ResultAsync.fromPromise(getYouTubeTranscriptImpl(videoId), (error) =>
    error instanceof ExternalApiError || error instanceof RecipeParseError
      ? error
      : (() => {
          const thrownValue = thrownValueSchema.parse(error);

          return new ExternalApiError(
            "YouTube",
            thrownValue instanceof Error ? thrownValue.message : "Unknown transcript error",
            thrownValue,
          );
        })(),
  );
}

/**
 * Internal implementation that uses throw/catch for complex fallback logic.
 */
async function getYouTubeTranscriptImpl(videoId: string): Promise<TranscriptResult> {
  let videoDescription: string | undefined;
  let videoTitle: string | undefined;

  // Try youtubei.js first (more robust, less likely to be blocked)
  try {
    const youtube = await Innertube.create({
      lang: "en",
      location: "US",
      retrieve_player: false,
    });

    const info = await youtube.getInfo(videoId);

    // Save title and description for fallback use
    videoTitle = info.basic_info.title ?? undefined;
    videoDescription = info.basic_info.short_description ?? undefined;

    const transcriptData = await info.getTranscript();

    if (!transcriptData) {
      throw new ExternalApiError("YouTube", "No transcript available");
    }

    const parsedTranscriptData = transcriptDataSchema.safeParse(transcriptData);

    const segments = parsedTranscriptData.success
      ? parsedTranscriptData.data.content?.body?.initial_segments
      : undefined;

    if (!segments || !Array.isArray(segments) || segments.length === 0) {
      throw new ExternalApiError("YouTube", "No transcript segments found");
    }

    // Combine all transcript segments into a single text
    const text = segments
      .map((segment) => segment?.snippet?.runs?.map((run) => run?.text ?? "").join("") ?? "")
      .filter((segmentText) => segmentText.trim().length > 0)
      .join(" ");

    if (!text || text.trim().length === 0) {
      throw new ExternalApiError("YouTube", "Transcript is empty");
    }

    return {
      text,
      title: videoTitle,
      source: "transcript",
      description: videoDescription,
    };
  } catch (primaryError) {
    // Log the primary error for debugging
    console.warn(
      "youtubei.js transcript fetch failed, trying fallback:",
      primaryError instanceof Error ? primaryError.message : String(primaryError),
    );

    // Fallback to youtube-transcript library
    try {
      const transcript = await YoutubeTranscript.fetchTranscript(videoId);

      if (!transcript || transcript.length === 0) {
        throw new ExternalApiError("YouTube", "No transcript available");
      }

      // Combine all transcript segments into a single text; this library returns HTML-encoded text.
      const text = cleanText(transcript.map((segment) => segment.text).join(" "));

      return { text, title: videoTitle, source: "transcript", description: videoDescription };
    } catch (fallbackError) {
      // Both transcript methods failed - try using video description as last resort
      if (videoDescription && videoDescription.trim().length >= 50) {
        console.warn("Both transcript methods failed, using video description as fallback");

        return {
          text: videoDescription.trim(),
          title: videoTitle,
          source: "description",
        };
      }

      // Both methods failed and no usable description, throw a detailed error
      const primaryMsg =
        primaryError instanceof Error ? primaryError.message : String(primaryError);

      const fallbackMsg =
        fallbackError instanceof Error ? fallbackError.message : String(fallbackError);

      // Handle specific error cases
      if (
        primaryMsg.includes("Transcript is disabled") ||
        fallbackMsg.includes("Transcript is disabled")
      ) {
        throw new ExternalApiError(
          "YouTube",
          "Transcript is disabled for this video and the description is too short. Please try a different video or use the manual import option.",
        );
      }

      if (
        primaryMsg.includes("not found") ||
        primaryMsg.includes("404") ||
        fallbackMsg.includes("not found") ||
        fallbackMsg.includes("404")
      ) {
        throw new ExternalApiError(
          "YouTube",
          "Video not found or is private. Please check the URL and try again.",
        );
      }

      // Generic error
      throw new ExternalApiError(
        "YouTube",
        `Failed to fetch transcript and video description is too short. The video may not have captions enabled, or YouTube may be blocking the request. Primary error: ${primaryMsg}`,
        thrownValueSchema.parse(fallbackError),
      );
    }
  }
}

/**
 * Get YouTube video metadata
 * Returns video title and thumbnail URL
 */
export function getYouTubeVideoMetadata(videoId: string): YouTubeVideoMetadata {
  return {
    thumbnailUrl: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
    videoUrl: `https://www.youtube.com/watch?v=${videoId}`,
  };
}
