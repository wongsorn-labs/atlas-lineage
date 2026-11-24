import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from './ui/button';
import { computeCropRect, cropToDataUrl, PHOTO_MAX_ZOOM, PHOTO_SIZE } from '@/lib/photo';

const VIEWPORT = 240; // on-screen crop square, CSS px

interface PhotoCropperProps {
  src: string;
  onConfirm: (dataUrl: string) => void;
  onCancel: () => void;
}

/** Inline square crop with zoom and drag. Output is a PHOTO_SIZE JPEG data URL. */
export function PhotoCropper({ src, onConfirm, onCancel }: PhotoCropperProps) {
  const { t } = useTranslation();
  const loadedImg = useRef<HTMLImageElement | null>(null);
  const [dims, setDims] = useState<{ w: number; h: number } | null>(null);
  const [zoom, setZoom] = useState(1);
  const [centre, setCentre] = useState<{ x: number; y: number } | null>(null);
  const drag = useRef<{ startX: number; startY: number; cx: number; cy: number } | null>(null);

  const initFromImage = (el: HTMLImageElement) => {
    if (loadedImg.current === el) return;
    loadedImg.current = el;
    const w = el.naturalWidth;
    const h = el.naturalHeight;
    setDims({ w, h });
    setCentre({ x: w / 2, y: h / 2 });
  };

  if (!dims || !centre) {
    return (
      <img
        src={src}
        alt=""
        className="hidden"
        ref={(el) => {
          // The load event can fire before React attaches onLoad (cached or fast data URLs),
          // so also check an image that is already complete when it mounts.
          if (el && el.complete && el.naturalWidth > 0) initFromImage(el);
        }}
        onLoad={(e) => initFromImage(e.currentTarget)}
      />
    );
  }

  const rect = computeCropRect(dims.w, dims.h, zoom, centre.x, centre.y);
  const scale = VIEWPORT / rect.size; // screen px per source px
  const clampedCentre = { x: rect.x + rect.size / 2, y: rect.y + rect.size / 2 };

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { startX: e.clientX, startY: e.clientY, cx: clampedCentre.x, cy: clampedCentre.y };
  };
  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d) return;
    setCentre({
      x: d.cx - (e.clientX - d.startX) / scale,
      y: d.cy - (e.clientY - d.startY) / scale,
    });
  };
  const onPointerUp = () => {
    drag.current = null;
  };

  const confirm = () => {
    if (!loadedImg.current) return;
    onConfirm(cropToDataUrl(loadedImg.current, rect));
  };

  return (
    <div className="space-y-2" data-testid="photo-cropper">
      <div
        className="relative mx-auto cursor-move touch-none overflow-hidden rounded-xl bg-(--muted)"
        style={{ width: VIEWPORT, height: VIEWPORT }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <img
          src={src}
          alt=""
          draggable={false}
          className="pointer-events-none absolute max-w-none select-none"
          style={{
            width: dims.w * scale,
            height: dims.h * scale,
            left: -rect.x * scale,
            top: -rect.y * scale,
          }}
        />
      </div>
      <label className="flex items-center gap-2 text-xs text-(--text-secondary)">
        {t('photo.zoom', 'ซูม')}
        <input
          type="range"
          min={1}
          max={PHOTO_MAX_ZOOM}
          step={0.05}
          value={zoom}
          data-testid="photo-zoom"
          onChange={(e) => setZoom(Number(e.target.value))}
          className="flex-1"
        />
      </label>
      <p className="text-xs text-(--text-muted)">
        {t('photo.hint', 'ลากเพื่อจัดตำแหน่ง ระบบจะย่อเป็น {{size}}px', { size: PHOTO_SIZE })}
      </p>
      <div className="flex gap-2">
        <Button type="button" onClick={confirm} data-testid="photo-confirm" className="flex-1">
          {t('photo.use', 'ใช้รูปนี้')}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          {t('photo.cancel', 'ยกเลิก')}
        </Button>
      </div>
    </div>
  );
}
