const STORAGE_KEY = 'cocktails_bar_invite_token';

/** Store opaque invite token before OAuth (set from /join/:token). */
export function persistBarInviteToken(token: string): void {
  sessionStorage.setItem(STORAGE_KEY, token.trim());
}

export function peekBarInviteToken(): string | null {
  const t = sessionStorage.getItem(STORAGE_KEY);
  return t?.trim() || null;
}

/** Read and remove; call once after successful sign-in. */
export function consumeBarInviteToken(): string | null {
  const t = sessionStorage.getItem(STORAGE_KEY);
  sessionStorage.removeItem(STORAGE_KEY);
  return t?.trim() || null;
}
