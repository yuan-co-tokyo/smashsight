export const MAX_VIDEO_FILE_SIZE = 100 * 1024 * 1024;
export const MAX_VIDEO_NAME_LENGTH = 255;
export const PRESIGNED_POST_SECONDS = 5 * 60;
export const PRESIGNED_GET_SECONDS = 5 * 60;
export const VIDEO_EXTENSIONS = { "video/mp4": "mp4", "video/quicktime": "mov" } as const;
export const ALLOWED_VIDEO_CONTENT_TYPES = ["video/mp4", "video/quicktime"] as const;
