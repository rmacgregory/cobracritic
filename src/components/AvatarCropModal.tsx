import React, { useCallback, useEffect, useRef, useState } from 'react';
import { RotateCcw, X, ZoomIn, ZoomOut } from 'lucide-react';
import { LIMITS } from '../types';

interface AvatarCropModalProps {
  imageSrc: string;
  onClose: () => void;
  onConfirm: (croppedDataUrl: string) => Promise<void>;
}

const CROP_SIZE = 300;

export function AvatarCropModal({
  imageSrc,
  onClose,
  onConfirm,
}: AvatarCropModalProps) {
  const imgRef = useRef<HTMLImageElement | null>(null);

  const [naturalSize, setNaturalSize] = useState<{ w: number; h: number } | null>(
    null,
  );
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const dragStartRef = useRef<{ x: number; y: number; ox: number; oy: number } | null>(
    null,
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const baseScale = naturalSize
    ? Math.max(CROP_SIZE / naturalSize.w, CROP_SIZE / naturalSize.h)
    : 1;

  const effectiveScale = baseScale * zoom;

  const clampOffset = useCallback(
    (x: number, y: number, nextZoom: number) => {
      if (!naturalSize) return { x: 0, y: 0 };
      const scale = Math.max(CROP_SIZE / naturalSize.w, CROP_SIZE / naturalSize.h) * nextZoom;
      const renderedW = naturalSize.w * scale;
      const renderedH = naturalSize.h * scale;
      const maxOffsetX = Math.max(0, (renderedW - CROP_SIZE) / 2);
      const maxOffsetY = Math.max(0, (renderedH - CROP_SIZE) / 2);
      return {
        x: Math.min(maxOffsetX, Math.max(-maxOffsetX, x)),
        y: Math.min(maxOffsetY, Math.max(-maxOffsetY, y)),
      };
    },
    [naturalSize],
  );

  useEffect(() => {
    setOffset((prev) => clampOffset(prev.x, prev.y, zoom));
  }, [zoom, clampOffset]);

  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const target = e.currentTarget;
    setNaturalSize({ w: target.naturalWidth, h: target.naturalHeight });
    setZoom(1);
    setOffset({ x: 0, y: 0 });
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    setDragging(true);
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      ox: offset.x,
      oy: offset.y,
    };
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragging || !dragStartRef.current) return;
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;
    setOffset(
      clampOffset(dragStartRef.current.ox + dx, dragStartRef.current.oy + dy, zoom),
    );
  };

  const handlePointerUp = () => {
    setDragging(false);
    dragStartRef.current = null;
  };

  const handleReset = () => {
    setZoom(1);
    setOffset({ x: 0, y: 0 });
  };

  const handleApplyCrop = async () => {
    if (!imgRef.current || !naturalSize) return;
    setError(null);
    setSaving(true);
    try {
      const canvas = document.createElement('canvas');
      canvas.width = CROP_SIZE;
      canvas.height = CROP_SIZE;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        throw new Error('Não foi possível processar a imagem neste navegador.');
      }

      ctx.fillStyle = '#0C0D0C';
      ctx.fillRect(0, 0, CROP_SIZE, CROP_SIZE);

      const renderedW = naturalSize.w * effectiveScale;
      const renderedH = naturalSize.h * effectiveScale;
      const drawX = (CROP_SIZE - renderedW) / 2 + offset.x;
      const drawY = (CROP_SIZE - renderedH) / 2 + offset.y;

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(imgRef.current, drawX, drawY, renderedW, renderedH);

      // Export at 300x300 with automatic quality step-down to guarantee Firestore payload limit
      const qualities = [0.86, 0.78, 0.68, 0.56, 0.45];
      let dataUrl = '';
      for (const q of qualities) {
        const candidate = canvas.toDataURL('image/jpeg', q);
        if (candidate.length <= LIMITS.AVATAR_DATA_URL_MAX) {
          dataUrl = candidate;
          break;
        }
      }

      if (!dataUrl) {
        throw new Error('A imagem ficou muito grande. Tente outra foto.');
      }

      await onConfirm(dataUrl);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar avatar.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-[2px] flex items-center justify-center p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="avatar-crop-title"
    >
      <div className="bg-[#141614] border border-[#2A2F2A] w-full max-w-md text-[#F2F2EE] my-auto">
        <div className="border-b border-[#232723] px-5 py-4 flex items-center justify-between gap-4">
          <div>
            <h2
              id="avatar-crop-title"
              className="font-serif text-xl font-semibold text-[#F2F2EE]"
            >
              Recortar foto de avatar
            </h2>
            <p className="text-xs text-[#8C9288] mt-0.5 font-mono tabular-nums">
              Moldura circular · 300 × 300 px
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar recorte"
            className="p-1.5 text-[#8C9288] hover:text-[#F2F2EE] cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5 flex flex-col items-center">
          <p className="text-xs text-[#A8ACA5] text-center">
            Arraste a imagem para enquadrar seu rosto dentro do círculo e ajuste o zoom
            abaixo.
          </p>

          {/* Interactive 300x300 Circular Crop Stage */}
          <div
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            style={{ width: CROP_SIZE, height: CROP_SIZE }}
            className={`relative overflow-hidden bg-[#0C0D0C] border border-[#2F352F] select-none touch-none ${
              dragging ? 'cursor-grabbing' : 'cursor-grab'
            }`}
          >
            <img
              ref={imgRef}
              src={imageSrc}
              alt="Pré-visualização para recorte de avatar"
              onLoad={handleImageLoad}
              draggable={false}
              style={
                naturalSize
                  ? {
                      width: naturalSize.w * effectiveScale,
                      height: naturalSize.h * effectiveScale,
                      transform: `translate3d(${
                        (CROP_SIZE - naturalSize.w * effectiveScale) / 2 + offset.x
                      }px, ${
                        (CROP_SIZE - naturalSize.h * effectiveScale) / 2 + offset.y
                      }px, 0)`,
                    }
                  : { opacity: 0 }
              }
              className="absolute top-0 left-0 max-w-none pointer-events-none select-none"
            />

            {/* Circular Vignette Mask */}
            <div
              aria-hidden="true"
              className="absolute inset-0 pointer-events-none"
              style={{
                boxShadow: 'inset 0 0 0 9999px rgba(12, 13, 12, 0.58)',
                borderRadius: '9999px',
              }}
            />
            <div
              aria-hidden="true"
              className="absolute inset-0 rounded-full border-2 border-[#4ADE80]/85 pointer-events-none"
            />
          </div>

          {/* Zoom Controls */}
          <div className="w-full max-w-[300px] space-y-2">
            <div className="flex items-center justify-between text-xs text-[#8C9288] font-mono tabular-nums">
              <span>Zoom</span>
              <span>{Math.round(zoom * 100)}%</span>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setZoom((z) => Math.max(1, Number((z - 0.15).toFixed(2))))}
                aria-label="Diminuir zoom"
                className="p-1.5 text-[#A8ACA5] hover:text-[#F2F2EE] cursor-pointer"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <input
                type="range"
                min={1}
                max={3}
                step={0.02}
                value={zoom}
                onChange={(e) => setZoom(Number(e.target.value))}
                aria-label="Controle de zoom"
                className="flex-1 accent-[#4ADE80] cursor-pointer"
              />
              <button
                type="button"
                onClick={() => setZoom((z) => Math.min(3, Number((z + 0.15).toFixed(2))))}
                aria-label="Aumentar zoom"
                className="p-1.5 text-[#A8ACA5] hover:text-[#F2F2EE] cursor-pointer"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={handleReset}
                aria-label="Centralizar imagem"
                title="Centralizar imagem"
                className="p-1.5 text-[#A8ACA5] hover:text-[#F2F2EE] cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {error && (
            <p className="text-xs text-[#F87171] text-center" role="alert">
              {error}
            </p>
          )}
        </div>

        <div className="border-t border-[#232723] px-5 py-4 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-[#A8ACA5] hover:text-[#F2F2EE] transition-colors cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleApplyCrop}
            disabled={!naturalSize || saving}
            className="px-5 py-2 text-xs font-semibold bg-[#F2F2EE] text-[#0C0D0C] rounded-md hover:bg-white disabled:opacity-50 transition-colors cursor-pointer"
          >
            {saving ? 'Salvando avatar...' : 'Salvar avatar (300×300)'}
          </button>
        </div>
      </div>
    </div>
  );
}
