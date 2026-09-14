const CONTROL_CHARACTER_PATTERN = /[\u0000-\u001f\u007f]/;
const TRUSTED_REMOTE_IMAGE_HOSTS = new Set(["images.unsplash.com"]);

export function getProductImageUrl(value: string | null) {
  if (!value || CONTROL_CHARACTER_PATTERN.test(value) || value.includes("\\")) return null;

  if (value.startsWith("/")) {
    return value.startsWith("//") ? null : value;
  }

  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || !TRUSTED_REMOTE_IMAGE_HOSTS.has(url.hostname)) return null;
    return url.toString();
  } catch {
    return null;
  }
}
