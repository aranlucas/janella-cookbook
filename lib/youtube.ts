import { YoutubeTranscript } from "youtube-transcript";
import { Innertube } from "youtubei.js/web";
import { RecipeParseError, ExternalApiError } from "./errors";

/**
 * Extract YouTube video ID from various URL formats
 * Supports:
 * - https://www.youtube.com/watch?v=VIDEO_ID
 * - https://youtu.be/VIDEO_ID
 * - https://www.youtube.com/embed/VIDEO_ID
 * - https://www.youtube.com/shorts/VIDEO_ID
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

      // Handle /shorts/VIDEO_ID
      const shortsMatch = parsedUrl.pathname.match(/\/shorts\/([^/?]+)/);
      if (shortsMatch) {
        return shortsMatch[1];
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
 * Get video transcript from YouTube using youtubei.js (primary) with fallback to youtube-transcript
 * youtubei.js is more robust and less likely to be blocked by YouTube
 */
export async function getYouTubeTranscript(
  videoId: string,
): Promise<{ text: string; title?: string }> {
  // Try youtubei.js first (more robust, less likely to be blocked)
  try {
    const youtube = await Innertube.create({
      lang: "en",
      location: "US",
      retrieve_player: false,
    });

    const info = await youtube.getInfo(videoId);
    const transcriptData = await info.getTranscript();

    if (!transcriptData) {
      throw new Error("No transcript available");
    }

    // The transcript data structure from youtubei.js
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const segments = (transcriptData as any).content?.body?.initial_segments;
    if (!segments || !Array.isArray(segments) || segments.length === 0) {
      throw new Error("No transcript segments found");
    }

    // Combine all transcript segments into a single text
    const text = segments
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((segment: any) => {
        const runs = segment?.snippet?.runs || [];
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return runs.map((run: any) => run?.text || "").join("");
      })
      .filter((segmentText: string) => segmentText.trim().length > 0)
      .join(" ");

    if (!text || text.trim().length === 0) {
      throw new Error("Transcript is empty");
    }

    return {
      text,
      title: info.basic_info.title || undefined,
    };
  } catch (primaryError) {
    // Log the primary error for debugging
    console.warn(
      "youtubei.js transcript fetch failed, trying fallback:",
      primaryError instanceof Error
        ? primaryError.message
        : String(primaryError),
    );

    // Fallback to youtube-transcript library
    try {
      const transcript = await YoutubeTranscript.fetchTranscript(videoId);

      if (!transcript || transcript.length === 0) {
        throw new Error("No transcript available");
      }

      // Combine all transcript segments into a single text
      const text = transcript.map((segment) => segment.text).join(" ");

      return { text };
    } catch (fallbackError) {
      // Both methods failed, throw a detailed error
      const primaryMsg =
        primaryError instanceof Error
          ? primaryError.message
          : String(primaryError);
      const fallbackMsg =
        fallbackError instanceof Error
          ? fallbackError.message
          : String(fallbackError);

      // Handle specific error cases
      if (
        primaryMsg.includes("Transcript is disabled") ||
        fallbackMsg.includes("Transcript is disabled")
      ) {
        throw new ExternalApiError(
          "YouTube",
          "Transcript is disabled for this video. Please try a different video or use the manual import option.",
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
        `Failed to fetch transcript. The video may not have captions enabled, or YouTube may be blocking the request. Primary error: ${primaryMsg}`,
        fallbackError,
      );
    }
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
