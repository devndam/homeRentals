import { env } from '../config/env';

/**
 * Converts a relative file path (e.g. /uploads/file.jpg)
 * to a full URL (e.g. http://localhost:3000/uploads/file.jpg).
 */
export function toFullUrl(path: string | undefined | null): string | undefined {
  if (!path) return undefined;
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  return `${env.appUrl}${path}`;
}
