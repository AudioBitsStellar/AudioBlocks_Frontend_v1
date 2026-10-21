'use client';

import { useState, useRef, useCallback, useEffect, useId } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  RotateCcw,
  X,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';

interface AvatarCropProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  imageSrc: string;
  onCropComplete: (croppedDataUrl: string) => void;
}

const MIN_ZOOM = 1;
const MAX_ZOOM = 3;
const ZOOM_STEP = 0.25;
const OUTPUT_SIZE = 400;
/** Side of the square crop frame, in canvas pixels. */
const FRAME_SIZE = 250;
/** Pixels moved per arrow-key press, and with Shift held. */
const PAN_STEP = 1;
const PAN_STEP_LARGE = 10;
/** Pixels moved per click of an on-screen pan button. */
const PAN_BUTTON_STEP = 10;

type Offset = { x: number; y: number };

/**
 * Keeps the image covering the crop frame: the offset may not exceed half of
 * the overflow on either axis. Used for keyboard and button panning so the
 * avatar can never be moved onto empty canvas.
 */
function clampOffset(offset: Offset, drawW: number, drawH: number): Offset {
  const maxX = Math.max(0, (drawW - FRAME_SIZE) / 2);
  const maxY = Math.max(0, (drawH - FRAME_SIZE) / 2);
  return {
    x: Math.min(maxX, Math.max(-maxX, offset.x)),
    y: Math.min(maxY, Math.max(-maxY, offset.y)),
  };
}

/** Size the image is drawn at for a given zoom (the image is "cover"-fitted to the frame). */
function drawSize(img: HTMLImageElement | null, zoom: number): { drawW: number; drawH: number } {
  const imgAspect =
    img && img.naturalWidth && img.naturalHeight ? img.naturalWidth / img.naturalHeight : 1;
  if (imgAspect > 1) {
    const drawH = FRAME_SIZE * zoom;
    return { drawW: drawH * imgAspect, drawH };
  }
  const drawW = FRAME_SIZE * zoom;
  return { drawW, drawH: drawW / imgAspect };
}

export default function AvatarCrop({
  open,
  onOpenChange,
  imageSrc,
  onCropComplete,
}: AvatarCropProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState<Offset>({ x: 0, y: 0 });
  const instructionsId = useId();
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const offsetStart = useRef({ x: 0, y: 0 });

  useEffect(() => {
    if (!open) {
      setZoom(1);
      setOffset({ x: 0, y: 0 });
    }
  }, [open]);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      setIsDragging(true);
      dragStart.current = { x: e.clientX, y: e.clientY };
      offsetStart.current = { ...offset };
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    },
    [offset]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isDragging) return;
      const dx = e.clientX - dragStart.current.x;
      const dy = e.clientY - dragStart.current.y;
      setOffset({
        x: offsetStart.current.x + dx,
        y: offsetStart.current.y + dy,
      });
    },
    [isDragging]
  );

  const handlePointerUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleZoomIn = () => setZoom((z) => Math.min(z + ZOOM_STEP, MAX_ZOOM));
  const handleZoomOut = () => setZoom((z) => Math.max(z - ZOOM_STEP, MIN_ZOOM));

  /** Moves the image by (dx, dy) pixels, clamped to the frame. Non-drag alternative to pointer panning. */
  const panBy = useCallback(
    (dx: number, dy: number) => {
      const { drawW, drawH } = drawSize(imgRef.current, zoom);
      setOffset((o) => clampOffset({ x: o.x + dx, y: o.y + dy }, drawW, drawH));
    },
    [zoom]
  );

  const handleReset = () => {
    setZoom(1);
    setOffset({ x: 0, y: 0 });
  };

  const handleCropKeyDown = (e: React.KeyboardEvent) => {
    const step = e.shiftKey ? PAN_STEP_LARGE : PAN_STEP;
    switch (e.key) {
      case 'ArrowLeft':
        panBy(-step, 0);
        break;
      case 'ArrowRight':
        panBy(step, 0);
        break;
      case 'ArrowUp':
        panBy(0, -step);
        break;
      case 'ArrowDown':
        panBy(0, step);
        break;
      case '+':
      case '=':
        handleZoomIn();
        break;
      case '-':
      case '_':
        handleZoomOut();
        break;
      case '0':
        handleReset();
        break;
      default:
        return;
    }
    e.preventDefault();
  };

  const drawCrop = useCallback(() => {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img) return;

    const size = FRAME_SIZE;
    canvas.width = OUTPUT_SIZE;
    canvas.height = OUTPUT_SIZE;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, OUTPUT_SIZE, OUTPUT_SIZE);

    const { drawW, drawH } = drawSize(img, zoom);

    const cx = size / 2 + offset.x;
    const cy = size / 2 + offset.y;

    ctx.drawImage(img, cx - drawW / 2, cy - drawH / 2, drawW, drawH);
  }, [zoom, offset]);

  useEffect(() => {
    if (!imageSrc || !open) return;
    const img = new window.Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      imgRef.current = img;
      drawCrop();
    };
    img.src = imageSrc;
  }, [imageSrc, open, drawCrop]);

  useEffect(() => {
    drawCrop();
  }, [drawCrop]);

  const handleSave = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    onCropComplete(canvas.toDataURL('image/png'));
    onOpenChange(false);
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/60 z-50" />
        <Dialog.Content className="fixed z-50 top-1/2 left-1/2 w-[90%] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-lg bg-[#1E1E1E] p-6 shadow-xl text-white focus:outline-none">
          <div className="flex justify-between items-center mb-4">
            <Dialog.Title className="text-lg font-semibold">Crop Avatar</Dialog.Title>
            <Dialog.Close asChild>
              <button className="text-gray-400 hover:text-white transition cursor-pointer">
                <X size={20} />
              </button>
            </Dialog.Close>
          </div>

          <div
            ref={containerRef}
            aria-describedby={instructionsId}
            aria-label="Avatar crop area"
            className="relative w-64 h-64 mx-auto rounded-full overflow-hidden border-2 border-gray-600 mb-4 bg-black focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D2045B]"
            role="group"
            style={{ touchAction: 'none' }}
            tabIndex={0}
            onKeyDown={handleCropKeyDown}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
          >
            <canvas
              ref={canvasRef}
              className="w-full h-full"
              height={OUTPUT_SIZE}
              width={OUTPUT_SIZE}
            />
          </div>

          <div
            aria-label="Move image"
            className="flex items-center justify-center gap-2 mb-4"
            role="group"
          >
            <button
              aria-label="Move image left"
              className="p-2 rounded-full bg-[#2a2a2a] hover:bg-[#3a3a3a] transition cursor-pointer"
              type="button"
              onClick={() => panBy(-PAN_BUTTON_STEP, 0)}
            >
              <ArrowLeft size={18} />
            </button>
            <button
              aria-label="Move image up"
              className="p-2 rounded-full bg-[#2a2a2a] hover:bg-[#3a3a3a] transition cursor-pointer"
              type="button"
              onClick={() => panBy(0, -PAN_BUTTON_STEP)}
            >
              <ArrowUp size={18} />
            </button>
            <button
              aria-label="Move image down"
              className="p-2 rounded-full bg-[#2a2a2a] hover:bg-[#3a3a3a] transition cursor-pointer"
              type="button"
              onClick={() => panBy(0, PAN_BUTTON_STEP)}
            >
              <ArrowDown size={18} />
            </button>
            <button
              aria-label="Move image right"
              className="p-2 rounded-full bg-[#2a2a2a] hover:bg-[#3a3a3a] transition cursor-pointer"
              type="button"
              onClick={() => panBy(PAN_BUTTON_STEP, 0)}
            >
              <ArrowRight size={18} />
            </button>
            <button
              aria-label="Reset position and zoom"
              className="p-2 rounded-full bg-[#2a2a2a] hover:bg-[#3a3a3a] transition cursor-pointer"
              type="button"
              onClick={handleReset}
            >
              <RotateCcw size={18} />
            </button>
          </div>

          <div className="flex items-center justify-center gap-4 mb-4">
            <button
              aria-label="Zoom out"
              className="p-2 rounded-full bg-[#2a2a2a] hover:bg-[#3a3a3a] transition disabled:opacity-40 cursor-pointer"
              disabled={zoom <= MIN_ZOOM}
              onClick={handleZoomOut}
            >
              <ZoomOut size={18} />
            </button>
            <span className="text-sm text-gray-400 min-w-[3rem] text-center">
              {Math.round(zoom * 100)}%
            </span>
            <button
              aria-label="Zoom in"
              className="p-2 rounded-full bg-[#2a2a2a] hover:bg-[#3a3a3a] transition disabled:opacity-40 cursor-pointer"
              disabled={zoom >= MAX_ZOOM}
              onClick={handleZoomIn}
            >
              <ZoomIn size={18} />
            </button>
          </div>

          <p className="text-xs text-gray-500 text-center mb-4" id={instructionsId}>
            Drag to reposition, or focus the image and use the arrow keys to move it (hold Shift for
            larger steps), plus and minus to zoom, and 0 to reset. The buttons do the same.
          </p>

          <div className="flex gap-3">
            <Dialog.Close asChild>
              <button className="flex-1 px-4 py-2 rounded-md border border-gray-600 text-gray-300 hover:bg-[#2a2a2a] transition cursor-pointer">
                Cancel
              </button>
            </Dialog.Close>
            <button
              className="flex-1 px-4 py-2 rounded-md bg-[#D2045B] text-white font-semibold hover:bg-[#b80348] transition cursor-pointer"
              onClick={handleSave}
            >
              Apply
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
