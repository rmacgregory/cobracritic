import { useEffect, useMemo, useState } from 'react';
import { Monitor, RotateCcw, SlidersHorizontal, X } from 'lucide-react';
import {
  useCrt,
  type CrtCurvatureLevel,
} from '../context/CrtContext';

const CURVATURE_PRESETS: Record<
  CrtCurvatureLevel,
  {
    label: string;
    description: string;
    warpScale: number;
    aaSigma: number;
    vignetteStrength: number;
    cornerRadius: number;
  }
> = {
  subtle: {
    label: 'Leve',
    description: 'Curvatura suave (anos 90/2000)',
    warpScale: 12,
    aaSigma: 0.38,
    vignetteStrength: 0.34,
    cornerRadius: 10,
  },
  medium: {
    label: 'Média',
    description: 'Tubo clássico de TV e arcade',
    warpScale: 24,
    aaSigma: 0.44,
    vignetteStrength: 0.5,
    cornerRadius: 16,
  },
};

function createBarrelDisplacementDataUrl(width: number, height: number): string {
  if (typeof document === 'undefined') return '';
  const w = Math.max(320, Math.min(1600, Math.round(width)));
  const h = Math.max(240, Math.min(1000, Math.round(height)));
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  const img = ctx.createImageData(w, h);
  const data = img.data;
  const maxX = w - 1;
  const maxY = h - 1;

  for (let y = 0; y < h; y++) {
    const ny = (y / maxY) * 2 - 1;
    const ny2 = ny * ny;
    for (let x = 0; x < w; x++) {
      const nx = (x / maxX) * 2 - 1;
      const r2 = nx * nx + ny2;

      // Barrel displacement: zero at center & edge midpoints, smooth 1:1 viewport grid
      const dx = Math.max(-1, Math.min(1, nx * (r2 - 1)));
      const dy = Math.max(-1, Math.min(1, ny * (r2 - 1)));

      const idx = (y * w + x) * 4;
      data[idx] = Math.round(128 + dx * 127);
      data[idx + 1] = Math.round(128 + dy * 127);
      data[idx + 2] = 128;
      data[idx + 3] = 255;
    }
  }

  ctx.putImageData(img, 0, 0);
  return canvas.toDataURL('image/png');
}

export function CrtWarpFilterSvg() {
  const { settings, unlocked } = useCrt();
  const [viewportSize, setViewportSize] = useState<{ w: number; h: number }>(() => {
    if (typeof window === 'undefined') return { w: 1280, h: 720 };
    return { w: window.innerWidth, h: window.innerHeight };
  });

  useEffect(() => {
    if (!unlocked || !settings.enabled || typeof window === 'undefined') return;
    let timer: number | undefined;
    const handleResize = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        setViewportSize({ w: window.innerWidth, h: window.innerHeight });
      }, 150);
    };
    window.addEventListener('resize', handleResize);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('resize', handleResize);
    };
  }, [unlocked, settings.enabled]);

  const dispMapUrl = useMemo(
    () =>
      unlocked && settings.enabled
        ? createBarrelDisplacementDataUrl(viewportSize.w, viewportSize.h)
        : '',
    [unlocked, settings.enabled, viewportSize.w, viewportSize.h],
  );

  if (!unlocked || !settings.enabled || !dispMapUrl) return null;

  const preset = CURVATURE_PRESETS[settings.curvature];

  return (
    <svg
      aria-hidden="true"
      className="fixed w-0 h-0 pointer-events-none overflow-hidden"
    >
      <defs>
        <filter
          id="crt-barrel-warp"
          x="0%"
          y="0%"
          width="100%"
          height="100%"
          colorInterpolationFilters="sRGB"
        >
          <feGaussianBlur
            in="SourceGraphic"
            stdDeviation={preset.aaSigma}
            result="preSmooth"
          />
          <feImage
            href={dispMapUrl}
            x="0"
            y="0"
            width="100%"
            height="100%"
            preserveAspectRatio="none"
            result="dispMap"
          />
          <feDisplacementMap
            in="preSmooth"
            in2="dispMap"
            scale={preset.warpScale}
            xChannelSelector="R"
            yChannelSelector="G"
            result="warped"
          />
          <feGaussianBlur in="warped" stdDeviation={preset.aaSigma} />
        </filter>
      </defs>
    </svg>
  );
}

export function CrtOverlay() {
  const { settings, unlocked } = useCrt();

  if (!unlocked || !settings.enabled) return null;

  const phosphor = settings.phosphorGlow / 100;
  const brightnessRatio = settings.totalBrightness / 100;
  const curve = CURVATURE_PRESETS[settings.curvature];

  const scanlineOpacity = 0.22 + (1 - phosphor * 0.25) * 0.14;
  const rgbMaskOpacity = 0.04 + phosphor * 0.09;
  const bandOpacity = 0.1 + phosphor * 0.14;
  const phosphorBloomOpacity = 0.06 + phosphor * 0.18;
  const glassReflectionOpacity =
    settings.curvature === 'medium' ? 0.09 : 0.04;

  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 z-[70] pointer-events-none select-none overflow-hidden"
    >
      {/* 1. Horizontal CRT Scanlines (warp along with screen frame) */}
      <div
        className="absolute inset-0"
        style={{
          opacity: scanlineOpacity,
          backgroundImage:
            'repeating-linear-gradient(to bottom, rgba(0, 0, 0, 0) 0px, rgba(0, 0, 0, 0) 2px, rgba(0, 0, 0, 0.72) 3px, rgba(0, 0, 0, 0.72) 4px)',
        }}
      />

      {/* 2. Balanced RGB Aperture Grille / Shadow Mask */}
      <div
        className="absolute inset-0"
        style={{
          opacity: rgbMaskOpacity,
          backgroundImage:
            'repeating-linear-gradient(to right, rgba(255, 110, 110, 0.7) 0px, rgba(110, 255, 145, 0.7) 1px, rgba(110, 175, 255, 0.7) 2px, rgba(0, 0, 0, 0) 3px)',
        }}
      />

      {/* 3. Soft Light-White Phosphor Radiance Bloom */}
      <div
        className="absolute inset-0 mix-blend-screen"
        style={{
          opacity: phosphorBloomOpacity * Math.min(1.25, brightnessRatio),
          background:
            'radial-gradient(ellipse at 50% 45%, rgba(250, 252, 255, 0.2) 0%, rgba(241, 245, 249, 0.08) 48%, rgba(226, 232, 240, 0.02) 78%, transparent 100%)',
        }}
      />

      {/* 4. Traveling Frequency Refresh Band (Slow Light-White Sweep) */}
      <div
        className="crt-scanband absolute left-0 right-0 h-28"
        style={{
          opacity: bandOpacity,
          background:
            'linear-gradient(to bottom, rgba(255, 255, 255, 0) 0%, rgba(248, 250, 252, 0.16) 28%, rgba(255, 255, 255, 0.34) 50%, rgba(241, 245, 249, 0.14) 74%, rgba(255, 255, 255, 0) 100%)',
          boxShadow: `0 0 ${Math.round(14 + phosphor * 20)}px rgba(248, 250, 252, ${(0.12 + phosphor * 0.18).toFixed(2)})`,
        }}
      />
      <div
        className="crt-scanband-thin absolute left-0 right-0 h-2"
        style={{
          opacity: bandOpacity * 0.8,
          background:
            'linear-gradient(to bottom, transparent, rgba(255, 255, 255, 0.45), transparent)',
        }}
      />

      {/* 5. Convex Tube Edge Vignette + Glass Curvature Reflection */}
      <div
        className="absolute inset-0"
        style={{
          background: `radial-gradient(ellipse at 50% 50%, rgba(0, 0, 0, 0) ${
            settings.curvature === 'medium' ? '60%' : '68%'
          }, rgba(0, 0, 0, ${(curve.vignetteStrength * 0.55).toFixed(2)}) 86%, rgba(0, 0, 0, ${curve.vignetteStrength.toFixed(2)}) 100%)`,
        }}
      />

      <div
        className="absolute inset-0"
        style={{
          opacity: glassReflectionOpacity,
          background:
            'linear-gradient(155deg, rgba(255, 255, 255, 0.45) 0%, rgba(255, 255, 255, 0.12) 14%, rgba(255, 255, 255, 0) 36%)',
        }}
      />

      {/* 7. Subtle Inner Tube Rim (automatically curves with the barrel distortion filter) */}
      <svg
        viewBox="0 0 1000 1000"
        preserveAspectRatio="none"
        className="absolute inset-0 w-full h-full"
      >
        <rect
          x="1.5"
          y="1.5"
          width="997"
          height="997"
          rx={curve.cornerRadius}
          ry={curve.cornerRadius}
          fill="none"
          stroke={`rgba(248, 250, 252, ${(0.08 + phosphor * 0.16).toFixed(2)})`}
          strokeWidth="1.75"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
    </div>
  );
}

export function CrtSettingsModal() {
  const {
    settings,
    unlocked,
    configOpen,
    setConfigOpen,
    toggleCrt,
    updateSettings,
    resetSettings,
  } = useCrt();

  useEffect(() => {
    if (!unlocked || !configOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setConfigOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [unlocked, configOpen, setConfigOpen]);

  if (!unlocked || !configOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="crt-config-title"
      className="fixed inset-0 z-[65] bg-black/75 backdrop-blur-[2px] flex items-center justify-center p-4"
      onClick={() => setConfigOpen(false)}
    >
      <div
        className="w-full max-w-md bg-[#121512] border border-[#2C332C] shadow-2xl text-[#F2F2EE] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-[#141714] border-b border-[#232723] px-5 py-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <SlidersHorizontal className="w-4 h-4 text-[#4ADE80] shrink-0" />
            <h2
              id="crt-config-title"
              className="font-display text-base font-semibold text-[#F2F2EE] truncate"
            >
              Configurações do Modo CRT
            </h2>
          </div>
          <button
            type="button"
            onClick={() => setConfigOpen(false)}
            aria-label="Fechar configurações do modo CRT"
            className="p-1 text-[#8C9288] hover:text-[#F2F2EE] cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Master CRT Toggle */}
          <div className="flex items-center justify-between gap-4 pb-4 border-b border-[#222622]">
            <div className="min-w-0">
              <p className="text-sm font-medium text-[#F2F2EE]">
                Filtro de monitor CRT
              </p>
              <p className="text-xs text-[#8C9288] mt-0.5">
                Linhas de varredura, faixa de frequência e tubo de fósforo.
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={settings.enabled}
              onClick={toggleCrt}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                settings.enabled
                  ? 'bg-[#16291D] border-[#4ADE80]/70 text-[#4ADE80]'
                  : 'bg-[#0C0D0C] border-[#2A2F2A] text-[#A8ACA5] hover:text-[#F2F2EE]'
              }`}
            >
              <Monitor className="w-3.5 h-3.5 shrink-0" />
              <span>{settings.enabled ? 'Ligado' : 'Desligado'}</span>
            </button>
          </div>

          {/* Phosphor Glow Slider */}
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <label
                htmlFor="crt-phosphor-range"
                className="text-xs font-medium text-[#F2F2EE]"
              >
                Brilho do fósforo
              </label>
              <span className="font-mono text-xs font-semibold text-[#4ADE80] tabular-nums">
                {settings.phosphorGlow}%
              </span>
            </div>
            <input
              id="crt-phosphor-range"
              type="range"
              min={0}
              max={100}
              step={1}
              value={settings.phosphorGlow}
              onChange={(e) =>
                updateSettings({ phosphorGlow: Number(e.target.value) })
              }
              className="w-full accent-[#4ADE80] cursor-pointer"
            />
            <div className="flex justify-between text-[11px] text-[#787D75] tabular-nums">
              <span>0% (Seco)</span>
              <span>50%</span>
              <span>100% (Intenso)</span>
            </div>
          </div>

          {/* Total Brightness Slider */}
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <label
                htmlFor="crt-brightness-range"
                className="text-xs font-medium text-[#F2F2EE]"
              >
                Brilho total da tela
              </label>
              <span className="font-mono text-xs font-semibold text-[#4ADE80] tabular-nums">
                {settings.totalBrightness}%
              </span>
            </div>
            <input
              id="crt-brightness-range"
              type="range"
              min={60}
              max={140}
              step={2}
              value={settings.totalBrightness}
              onChange={(e) =>
                updateSettings({ totalBrightness: Number(e.target.value) })
              }
              className="w-full accent-[#4ADE80] cursor-pointer"
            />
            <div className="flex justify-between text-[11px] text-[#787D75] tabular-nums">
              <span>60% (Escuro)</span>
              <span>100% (Padrão)</span>
              <span>140% (Alto)</span>
            </div>
          </div>

          {/* 2 Curvature Presets */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-medium text-[#F2F2EE]">
                Curvatura da tela
              </p>
              <span className="text-[11px] text-[#8C9288]">
                {CURVATURE_PRESETS[settings.curvature].description}
              </span>
            </div>

            <div
              role="group"
              aria-label="Níveis de curvatura da tela CRT"
              className="grid grid-cols-2 gap-2.5"
            >
              {(['subtle', 'medium'] as CrtCurvatureLevel[]).map(
                (level) => {
                  const preset = CURVATURE_PRESETS[level];
                  const active = settings.curvature === level;
                  return (
                    <button
                      key={level}
                      type="button"
                      onClick={() => updateSettings({ curvature: level })}
                      aria-pressed={active}
                      className={`px-3 py-2.5 rounded-md border text-center transition-colors cursor-pointer flex flex-col items-center gap-1.5 ${
                        active
                          ? 'bg-[#16291D] border-[#4ADE80] text-[#F2F2EE]'
                          : 'bg-[#0C0D0C] border-[#262A26] text-[#A8ACA5] hover:text-[#F2F2EE] hover:border-[#3A433A]'
                      }`}
                    >
                      <svg
                        viewBox="0 0 40 28"
                        className="w-8 h-5 shrink-0"
                        aria-hidden="true"
                      >
                        <path
                          d={
                            level === 'subtle'
                              ? 'M 4 4 Q 20 2.5 36 4 Q 37.5 14 36 24 Q 20 25.5 4 24 Q 2.5 14 4 4 Z'
                              : 'M 5 5 Q 20 1.5 35 5 Q 38.5 14 35 23 Q 20 26.5 5 23 Q 1.5 14 5 5 Z'
                          }
                          fill={active ? 'rgba(74, 222, 128, 0.14)' : 'rgba(255, 255, 255, 0.04)'}
                          stroke={active ? '#4ADE80' : '#787D75'}
                          strokeWidth="1.5"
                        />
                      </svg>
                      <span className="text-xs font-medium whitespace-nowrap">
                        {preset.label}
                      </span>
                    </button>
                  );
                },
              )}
            </div>
          </div>

          <div className="pt-3 border-t border-[#222622] flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={resetSettings}
              className="inline-flex items-center gap-1.5 text-xs text-[#8C9288] hover:text-[#F2F2EE] cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Restaurar padrão</span>
            </button>

            <button
              type="button"
              onClick={() => setConfigOpen(false)}
              className="px-4 py-2 text-xs font-semibold bg-[#F2F2EE] text-[#0C0D0C] rounded-md hover:bg-white transition-colors cursor-pointer"
            >
              Concluir
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
