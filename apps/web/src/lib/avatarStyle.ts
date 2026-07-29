// A handful of hues from the heritage palette + a few complementary ones,
// so avatars stay legible in both themes without needing per-avatar
// light/dark overrides. Shared between the DOM Avatar component and the
// SVG-rendered family chart, which can't use the CSS-driven one directly.
const PALETTE = [
  { bg: 'rgba(200, 155, 60, 0.18)', fg: '#9C7526' },
  { bg: 'rgba(74, 124, 89, 0.18)', fg: '#2F5A3D' },
  { bg: 'rgba(181, 80, 47, 0.18)', fg: '#8C3D22' },
  { bg: 'rgba(93, 173, 226, 0.18)', fg: '#2E6DA4' },
  { bg: 'rgba(155, 89, 182, 0.18)', fg: '#6C3483' },
];

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
