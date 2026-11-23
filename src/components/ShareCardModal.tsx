import { useEffect, useState } from 'react';
import { Check, Copy, Download, Share2, X } from 'lucide-react';
import { COBRA_LOGO_PATH, getScoreMeta, resolveAssetUrl } from '../types';

export type ShareCardPayload =
  | {
      kind: 'review';
      gameTitle: string;
      developer: string;
      releaseYear?: number;
      coverUrl?: string;
      score: number;
      authorName: string;
      platformPlayed: string;
      hoursPlayed: number;
      playStatusLabel?: string;
      ratingOnly: boolean;
      hasSpoiler: boolean;
      headline: string;
      body: string;
    }
  | {
      kind: 'top5';
      memberName: string;
      bio?: string;
      averageScore: number | null;
      reviewCount: number;
      topFiveGames: string[];
    }
  | {
      kind: 'event';
      eventTitle: string;
      mode: 'poll' | 'award';
      voterCount: number;
      winners: { categoryName: string; winnerTitle: string; votesCount: number }[];
      topScorers?: { name: string; correctCount: number }[];
    }
  | {
      kind: 'retrospective';
      year: number;
      totalReviews: number;
      totalGames: number;
      totalHours: number;
      avgScore: number | null;
      gotyTitle: string;
      gotyScore: number | null;
      controversialTitle: string;
      controversialRange: string;
      mostActiveMember: string;
      mostActiveCount: number;
    };

interface ShareCardModalProps {
  payload: ShareCardPayload;
  onClose: () => void;
}

function scoreColorHex(score: number | null): string {
  if (score === null) return '#3A3F3A';
  if (score >= 90) return '#15803D';
  if (score >= 75) return '#1E8E49';
  if (score >= 50) return '#B45309';
  return '#B91C1C';
}

function loadImageSafe(src?: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    if (!src) {
      resolve(null);
      return;
    }
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.referrerPolicy = 'no-referrer';
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = resolveAssetUrl(src);
  });
}

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxLines: number,
): string[] {
  const words = text.replace(/\s+/g, ' ').trim().split(' ');
  const lines: string[] = [];
  let current = '';

  for (const word of words) {
    const test = current ? `${current} ${word}` : word;
    if (ctx.measureText(test).width <= maxWidth) {
      current = test;
    } else {
      if (current) lines.push(current);
      current = word;
      if (lines.length >= maxLines) break;
    }
  }
  if (current && lines.length < maxLines) {
    lines.push(current);
  }
  if (lines.length === maxLines && words.join(' ').length > lines.join(' ').length + 3) {
    lines[maxLines - 1] = `${lines[maxLines - 1].replace(/[.,;:!?-]?$/, '')}…`;
  }
  return lines;
}

async function renderShareCardToDataUrl(payload: ShareCardPayload): Promise<string> {
  const width = 1080;
  const height = 1350;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas indisponível');

  // Background
  ctx.fillStyle = '#0C0D0C';
  ctx.fillRect(0, 0, width, height);

  // Subtle ambient radial glow
  const grad = ctx.createRadialGradient(width * 0.82, height * 0.14, 40, width * 0.82, height * 0.14, 620);
  grad.addColorStop(0, 'rgba(74, 222, 128, 0.12)');
  grad.addColorStop(1, 'rgba(12, 13, 12, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height);

  // Outer editorial frame
  drawRoundedRect(ctx, 48, 48, width - 96, height - 96, 18);
  ctx.fillStyle = '#141614';
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = '#262B26';
  ctx.stroke();

  // Top Header with CobraCritic brand
  const logoImg = await loadImageSafe(COBRA_LOGO_PATH);
  if (logoImg) {
    const logoH = 44;
    const logoW = (logoImg.width / logoImg.height) * logoH;
    ctx.drawImage(logoImg, 96, 94, Math.min(logoW, 300), logoH);
  } else {
    ctx.fillStyle = '#4ADE80';
    ctx.font = '700 34px Outfit, sans-serif';
    ctx.fillText('CobraCritic', 96, 128);
  }

  ctx.fillStyle = '#787D75';
  ctx.font = '600 22px "IBM Plex Mono", monospace';
  ctx.textAlign = 'right';
  const kindLabel =
    payload.kind === 'review'
      ? 'VEREDITO DO GRUPO'
      : payload.kind === 'top5'
        ? 'TOP 5 JOGOS DA VIDA'
        : payload.kind === 'event'
          ? payload.mode === 'poll'
            ? 'RESULTADO DA VOTAÇÃO'
            : 'RESULTADO DA PREMIAÇÃO'
          : `RETROSPECTIVA ${payload.year}`;
  ctx.fillText(kindLabel, width - 96, 124);
  ctx.textAlign = 'left';

  // Header divider
  ctx.strokeStyle = '#232823';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(96, 168);
  ctx.lineTo(width - 96, 168);
  ctx.stroke();

  if (payload.kind === 'review') {
    const coverImg = await loadImageSafe(payload.coverUrl);
    const coverX = 96;
    const coverY = 212;
    const coverW = 290;
    const coverH = 386;

    drawRoundedRect(ctx, coverX, coverY, coverW, coverH, 10);
    ctx.save();
    ctx.clip();
    if (coverImg) {
      const scale = Math.max(coverW / coverImg.width, coverH / coverImg.height);
      const drawW = coverImg.width * scale;
      const drawH = coverImg.height * scale;
      ctx.drawImage(
        coverImg,
        coverX + (coverW - drawW) / 2,
        coverY + (coverH - drawH) / 2,
        drawW,
        drawH,
      );
    } else {
      ctx.fillStyle = '#1B201B';
      ctx.fillRect(coverX, coverY, coverW, coverH);
      ctx.fillStyle = '#4ADE80';
      ctx.font = '700 84px Outfit, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(payload.gameTitle.slice(0, 2).toUpperCase(), coverX + coverW / 2, coverY + coverH / 2 + 24);
      ctx.textAlign = 'left';
    }
    ctx.restore();
    drawRoundedRect(ctx, coverX, coverY, coverW, coverH, 10);
    ctx.strokeStyle = '#2F362F';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Right of cover: game title + score badge
    const infoX = 426;
    const infoMaxW = width - infoX - 96;

    ctx.fillStyle = '#90968C';
    ctx.font = '500 24px "Plus Jakarta Sans", sans-serif';
    ctx.fillText(
      payload.releaseYear ? `${payload.developer} · ${payload.releaseYear}` : payload.developer,
      infoX,
      244,
    );

    ctx.fillStyle = '#F2F2EE';
    ctx.font = '700 48px Outfit, sans-serif';
    const titleLines = wrapText(ctx, payload.gameTitle, infoMaxW, 3);
    titleLines.forEach((line, idx) => {
      ctx.fillText(line, infoX, 308 + idx * 56);
    });

    // Score Square
    const scoreMeta = getScoreMeta(payload.score);
    const badgeY = 474;
    drawRoundedRect(ctx, infoX, badgeY, 126, 124, 14);
    ctx.fillStyle = scoreColorHex(payload.score);
    ctx.fill();
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '700 62px "IBM Plex Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillText(String(payload.score), infoX + 63, badgeY + 84);
    ctx.textAlign = 'left';

    ctx.fillStyle = '#F2F2EE';
    ctx.font = '700 30px Outfit, sans-serif';
    ctx.fillText(scoreMeta.label, infoX + 150, badgeY + 46);

    ctx.fillStyle = '#A8ACA5';
    ctx.font = '500 24px "Plus Jakarta Sans", sans-serif';
    const metaParts = [payload.platformPlayed];
    if (payload.hoursPlayed > 0) metaParts.push(`${payload.hoursPlayed}h jogadas`);
    if (payload.playStatusLabel) metaParts.push(payload.playStatusLabel);
    const metaLine = metaParts.join(' · ');
    ctx.fillText(metaLine, infoX + 150, badgeY + 86);

    ctx.fillStyle = '#4ADE80';
    ctx.font = '600 24px "Plus Jakarta Sans", sans-serif';
    ctx.fillText(`Por ${payload.authorName}`, infoX + 150, badgeY + 120);

    // Critique body box
    const bodyBoxY = 648;
    const bodyBoxH = 510;
    drawRoundedRect(ctx, 96, bodyBoxY, width - 192, bodyBoxH, 14);
    ctx.fillStyle = '#0F110F';
    ctx.fill();
    ctx.strokeStyle = '#232823';
    ctx.lineWidth = 2;
    ctx.stroke();

    if (payload.ratingOnly) {
      ctx.fillStyle = '#4ADE80';
      ctx.font = '600 26px "IBM Plex Mono", monospace';
      ctx.fillText('AVALIAÇÃO RÁPIDA', 140, bodyBoxY + 185);
      ctx.fillStyle = '#F2F2EE';
      ctx.font = '600 38px Outfit, sans-serif';
      const lines = wrapText(
        ctx,
        `${payload.authorName} optou apenas por dar nota ${payload.score}/100 para ${payload.gameTitle}.`,
        width - 280,
        4,
      );
      lines.forEach((line, idx) => {
        ctx.fillText(line, 140, bodyBoxY + 245 + idx * 50);
      });
    } else if (payload.hasSpoiler) {
      ctx.fillStyle = '#FBBF24';
      ctx.font = '700 26px "IBM Plex Mono", monospace';
      ctx.fillText('AVISO DE SPOILER', 140, bodyBoxY + 165);
      ctx.fillStyle = '#F2F2EE';
      ctx.font = '700 40px Outfit, sans-serif';
      const hlLines = wrapText(ctx, `“${payload.headline}”`, width - 280, 3);
      hlLines.forEach((line, idx) => {
        ctx.fillText(line, 140, bodyBoxY + 230 + idx * 52);
      });
      ctx.fillStyle = '#90968C';
      ctx.font = '500 26px "Plus Jakarta Sans", sans-serif';
      ctx.fillText(
        'Texto completo ocultado para evitar spoilers. Leia no CobraCritic!',
        140,
        bodyBoxY + 425,
      );
    } else {
      ctx.fillStyle = '#F2F2EE';
      ctx.font = '700 36px Outfit, sans-serif';
      const hlLines = wrapText(ctx, `“${payload.headline}”`, width - 272, 2);
      hlLines.forEach((line, idx) => {
        ctx.fillText(line, 136, bodyBoxY + 66 + idx * 46);
      });

      ctx.fillStyle = '#C8CBC4';
      ctx.font = '400 27px "Plus Jakarta Sans", sans-serif';
      const bodyStartY = bodyBoxY + 86 + hlLines.length * 46;
      const bodyLines = wrapText(ctx, payload.body, width - 272, 8);
      bodyLines.forEach((line, idx) => {
        ctx.fillText(line, 136, bodyStartY + idx * 40);
      });
    }
  } else if (payload.kind === 'top5') {
    ctx.fillStyle = '#4ADE80';
    ctx.font = '600 26px "Plus Jakarta Sans", sans-serif';
    ctx.fillText('Hall Pessoal · Grupo dos Cobras', 96, 232);

    ctx.fillStyle = '#F2F2EE';
    ctx.font = '700 58px Outfit, sans-serif';
    const nameLines = wrapText(ctx, payload.memberName, width - 192, 2);
    nameLines.forEach((line, idx) => {
      ctx.fillText(line, 96, 304 + idx * 66);
    });

    const statsY = 304 + nameLines.length * 66 + 10;
    ctx.fillStyle = '#90968C';
    ctx.font = '500 25px "IBM Plex Mono", monospace';
    ctx.fillText(
      `${payload.reviewCount} avaliações publicadas  ·  Média dada: ${payload.averageScore !== null ? payload.averageScore : '—'}`,
      96,
      statsY,
    );

    const listTop = statsY + 64;
    payload.topFiveGames.slice(0, 5).forEach((title, idx) => {
      const y = listTop + idx * 144;
      drawRoundedRect(ctx, 96, y, width - 192, 120, 12);
      ctx.fillStyle = idx === 0 ? '#132217' : '#0F110F';
      ctx.fill();
      ctx.strokeStyle = idx === 0 ? '#2A5C3B' : '#242924';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.fillStyle = idx === 0 ? '#4ADE80' : '#8C9288';
      ctx.font = '700 44px "IBM Plex Mono", monospace';
      ctx.fillText(String(idx + 1).padStart(2, '0'), 132, y + 76);

      ctx.fillStyle = '#F2F2EE';
      ctx.font = '700 34px Outfit, sans-serif';
      const titleLine = wrapText(ctx, title, width - 350, 1)[0] || title;
      ctx.fillText(titleLine, 224, y + 73);
    });
  } else if (payload.kind === 'event') {
    ctx.fillStyle = payload.mode === 'poll' ? '#4ADE80' : '#FBBF24';
    ctx.font = '600 26px "Plus Jakarta Sans", sans-serif';
    ctx.fillText(
      payload.mode === 'poll'
        ? `Votação Encerrada · ${payload.voterCount} participantes`
        : `Premiação Encerrada · ${payload.voterCount} participantes`,
      96,
      230,
    );

    ctx.fillStyle = '#F2F2EE';
    ctx.font = '700 54px Outfit, sans-serif';
    const titleLines = wrapText(ctx, payload.eventTitle, width - 192, 2);
    titleLines.forEach((line, idx) => {
      ctx.fillText(line, 96, 298 + idx * 62);
    });

    let cursorY = 298 + titleLines.length * 62 + 34;
    const maxWinners = payload.topScorers && payload.topScorers.length > 0 ? 5 : 6;
    payload.winners.slice(0, maxWinners).forEach((item) => {
      drawRoundedRect(ctx, 96, cursorY, width - 192, 114, 12);
      ctx.fillStyle = '#0F110F';
      ctx.fill();
      ctx.strokeStyle = '#252B25';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.fillStyle = '#8C9288';
      ctx.font = '600 21px "Plus Jakarta Sans", sans-serif';
      ctx.fillText(item.categoryName.toUpperCase().slice(0, 48), 130, cursorY + 42);

      ctx.fillStyle = '#F2F2EE';
      ctx.font = '700 32px Outfit, sans-serif';
      const winnerLine = wrapText(ctx, item.winnerTitle, width - 410, 1)[0] || item.winnerTitle;
      ctx.fillText(winnerLine, 130, cursorY + 88);

      ctx.fillStyle = '#4ADE80';
      ctx.font = '600 22px "IBM Plex Mono", monospace';
      ctx.textAlign = 'right';
      ctx.fillText(
        `${item.votesCount} ${item.votesCount === 1 ? 'voto' : 'votos'}`,
        width - 130,
        cursorY + 72,
      );
      ctx.textAlign = 'left';

      cursorY += 130;
    });

    if (payload.mode === 'award' && payload.topScorers && payload.topScorers.length > 0) {
      drawRoundedRect(ctx, 96, Math.min(cursorY + 12, 1054), width - 192, 118, 12);
      const boxY = Math.min(cursorY + 12, 1054);
      ctx.fillStyle = '#1B1810';
      ctx.fill();
      ctx.strokeStyle = '#5A4419';
      ctx.stroke();

      ctx.fillStyle = '#FBBF24';
      ctx.font = '700 22px "IBM Plex Mono", monospace';
      ctx.fillText('MAIORES ACERTADORES DO BOLÃO', 130, boxY + 44);

      ctx.fillStyle = '#F2F2EE';
      ctx.font = '600 28px Outfit, sans-serif';
      const scorersLine = payload.topScorers
        .slice(0, 3)
        .map((s) => `${s.name} (${s.correctCount})`)
        .join('  ·  ');
      ctx.fillText(wrapText(ctx, scorersLine, width - 260, 1)[0] || scorersLine, 130, boxY + 90);
    }
  } else {
    // Retrospective Card
    ctx.fillStyle = '#4ADE80';
    ctx.font = '700 28px "IBM Plex Mono", monospace';
    ctx.fillText(`RESUMO ANUAL DOS COBRAS · ${payload.year}`, 96, 232);

    ctx.fillStyle = '#F2F2EE';
    ctx.font = '700 62px Outfit, sans-serif';
    ctx.fillText(`Retrospectiva ${payload.year}`, 96, 310);

    // 4 KPI Boxes
    const kpis = [
      { label: 'Críticas', value: String(payload.totalReviews) },
      { label: 'Jogos avaliados', value: String(payload.totalGames) },
      { label: 'Média do grupo', value: payload.avgScore !== null ? String(payload.avgScore) : '—' },
      { label: 'Horas jogadas', value: `${Math.round(payload.totalHours)}h` },
    ];
    const boxW = (width - 192 - 36) / 2;
    kpis.forEach((kpi, i) => {
      const col = i % 2;
      const row = Math.floor(i / 2);
      const x = 96 + col * (boxW + 36);
      const y = 360 + row * 150;
      drawRoundedRect(ctx, x, y, boxW, 126, 12);
      ctx.fillStyle = '#0F110F';
      ctx.fill();
      ctx.strokeStyle = '#252B25';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.fillStyle = '#8C9288';
      ctx.font = '500 23px "Plus Jakarta Sans", sans-serif';
      ctx.fillText(kpi.label, x + 28, y + 46);

      ctx.fillStyle = '#4ADE80';
      ctx.font = '700 50px "IBM Plex Mono", monospace';
      ctx.fillText(kpi.value, x + 28, y + 104);
    });

    // Highlights
    const highlights = [
      {
        kicker: 'JOGO DO ANO DOS COBRAS',
        title: payload.gotyTitle || '—',
        meta: payload.gotyScore !== null ? `Média ${payload.gotyScore}/100` : '',
        color: '#4ADE80',
      },
      {
        kicker: 'MAIOR POLÊMICA DO ANO',
        title: payload.controversialTitle || '—',
        meta: payload.controversialRange,
        color: '#FBBF24',
      },
      {
        kicker: 'CRÍTICO MAIS ATIVO',
        title: payload.mostActiveMember || '—',
        meta:
          payload.mostActiveCount > 0
            ? `${payload.mostActiveCount} ${payload.mostActiveCount === 1 ? 'avaliação' : 'avaliações'} no ano`
            : '',
        color: '#60A5FA',
      },
    ];

    highlights.forEach((item, idx) => {
      const y = 696 + idx * 160;
      drawRoundedRect(ctx, 96, y, width - 192, 136, 12);
      ctx.fillStyle = '#0F110F';
      ctx.fill();
      ctx.strokeStyle = '#252B25';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.fillStyle = item.color;
      ctx.font = '700 21px "IBM Plex Mono", monospace';
      ctx.fillText(item.kicker, 132, y + 44);

      ctx.fillStyle = '#F2F2EE';
      ctx.font = '700 36px Outfit, sans-serif';
      ctx.fillText(wrapText(ctx, item.title, width - 270, 1)[0] || item.title, 132, y + 92);

      if (item.meta) {
        ctx.fillStyle = '#90968C';
        ctx.font = '500 22px "Plus Jakarta Sans", sans-serif';
        ctx.fillText(item.meta, 132, y + 122);
      }
    });
  }

  // Footer
  ctx.strokeStyle = '#232823';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(96, height - 134);
  ctx.lineTo(width - 96, height - 134);
  ctx.stroke();

  ctx.fillStyle = '#787D75';
  ctx.font = '500 22px "Plus Jakarta Sans", sans-serif';
  ctx.fillText('Grupo dos Cobras · Catálogo, notas e votações', 96, height - 88);

  ctx.fillStyle = '#4ADE80';
  ctx.font = '600 22px "IBM Plex Mono", monospace';
  ctx.textAlign = 'right';
  ctx.fillText('COBRACRITIC', width - 96, height - 88);
  ctx.textAlign = 'left';

  return canvas.toDataURL('image/png');
}

export function ShareCardModal({ payload, onClose }: ShareCardModalProps) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [copyMessage, setCopyMessage] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setDataUrl(null);
    setError(null);

    const run = async () => {
      try {
        if (document.fonts && document.fonts.ready) {
          await document.fonts.ready;
        }
        const url = await renderShareCardToDataUrl(payload);
        if (active) setDataUrl(url);
      } catch {
        if (active) {
          setError('Não foi possível gerar a imagem neste navegador.');
        }
      }
    };
    void run();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      active = false;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [payload, onClose]);

  const filename =
    payload.kind === 'review'
      ? `cobracritic-critica-${payload.gameTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 32)}.png`
      : payload.kind === 'top5'
        ? `cobracritic-top5-${payload.memberName.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 24)}.png`
        : payload.kind === 'event'
          ? `cobracritic-evento-${payload.eventTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 32)}.png`
          : `cobracritic-retrospectiva-${payload.year}.png`;

  const handleDownload = () => {
    if (!dataUrl) return;
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCopyImage = async () => {
    if (!dataUrl) return;
    setCopyMessage(null);
    try {
      const res = await fetch(dataUrl);
      const blob = await res.blob();
      if (navigator.clipboard && 'ClipboardItem' in window) {
        await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
        setCopied(true);
        setCopyMessage('Imagem copiada! Agora é só colar no WhatsApp ou Discord.');
        window.setTimeout(() => setCopied(false), 3000);
      } else {
        setCopyMessage('Use o botão "Baixar PNG" para enviar no WhatsApp ou Discord.');
      }
    } catch {
      setCopyMessage('O navegador bloqueou a cópia direta. Clique em "Baixar PNG".');
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-[2px] flex items-center justify-center p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="share-card-title"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-[#141614] border border-[#2A2F2A] rounded-md w-full max-w-lg max-h-[94vh] overflow-y-auto my-auto text-[#F2F2EE]"
      >
        <div className="px-5 py-4 border-b border-[#232723] flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Share2 className="w-4 h-4 text-[#4ADE80]" />
            <h2 id="share-card-title" className="font-display text-lg font-semibold">
              Card para WhatsApp / Discord
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="p-1.5 text-[#8C9288] hover:text-[#F2F2EE] cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {error ? (
            <p className="text-sm text-[#F87171] py-8 text-center">{error}</p>
          ) : !dataUrl ? (
            <div className="aspect-[4/5] w-full bg-[#0C0D0C] border border-[#232723] rounded flex items-center justify-center">
              <p className="text-xs font-mono text-[#8C9288]">Gerando card em alta definição...</p>
            </div>
          ) : (
            <div className="bg-[#0C0D0C] border border-[#262A26] rounded overflow-hidden">
              <img
                src={dataUrl}
                alt="Prévia do card para compartilhamento"
                className="w-full h-auto block"
              />
            </div>
          )}

          {copyMessage && (
            <p className="text-xs text-[#86EFAC] text-center" role="status">
              {copyMessage}
            </p>
          )}

          <div className="flex flex-wrap items-center justify-end gap-2.5 pt-2 border-t border-[#232723]">
            <button
              type="button"
              disabled={!dataUrl}
              onClick={handleCopyImage}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium border border-[#2F352F] bg-[#0C0D0C] text-[#F2F2EE] rounded-md hover:border-[#4ADE80] disabled:opacity-40 transition-colors cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-[#4ADE80]" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copiado!' : 'Copiar imagem'}</span>
            </button>
            <button
              type="button"
              disabled={!dataUrl}
              onClick={handleDownload}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-[#4ADE80] text-[#0C0D0C] rounded-md hover:bg-[#6EE79E] disabled:opacity-40 transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Baixar PNG</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
