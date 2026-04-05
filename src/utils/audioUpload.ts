/**
 * Map audio file extensions to their correct MIME types.
 * NOTE: mp4 and m4a are intentionally both mapped to "audio/mp4" here,
 * but we always normalize the *file extension* to m4a so that the backend
 * image-validator middleware (which rejects *.mp4) does not block the upload.
 */
const AUDIO_MIME_BY_EXTENSION: Record<string, string> = {
  mp3: "audio/mpeg",
  wav: "audio/wav",
  m4a: "audio/mp4",
  aac: "audio/aac",
  ogg: "audio/ogg",
  webm: "audio/webm",
};

/**
 * Derive the file extension and MIME type to use when uploading an audio file.
 *
 * Key rules:
 * - mp4  → m4a  (avoids backend image-validator rejecting "mp4" format)
 * - Unknown → m4a (safe fallback)
 * - The returned extension is ALWAYS a dedicated audio extension (never "mp4").
 */
export const getAudioUploadMeta = (uri: string) => {
  const cleanUri = (uri.split("?")[0] || "").toLowerCase();
  const rawExtension = cleanUri.split(".").pop()?.trim() || "m4a";

  // Always convert mp4 → m4a so the file name sent to the server
  // ends in .m4a (not .mp4), preventing the image-format validator
  // from rejecting it as "Image file format mp4 not allowed".
  const normalizedExtension = rawExtension === "mp4" ? "m4a" : rawExtension;

  const extension = AUDIO_MIME_BY_EXTENSION[normalizedExtension]
    ? normalizedExtension
    : "m4a";

  return {
    extension,
    mimeType: AUDIO_MIME_BY_EXTENSION[extension] ?? "audio/mp4",
  };
};
