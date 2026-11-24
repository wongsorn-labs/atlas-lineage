/** Longest side of a stored person photo, in CSS pixels. Keeps data small and fits the 150px display. */
export const PHOTO_SIZE = 150;
export const PHOTO_MAX_ZOOM = 3;

export interface CropRect {
  /** Top-left corner of the square crop, in source-image pixels. */
  x: number;
  y: number;
  /** Side of the square crop, in source-image pixels. */
  size: number;
}

/**
 * Square crop of the source image at `zoom` (1 = largest square that fits),
 * centred on (centreX, centreY). The centre is clamped so the crop never leaves the image.
 */
export function computeCropRect(
  srcWidth: number,
  srcHeight: number,
  zoom: number,
  centreX: number,
  centreY: number,
): CropRect {
  const size = Math.min(srcWidth, srcHeight) / Math.min(Math.max(zoom, 1), PHOTO_MAX_ZOOM);
  const half = size / 2;
  const cx = Math.min(Math.max(centreX, half), srcWidth - half);
  const cy = Math.min(Math.max(centreY, half), srcHeight - half);
  return { x: cx - half, y: cy - half, size };
}

/** Draws the crop into a PHOTO_SIZE square canvas and returns a JPEG data URL. */
export function cropToDataUrl(
  source: CanvasImageSource,
  rect: CropRect,
  quality = 0.85,
): string {
  const canvas = document.createElement('canvas');
  canvas.width = PHOTO_SIZE;
  canvas.height = PHOTO_SIZE;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas is not available');
  ctx.drawImage(source, rect.x, rect.y, rect.size, rect.size, 0, 0, PHOTO_SIZE, PHOTO_SIZE);
  return canvas.toDataURL('image/jpeg', quality);
}
