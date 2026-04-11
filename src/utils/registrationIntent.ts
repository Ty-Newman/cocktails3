const STORAGE_KEY = 'cocktails_oauth_registration';

/** Allowed bar URL slug segment (matches server validation). */
export const BAR_SLUG_PATTERN = /^[a-z0-9][a-z0-9-]{0,38}$/;

export function normalizeBarSlugInput(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');
}

export type RegistrationIntent =
  | { type: 'default' }
  | { type: 'join'; barSlug: string }
  | { type: 'owner'; barName: string; barSlug: string };

export function persistRegistrationIntent(intent: RegistrationIntent): void {
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(intent));
}

export function consumeRegistrationIntent(): RegistrationIntent | null {
  const raw = sessionStorage.getItem(STORAGE_KEY);
  sessionStorage.removeItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as RegistrationIntent;
  } catch {
    return null;
  }
}
