// The Tinysoy chart hues (soy yellow, edamame, pod brown, leaf green, kuromame),
// so avatars stay legible in both themes without needing per-avatar
// light/dark overrides. Shared between the DOM Avatar component and the
// SVG-rendered family chart, which can't use the CSS-driven one directly.
const PALETTE = [1, 2, 3, 4, 5].map((n) => ({
  bg: `color-mix(in oklab, var(--chart-${n}) 18%, transparent)`,
  // Blend toward the text colour so initials stay legible in light and dark.
  fg: `color-mix(in oklab, var(--chart-${n}) 55%, var(--foreground))`,
}));

function hashString(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

export function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function getAvatarColors(name: string): { bg: string; fg: string } {
  return PALETTE[hashString(name) % PALETTE.length];
}
