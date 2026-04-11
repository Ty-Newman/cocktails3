import { DEFAULT_BAR_SLUG } from '../constants/bars';

/** Path under a bar slug, e.g. barPath('acme', 'cocktails') => '/acme/cocktails' */
export function barPath(slug: string, ...parts: string[]): string {
  const tail = parts.filter(Boolean).join('/');
  return tail ? `/${slug}/${tail}` : `/${slug}`;
}

export function defaultBarHome(): string {
  return `/${DEFAULT_BAR_SLUG}`;
}
