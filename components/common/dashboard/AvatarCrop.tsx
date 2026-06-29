'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X, ZoomIn, ZoomOut } from 'lucide-react';

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
  const [offset, setOffset] = useState({ x: 0, y: 0 });
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

  const drawCrop = useCallback(() => {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img) return;

    const size = 250;
    canvas.width = OUTPUT_SIZE;
    canvas.height = OUTPUT_SIZE;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, OUTPUT_SIZE, OUTPUT_SIZE);

    const imgAspect = img.naturalWidth / img.naturalHeight;
    let drawW: number, drawH: number;
    if (imgAspect > 1) {
      drawH = size * zoom;
      drawW = drawH * imgAspect;
    } else {
      drawW = size * zoom;
      drawH = drawW / imgAspect;
    }

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
            <Dialog.Title className="text-lg font-semibold">
              Crop Avatar
            </Dialog.Title>
            <Dialog.Close asChild>
              <button className="text-gray-400 hover:text-white transition cursor-pointer">
                <X size={20} />
              </button>
            </Dialog.Close>
          </div>

          <div
            ref={containerRef}
            className="relative w-64 h-64 mx-auto rounded-full overflow-hidden border-2 border-gray-600 mb-4 bg-black"
            style={{ touchAction: 'none' }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
          >
            <canvas
              ref={canvasRef}
              width={OUTPUT_SIZE}
              height={OUTPUT_SIZE}
              className="w-full h-full"
            />
          </div>

          <div className="flex items-center justify-center gap-4 mb-4">
            <button
              onClick={handleZoomOut}
              disabled={zoom <= MIN_ZOOM}
              className="p-2 rounded-full bg-[#2a2a2a] hover:bg-[#3a3a3a] transition disabled:opacity-40 cursor-pointer"
            >
              <ZoomOut size={18} />
            </button>
            <span className="text-sm text-gray-400 min-w-[3rem] text-center">
              {Math.round(zoom * 100)}%
            </span>
            <button
              onClick={handleZoomIn}
              disabled={zoom >= MAX_ZOOM}
              className="p-2 rounded-full bg-[#2a2a2a] hover:bg-[#3a3a3a] transition disabled:opacity-40 cursor-pointer"
            >
              <ZoomIn size={18} />
            </button>
          </div>

          <p className="text-xs text-gray-500 text-center mb-4">
            Drag to reposition, use buttons to zoom
          </p>

          <div className="flex gap-3">
            <Dialog.Close asChild>
              <button className="flex-1 px-4 py-2 rounded-md border border-gray-600 text-gray-300 hover:bg-[#2a2a2a] transition cursor-pointer">
                Cancel
              </button>
            </Dialog.Close>
            <button
              onClick={handleSave}
              className="flex-1 px-4 py-2 rounded-md bg-[#D2045B] text-white font-semibold hover:bg-[#b80348] transition cursor-pointer"
            >
              Apply
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
