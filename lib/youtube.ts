import { YoutubeTranscript } from "youtube-transcript";
import { RecipeParseError, ExternalApiError } from "./errors";

/**
 * Extract YouTube video ID from various URL formats
 * Supports:
 * - https://www.youtube.com/watch?v=VIDEO_ID
 * - https://youtu.be/VIDEO_ID
 * - https://www.youtube.com/embed/VIDEO_ID
 * - https://m.youtube.com/watch?v=VIDEO_ID
 */
export function extractYouTubeVideoId(url: string): string {
  try {
    const parsedUrl = new URL(url);

    // Handle youtu.be short URLs
    if (parsedUrl.hostname === "youtu.be") {
      return parsedUrl.pathname.slice(1).split("?")[0];
    }

    // Handle youtube.com URLs
    if (
      parsedUrl.hostname === "www.youtube.com" ||
      parsedUrl.hostname === "youtube.com" ||
      parsedUrl.hostname === "m.youtube.com"
    ) {
      // Handle /watch?v=VIDEO_ID
      const videoId = parsedUrl.searchParams.get("v");
      if (videoId) {
        return videoId;
      }

      // Handle /embed/VIDEO_ID
      const embedMatch = parsedUrl.pathname.match(/\/embed\/([^/?]+)/);
      if (embedMatch) {
        return embedMatch[1];
      }

      // Handle /v/VIDEO_ID
      const vMatch = parsedUrl.pathname.match(/\/v\/([^/?]+)/);
      if (vMatch) {
        return vMatch[1];
      }
    }

    throw new RecipeParseError(
      "Could not extract video ID from YouTube URL",
      url,
    );
  } catch (error) {
    if (error instanceof RecipeParseError) throw error;
    throw new RecipeParseError("Invalid YouTube URL format", url);
  }
}

/**
 * Get video transcript from YouTube
 */
export async function getYouTubeTranscript(
  videoId: string,
): Promise<{ text: string; title?: string }> {
  try {
    const transcript = await YoutubeTranscript.fetchTranscript(videoId);

    if (!transcript || transcript.length === 0) {
      throw new ExternalApiError(
        "YouTube",
        "No transcript available for this video. The video may not have captions enabled.",
      );
    }

    // Combine all transcript segments into a single text
    const text = transcript.map((segment) => segment.text).join(" ");

    return { text };
  } catch (error) {
    if (error instanceof ExternalApiError) throw error;

    // Handle specific YouTube transcript errors
    const errorMessage = error instanceof Error ? error.message : String(error);

    if (errorMessage.includes("Transcript is disabled")) {
      throw new ExternalApiError(
        "YouTube",
        "Transcript is disabled for this video",
      );
    }

    if (errorMessage.includes("not found") || errorMessage.includes("404")) {
      throw new ExternalApiError("YouTube", "Video not found or is private");
    }

    throw new ExternalApiError(
      "YouTube",
      `Failed to fetch transcript: ${errorMessage}`,
      error,
    );
  }
}

/**
 * Get YouTube video metadata
 * Returns video title and thumbnail URL
 */
export function getYouTubeVideoMetadata(videoId: string): {
  thumbnailUrl: string;
  videoUrl: string;
} {
  return {
    thumbnailUrl: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
    videoUrl: `https://www.youtube.com/watch?v=${videoId}`,
  };
}
