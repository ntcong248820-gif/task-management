export function getSafeRedirectPath(value: string | null, fallback = '/workspace'): string {
  if (!value || value.startsWith('//')) return fallback;

  try {
    const url = new URL(value, window.location.origin);
    if (url.origin !== window.location.origin) return fallback;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return fallback;
  }
}
