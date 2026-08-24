/** Resolves the avatar image to render for a review, everywhere a review is
 * shown — profile pages, the /reviews hub feed, and the admin moderation
 * queue all call this instead of each re-deriving the same three-way
 * fallback (anonymous → masked icon, named-with-a-choice → that choice,
 * named-with-no-choice → a neutral silhouette, never a colored preset
 * nobody actually picked). */
export function avatarSrc(displayMode: string, avatarUrl: string | null): string {
  if (displayMode === 'anonymous') return '/img/avatars/anonymous.svg';
  return avatarUrl ?? '/img/avatars/default.svg';
}
