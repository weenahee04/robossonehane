export const HAS_API_BASE_URL = Boolean(import.meta.env.VITE_API_URL);

export const DEV_SAFE_FALLBACK_ENABLED = !HAS_API_BASE_URL;

export const USE_LOCAL_DEV_FALLBACK = !HAS_API_BASE_URL;

export const ALLOW_DEV_API_FAILURE_FALLBACK = false;
