import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Crown, KeyRound, RotateCcw, Search, Sparkles, Trash2, X } from 'lucide-react';
import type { User } from 'firebase/auth';
import { useVeredito } from '../context/VereditoContext';
import type {
  ActiveTab,
  EasterEggId,
  EasterEggTier,
  UserProfile,
} from '../types';

export interface RetroEasterEgg {
  id: EasterEggId;
  name: string;
  game: string;
  tier: EasterEggTier;
  chars: string;
  quote: string;
  colorClass: string;
  hoverGlowClass: string;
}

export const EASTER_EGG_TIER_META: Record<
  EasterEggTier,
  {
    label: string;
    weight: number;
    chanceHint: string;
    pillClass: string;
    cardBorderClass: string;
  }
> = {
  bronze: {
    label: 'Bronze',
    weight: 0.65,
    chanceHint: 'Comum (65%)',
    pillClass: 'text-[#FDBA74] bg-[#24160B] border-[#7C4A21]',
    cardBorderClass: 'border-[#3D2716]',
  },
  silver: {
    label: 'Prata',
    weight: 0.27,
    chanceHint: 'Incomum (27%)',
    pillClass: 'text-[#E2E8F0] bg-[#18202A] border-[#475569]',
    cardBorderClass: 'border-[#323C4A]',
  },
  gold: {
    label: 'Ouro',
    weight: 0.08,
    chanceHint: 'Raro (8%)',
    pillClass: 'text-[#FDE68A] bg-[#261E0F] border-[#9A7422]',
    cardBorderClass: 'border-[#66511D]',
  },
};

export const RETRO_EASTER_EGGS: readonly RetroEasterEgg[] = [
  // ======================== 20 BRONZE (COMUNS) ========================
  {
    id: 'invader',
    name: 'Space Invader',
    game: 'Space Invaders',
    tier: 'bronze',
    chars: '▀▄▀\n▄▀▄',
    quote: 'Insert Coin · Player 1 Ready!',
    colorClass: 'text-[#4ADE80]',
    hoverGlowClass: 'hover:drop-shadow-[0_0_5px_rgba(74,222,128,0.75)]',
  },
  {
    id: 'pacman',
    name: 'Pac-Man',
    game: 'Pac-Man (Arcade)',
    tier: 'bronze',
    chars: 'ᗧ••ᗣ',
    quote: 'Waka waka waka... Fantasma à vista!',
    colorClass: 'text-[#FACC15]',
    hoverGlowClass: 'hover:drop-shadow-[0_0_5px_rgba(250,204,21,0.75)]',
  },
  {
    id: 'tetris',
    name: 'Tetrimino T',
    game: 'Tetris (Game Boy)',
    tier: 'bronze',
    chars: '▄\n▀▀▀',
    quote: 'Line Clear! +100 pontos nostálgicos.',
    colorClass: 'text-[#38BDF8]',
    hoverGlowClass: 'hover:drop-shadow-[0_0_5px_rgba(56,189,248,0.75)]',
  },
  {
    id: 'nintendo',
    name: 'Controle Clássico',
    game: 'NES / SNES',
    tier: 'bronze',
    chars: '✚·ⒷⒶ',
    quote: 'Thank you Mario, but our princess is in another castle.',
    colorClass: 'text-[#E5E7EB]',
    hoverGlowClass: 'hover:drop-shadow-[0_0_5px_rgba(229,231,235,0.7)]',
  },
  {
    id: 'playstation',
    name: 'Símbolos PlayStation',
    game: 'PlayStation',
    tier: 'bronze',
    chars: '△○×□',
    quote: 'Memory Card no Slot 1 reconhecido.',
    colorClass: 'text-[#93C5FD]',
    hoverGlowClass: 'hover:drop-shadow-[0_0_5px_rgba(147,197,253,0.75)]',
  },
  {
    id: 'xbox',
    name: 'Botões Xbox',
    game: 'Xbox / Xbox 360',
    tier: 'bronze',
    chars: 'ⓍⓎⒶⒷ',
    quote: 'Conquista desbloqueada: 10G — Olho de Águia.',
    colorClass: 'text-[#4ADE80]',
    hoverGlowClass: 'hover:drop-shadow-[0_0_5px_rgba(74,222,128,0.75)]',
  },
  {
    id: 'pokeball',
    name: 'Pokébola',
    game: 'Pokémon Red / Blue',
    tier: 'bronze',
    chars: '(◉)',
    quote: 'Gotcha! Segredo capturado com sucesso.',
    colorClass: 'text-[#F87171]',
    hoverGlowClass: 'hover:drop-shadow-[0_0_5px_rgba(248,113,113,0.75)]',
  },
  {
    id: 'coin',
    name: 'Bloco [?]',
    game: 'Super Mario Bros.',
    tier: 'bronze',
    chars: '[?]',
    quote: 'Plim! Você encontrou uma moeda escondida.',
    colorClass: 'text-[#FBBF24]',
    hoverGlowClass: 'hover:drop-shadow-[0_0_5px_rgba(251,191,36,0.75)]',
  },
  {
    id: 'pipe',
    name: 'Cano Warp',
    game: 'Super Mario Bros.',
    tier: 'bronze',
    chars: '╔═╗\n║ ║',
    quote: 'Bem-vindo à Warp Zone! Escolha seu mundo.',
    colorClass: 'text-[#22C55E]',
    hoverGlowClass: 'hover:drop-shadow-[0_0_5px_rgba(34,197,94,0.75)]',
  },
  {
    id: 'sonic_ring',
    name: 'Anel Dourado',
    game: 'Sonic / Mega Drive',
    tier: 'bronze',
    chars: '(◎)',
    quote: 'SEGA! +1 Ring para aguentar um hit.',
    colorClass: 'text-[#FDE047]',
    hoverGlowClass: 'hover:drop-shadow-[0_0_5px_rgba(253,224,71,0.75)]',
  },
  {
    id: 'pong',
    name: 'Pong 1972',
    game: 'Atari / Pong',
    tier: 'bronze',
    chars: '│·│',
    quote: 'Bip... Bop... O clássico que começou tudo.',
    colorClass: 'text-[#E2E8F0]',
    hoverGlowClass: 'hover:drop-shadow-[0_0_5px_rgba(226,232,240,0.7)]',
  },
  {
    id: 'asteroids',
    name: 'Nave Vetorial',
    game: 'Asteroids (1979)',
    tier: 'bronze',
    chars: '◁·',
    quote: 'Cuidado com a rocha espacial vindo pela borda.',
    colorClass: 'text-[#CBD5E1]',
    hoverGlowClass: 'hover:drop-shadow-[0_0_5px_rgba(203,213,225,0.7)]',
  },
  {
    id: 'atari',
    name: 'Fuji Atari',
    game: 'Atari 2600',
    tier: 'bronze',
    chars: '⫼',
    quote: 'Have you played Atari today?',
    colorClass: 'text-[#FB923C]',
    hoverGlowClass: 'hover:drop-shadow-[0_0_5px_rgba(251,146,60,0.75)]',
  },
  {
    id: 'gameboy',
    name: 'Cartucho DMG',
    game: 'Game Boy',
    tier: 'bronze',
    chars: '[GB]',
    quote: 'Assoprou o cartucho e ligou de primeira.',
    colorClass: 'text-[#A3E635]',
    hoverGlowClass: 'hover:drop-shadow-[0_0_5px_rgba(163,230,53,0.75)]',
  },
  {
    id: 'snes',
    name: '4 Cores SNES',
    game: 'Super Famicom / SNES',
    tier: 'bronze',
    chars: '●●●●',
    quote: 'Era 16-bit no auge: Modo 7 ativado.',
    colorClass: 'text-[#A78BFA]',
    hoverGlowClass: 'hover:drop-shadow-[0_0_5px_rgba(167,139,250,0.75)]',
  },
  {
    id: 'save_floppy',
    name: 'Disquete Save',
    game: 'PC Clássico (DOS)',
    tier: 'bronze',
    chars: '[■=]',
    quote: 'Progresso salvo no disquete A: (1.44 MB).',
    colorClass: 'text-[#60A5FA]',
    hoverGlowClass: 'hover:drop-shadow-[0_0_5px_rgba(96,165,250,0.75)]',
  },
  {
    id: 'heart',
    name: 'Heart Container',
    game: 'Aventuras 8-bit',
    tier: 'bronze',
    chars: '♥',
    quote: 'Energia restaurada! +1 coração máximo.',
    colorClass: 'text-[#EF4444]',
    hoverGlowClass: 'hover:drop-shadow-[0_0_5px_rgba(239,68,68,0.8)]',
  },
  {
    id: 'oneup',
    name: '1-UP',
    game: 'Fliperama Clássico',
    tier: 'bronze',
    chars: '1UP',
    quote: 'Vida extra garantida antes do chefe!',
    colorClass: 'text-[#4ADE80]',
    hoverGlowClass: 'hover:drop-shadow-[0_0_5px_rgba(74,222,128,0.75)]',
  },
  {
    id: 'insert_coin',
    name: 'Ficha de Arcade',
    game: 'Fliperama',
    tier: 'bronze',
    chars: '[$]',
    quote: 'Crédito inserido. Continue? 9... 8... 7...',
    colorClass: 'text-[#FBBF24]',
    hoverGlowClass: 'hover:drop-shadow-[0_0_5px_rgba(251,191,36,0.75)]',
  },
  {
    id: 'press_start',
    name: 'Press Start',
    game: 'Tela Título',
    tier: 'bronze',
    chars: '▶',
    quote: 'Press Start Button to begin.',
    colorClass: 'text-[#D8DCD5]',
    hoverGlowClass: 'hover:drop-shadow-[0_0_5px_rgba(216,220,213,0.7)]',
  },

  // ======================== 20 PRATA (INCOMUNS) ========================
  {
    id: 'portal',
    name: 'Portais',
    game: 'Portal',
    tier: 'silver',
    chars: '◎─◉',
    quote: 'The cake is a lie.',
    colorClass: 'text-[#60A5FA]',
    hoverGlowClass: 'hover:drop-shadow-[0_0_6px_rgba(96,165,250,0.8)]',
  },
  {
    id: 'mgs',
    name: 'Alerta Tático',
    game: 'Metal Gear Solid',
    tier: 'silver',
    chars: '[!]',
    quote: 'Whose footprints are these?!',
    colorClass: 'text-[#EF4444]',
    hoverGlowClass: 'hover:drop-shadow-[0_0_6px_rgba(239,68,68,0.8)]',
  },
  {
    id: 'bonfire',
    name: 'Praise the Sun',
    game: 'Dark Souls',
    tier: 'silver',
    chars: '\\[T]/',
    quote: 'Praise the Sun! Fogueira acesa.',
    colorClass: 'text-[#FB923C]',
    hoverGlowClass: 'hover:drop-shadow-[0_0_6px_rgba(251,146,60,0.8)]',
  },
  {
    id: 'iddqd',
    name: 'IDDQD',
    game: 'DOOM (1993)',
    tier: 'silver',
    chars: 'IDDQD',
    quote: 'Degreelessness Mode ON. Rip and tear!',
    colorClass: 'text-[#F87171]',
    hoverGlowClass: 'hover:drop-shadow-[0_0_6px_rgba(248,113,113,0.8)]',
  },
  {
    id: 'hadouken',
    name: 'Hadouken',
    game: 'Street Fighter II',
    tier: 'silver',
    chars: '↓↘→P',
    quote: 'HADOUKEN! Combo perfeito no controle de 6 botões.',
    colorClass: 'text-[#38BDF8]',
    hoverGlowClass: 'hover:drop-shadow-[0_0_6px_rgba(56,189,248,0.8)]',
  },
  {
    id: 'fatality',
    name: 'Código Sangue',
    game: 'Mortal Kombat (Mega Drive)',
    tier: 'silver',
    chars: 'ABACABB',
    quote: 'GET OVER HERE! Código secreto ativado.',
    colorClass: 'text-[#EF4444]',
    hoverGlowClass: 'hover:drop-shadow-[0_0_6px_rgba(239,68,68,0.8)]',
  },
  {
    id: 'crowbar',
    name: 'Lambda',
    game: 'Half-Life',
    tier: 'silver',
    chars: 'λ',
    quote: 'Rise and shine, Mr. Freeman...',
    colorClass: 'text-[#F97316]',
    hoverGlowClass: 'hover:drop-shadow-[0_0_6px_rgba(249,115,22,0.8)]',
  },
  {
    id: 'megaman',
    name: 'E-Tank',
    game: 'Mega Man (NES)',
    tier: 'silver',
    chars: '[E]',
    quote: 'Tanque de energia guardado para o Dr. Wily.',
    colorClass: 'text-[#38BDF8]',
    hoverGlowClass: 'hover:drop-shadow-[0_0_6px_rgba(56,189,248,0.8)]',
  },
  {
    id: 'castlevania',
    name: 'Vampire Killer',
    game: 'Castlevania',
    tier: 'silver',
    chars: '†─═',
    quote: 'What a horrible night to have a curse.',
    colorClass: 'text-[#C084FC]',
    hoverGlowClass: 'hover:drop-shadow-[0_0_6px_rgba(192,132,252,0.8)]',
  },
  {
    id: 'metroid',
    name: 'Metroid Larva',
    game: 'Super Metroid',
    tier: 'silver',
    chars: '(◠◠)',
    quote: 'The last Metroid is in captivity. The galaxy is at peace.',
    colorClass: 'text-[#4ADE80]',
    hoverGlowClass: 'hover:drop-shadow-[0_0_6px_rgba(74,222,128,0.8)]',
  },
  {
    id: 'kirby',
    name: 'Kirby',
    game: "Kirby's Dream Land",
    tier: 'silver',
    chars: "(>'-')>",
    quote: 'Poyo! Inalou um easter egg escondido.',
    colorClass: 'text-[#F472B6]',
    hoverGlowClass: 'hover:drop-shadow-[0_0_6px_rgba(244,114,182,0.8)]',
  },
  {
    id: 'samus',
    name: 'Morph Ball',
    game: 'Metroid',
    tier: 'silver',
    chars: '((◎))',
    quote: 'Rolou pela passagem secreta no canto da tela.',
    colorClass: 'text-[#FB923C]',
    hoverGlowClass: 'hover:drop-shadow-[0_0_6px_rgba(251,146,60,0.8)]',
  },
  {
    id: 'resident',
    name: 'Ink Ribbon',
    game: 'Resident Evil (PS1)',
    tier: 'silver',
    chars: '[INK]',
    quote: 'Você usou uma fita para salvar na máquina de escrever.',
    colorClass: 'text-[#FCA5A5]',
    hoverGlowClass: 'hover:drop-shadow-[0_0_6px_rgba(252,165,165,0.8)]',
  },
  {
    id: 'silent_hill',
    name: 'Rádio Estático',
    game: 'Silent Hill',
    tier: 'silver',
    chars: '≈≈♪',
    quote: 'In my restless dreams, I see that town...',
    colorClass: 'text-[#94A3B8]',
    hoverGlowClass: 'hover:drop-shadow-[0_0_6px_rgba(148,163,184,0.8)]',
  },
  {
    id: 'crash',
    name: 'Caixa Wumpa',
    game: 'Crash Bandicoot (PS1)',
    tier: 'silver',
    chars: '[W]',
    quote: 'Woah! 100 frutas Wumpa coletadas.',
    colorClass: 'text-[#FB923C]',
    hoverGlowClass: 'hover:drop-shadow-[0_0_6px_rgba(251,146,60,0.8)]',
  },
  {
    id: 'spyro',
    name: 'Gema Roxa',
    game: 'Spyro the Dragon (PS1)',
    tier: 'silver',
    chars: '◆',
    quote: 'Sparx coletou uma gema escondida!',
    colorClass: 'text-[#C084FC]',
    hoverGlowClass: 'hover:drop-shadow-[0_0_6px_rgba(192,132,252,0.8)]',
  },
  {
    id: 'dreamcast',
    name: 'Espiral Dreamcast',
    game: 'Sega Dreamcast',
    tier: 'silver',
    chars: '＠',
    quote: "It's thinking... VMU fazendo bip no controle.",
    colorClass: 'text-[#FB923C]',
    hoverGlowClass: 'hover:drop-shadow-[0_0_6px_rgba(251,146,60,0.8)]',
  },
  {
    id: 'n64',
    name: 'Expansion Pak',
    game: 'Nintendo 64',
    tier: 'silver',
    chars: '[N64]',
    quote: 'Memória expandida para 8MB RAM!',
    colorClass: 'text-[#60A5FA]',
    hoverGlowClass: 'hover:drop-shadow-[0_0_6px_rgba(96,165,250,0.8)]',
  },
  {
    id: 'gba',
    name: 'Game Boy SP',
    game: 'Game Boy Advance SP',
    tier: 'silver',
    chars: '[_■_]',
    quote: 'Backlight ligado para jogar de madrugada.',
    colorClass: 'text-[#A78BFA]',
    hoverGlowClass: 'hover:drop-shadow-[0_0_6px_rgba(167,139,250,0.8)]',
  },
  {
    id: 'memory_card',
    name: 'Memory Card 8MB',
    game: 'PlayStation 2',
    tier: 'silver',
    chars: '[MC1]',
    quote: 'Do not remove Memory Card (8MB) while saving.',
    colorClass: 'text-[#38BDF8]',
    hoverGlowClass: 'hover:drop-shadow-[0_0_6px_rgba(56,189,248,0.8)]',
  },

  // ======================== 10 OURO (RAROS) ========================
  {
    id: 'triforce',
    name: 'Triforce',
    game: 'The Legend of Zelda',
    tier: 'gold',
    chars: ' ▲ \n▲ ▲',
    quote: "It's dangerous to go alone! Take this.",
    colorClass: 'text-[#FBBF24]',
    hoverGlowClass: 'hover:drop-shadow-[0_0_7px_rgba(251,191,36,0.9)]',
  },
  {
    id: 'missingno',
    name: 'MissingNo.',
    game: 'Pokémon Red / Blue (Glitch)',
    tier: 'gold',
    chars: '█▓▒#0',
    quote: 'A wild MissingNo. appeared! (Item x128)',
    colorClass: 'text-[#C084FC]',
    hoverGlowClass: 'hover:drop-shadow-[0_0_7px_rgba(192,132,252,0.9)]',
  },
  {
    id: 'chrono',
    name: 'Pêndulo do Tempo',
    game: 'Chrono Trigger',
    tier: 'gold',
    chars: '⧗',
    quote: 'But the future refused to change.',
    colorClass: 'text-[#FDE047]',
    hoverGlowClass: 'hover:drop-shadow-[0_0_7px_rgba(253,224,71,0.9)]',
  },
  {
    id: 'ff7_materia',
    name: 'Materia Brilhante',
    game: 'Final Fantasy VII',
    tier: 'gold',
    chars: '◈',
    quote: 'Equipou uma Materia rara no slot duplo!',
    colorClass: 'text-[#34D399]',
    hoverGlowClass: 'hover:drop-shadow-[0_0_7px_rgba(52,211,153,0.9)]',
  },
  {
    id: 'sotn',
    name: 'Castelo Invertido',
    game: 'Castlevania: SotN',
    tier: 'gold',
    chars: '☠†☠',
    quote: 'What is a man? A miserable little pile of secrets!',
    colorClass: 'text-[#F87171]',
    hoverGlowClass: 'hover:drop-shadow-[0_0_7px_rgba(248,113,113,0.9)]',
  },
  {
    id: 'shadow_colossus',
    name: 'Selo do Colosso',
    game: 'Shadow of the Colossus',
    tier: 'gold',
    chars: '❖',
    quote: 'A espada apontou para o ponto fraco secreto.',
    colorClass: 'text-[#93C5FD]',
    hoverGlowClass: 'hover:drop-shadow-[0_0_7px_rgba(147,197,253,0.9)]',
  },
  {
    id: 'earthbound',
    name: 'SMAAAASH!!',
    game: 'EarthBound (SNES)',
    tier: 'gold',
    chars: '★!★',
    quote: 'SMAAAASH!! Dano crítico lendário de 1/128.',
    colorClass: 'text-[#FBBF24]',
    hoverGlowClass: 'hover:drop-shadow-[0_0_7px_rgba(251,191,36,0.9)]',
  },
  {
    id: 'ocarina',
    name: 'Canção do Tempo',
    game: 'Zelda: Ocarina of Time',
    tier: 'gold',
    chars: '♪▲▼',
    quote: '▶ A ▼ ▶ A ▼ — Você tocou a Song of Time.',
    colorClass: 'text-[#38BDF8]',
    hoverGlowClass: 'hover:drop-shadow-[0_0_7px_rgba(56,189,248,0.9)]',
  },
  {
    id: 'neogeo',
    name: 'MVS Arcade Gold',
    game: 'SNK Neo Geo',
    tier: 'gold',
    chars: '✦MVS',
    quote: 'MAX 330 MEGA PRO-GEAR SPEC!',
    colorClass: 'text-[#FDE68A]',
    hoverGlowClass: 'hover:drop-shadow-[0_0_7px_rgba(253,230,138,0.9)]',
  },
  {
    id: 'golden_cobra',
    name: 'Cobra Dourada',
    game: 'CobraCritic Relíquia',
    tier: 'gold',
    chars: '~<:>',
    quote: 'Relíquia ancestral do Grupo dos Cobras encontrada!',
    colorClass: 'text-[#FBBF24]',
    hoverGlowClass: 'hover:drop-shadow-[0_0_7px_rgba(251,191,36,0.95)]',
  },
] as const;

export const BRONZE_EGGS = RETRO_EASTER_EGGS.filter((e) => e.tier === 'bronze');
export const SILVER_EGGS = RETRO_EASTER_EGGS.filter((e) => e.tier === 'silver');
export const GOLD_EGGS = RETRO_EASTER_EGGS.filter((e) => e.tier === 'gold');

export function hasCollectedAllEasterEggs(
  collectedIds?: readonly string[] | null,
): boolean {
  if (!Array.isArray(collectedIds) || collectedIds.length < RETRO_EASTER_EGGS.length) {
    return false;
  }
  const set = new Set(collectedIds);
  return RETRO_EASTER_EGGS.every((egg) => set.has(egg.id));
}

export function isDungeonMasterUser(
  user: User | null | undefined,
  profile: UserProfile | null | undefined,
): boolean {
  const email = (user?.email || '').trim().toLowerCase();
  const profileName = (profile?.displayName || '').trim().toLowerCase();
  const authName = (user?.displayName || '').trim().toLowerCase();
  return (
    email === 'dungeonmaster@cobracritic.local' ||
    profileName === 'dungeonmaster' ||
    authName === 'dungeonmaster'
  );
}

type CornerPosition = 'tl' | 'tr' | 'bl' | 'br';

const CORNER_POSITION_CLASSES: Record<CornerPosition, string> = {
  tl: 'top-1 left-1.5',
  tr: 'top-1 right-1.5',
  bl: 'bottom-1 left-1.5',
  br: 'bottom-1 right-1.5',
};

const KONAMI_SEQUENCE = [
  'ArrowUp',
  'ArrowUp',
  'ArrowDown',
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
  'ArrowLeft',
  'ArrowRight',
  'b',
  'a',
] as const;

function playRetroChime(kind: 'egg' | 'gold' | 'konami') {
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const notes =
      kind === 'konami'
        ? [523.25, 659.25, 783.99, 1046.5, 1318.51]
        : kind === 'gold'
          ? [659.25, 880.0, 1174.66, 1567.98]
          : [587.33, 880.0, 1174.66];
    const step = kind === 'konami' ? 0.085 : 0.068;

    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * step);
      gain.gain.setValueAtTime(0.032, ctx.currentTime + idx * step);
      gain.gain.exponentialRampToValueAtTime(
        0.0001,
        ctx.currentTime + idx * step + 0.16,
      );
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + idx * step);
      osc.stop(ctx.currentTime + idx * step + 0.18);
    });

    window.setTimeout(() => {
      ctx.close().catch(() => {});
    }, 1200);
  } catch {
    // Ignore audio context errors when autoplay is restricted
  }
}

interface EggToastState {
  egg: RetroEasterEgg;
  newlyCollected: boolean;
  totalCount: number;
  readOnly: boolean;
}

interface ActiveSpawn {
  slot: string;
  egg: RetroEasterEgg;
  corner: CornerPosition;
}

interface EasterEggContextValue {
  activeSpawn: ActiveSpawn | null;
  registerSlot: (slot: string) => () => void;
  triggerEggClick: (egg: RetroEasterEgg) => Promise<void>;
}

const EasterEggContext = createContext<EasterEggContextValue>({
  activeSpawn: null,
  registerSlot: () => () => {},
  triggerEggClick: async () => {},
});

function pickWeightedEasterEgg(collectedIds: Set<string>): RetroEasterEgg {
  const r = Math.random();
  let tierPool: readonly RetroEasterEgg[];
  if (r < EASTER_EGG_TIER_META.bronze.weight) {
    tierPool = BRONZE_EGGS;
  } else if (
    r <
    EASTER_EGG_TIER_META.bronze.weight + EASTER_EGG_TIER_META.silver.weight
  ) {
    tierPool = SILVER_EGGS;
  } else {
    tierPool = GOLD_EGGS;
  }

  const uncollectedInTier = tierPool.filter((e) => !collectedIds.has(e.id));
  const finalPool =
    uncollectedInTier.length > 0 && Math.random() < 0.75
      ? uncollectedInTier
      : tierPool;

  return finalPool[Math.floor(Math.random() * finalPool.length)];
}

interface EasterEggProviderProps {
  activeTab: ActiveTab;
  selectedGameId: string | null;
  selectedMemberId: string | null;
  children: React.ReactNode;
}

export function EasterEggProvider({
  activeTab,
  selectedGameId,
  selectedMemberId,
  children,
}: EasterEggProviderProps) {
  const { user, profile, readOnlyMode, collectEasterEgg, unlockKonamiSecret } =
    useVeredito();

  const [activeSpawn, setActiveSpawn] = useState<ActiveSpawn | null>(null);
  const [eggToast, setEggToast] = useState<EggToastState | null>(null);
  const [konamiModalOpen, setKonamiModalOpen] = useState(false);
  const [konamiNewlyUnlocked, setKonamiNewlyUnlocked] = useState(false);

  const registeredSlotsRef = useRef<Set<string>>(new Set());
  const collectedIdsRef = useRef<Set<string>>(new Set());
  const toastTimerRef = useRef<number | null>(null);
  const konamiIndexRef = useRef<number>(0);

  const collectedIds = useMemo(
    () =>
      new Set(
        Array.isArray(profile?.collectedEasterEggs)
          ? profile.collectedEasterEggs
          : [],
      ),
    [profile?.collectedEasterEggs],
  );

  useEffect(() => {
    collectedIdsRef.current = collectedIds;
  }, [collectedIds]);

  const registerSlot = useCallback((slot: string) => {
    registeredSlotsRef.current.add(slot);
    return () => {
      registeredSlotsRef.current.delete(slot);
    };
  }, []);

  const rollSpawn = useCallback(() => {
    const slots = Array.from(registeredSlotsRef.current);
    if (slots.length === 0) {
      setActiveSpawn(null);
      return;
    }

    // 80% chance on roll to hide 1 tiny egg somewhere in any mounted slot
    if (Math.random() > 0.8) {
      setActiveSpawn(null);
      return;
    }

    const slot = slots[Math.floor(Math.random() * slots.length)];
    const corners: CornerPosition[] = ['tl', 'tr', 'bl', 'br'];
    const corner = corners[Math.floor(Math.random() * corners.length)];
    const egg = pickWeightedEasterEgg(collectedIdsRef.current);

    setActiveSpawn({ slot, egg, corner });
  }, []);

  // Re-roll after navigation settles so all slots in the new view have registered
  useEffect(() => {
    const timer = window.setTimeout(() => {
      rollSpawn();
    }, 150);
    return () => window.clearTimeout(timer);
  }, [activeTab, selectedGameId, selectedMemberId, rollSpawn]);

  // Periodically relocate the hidden egg if the user stays on the same page
  useEffect(() => {
    const interval = window.setInterval(() => {
      rollSpawn();
    }, 45000);
    return () => window.clearInterval(interval);
  }, [rollSpawn]);

  // Global Konami Code listener
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable)
      ) {
        return;
      }

      if (konamiModalOpen && event.key === 'Escape') {
        setKonamiModalOpen(false);
        return;
      }

      const key =
        event.key.length === 1 ? event.key.toLowerCase() : event.key;
      const expected = KONAMI_SEQUENCE[konamiIndexRef.current];

      if (key === expected) {
        konamiIndexRef.current += 1;
        if (konamiIndexRef.current === KONAMI_SEQUENCE.length) {
          konamiIndexRef.current = 0;
          playRetroChime('konami');
          void (async () => {
            if (user && !readOnlyMode) {
              const res = await unlockKonamiSecret();
              setKonamiNewlyUnlocked(res.newlyUnlocked);
            } else {
              setKonamiNewlyUnlocked(false);
            }
            setKonamiModalOpen(true);
          })();
        }
      } else {
        konamiIndexRef.current = key === KONAMI_SEQUENCE[0] ? 1 : 0;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [konamiModalOpen, readOnlyMode, unlockKonamiSecret, user]);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current !== null) {
        window.clearTimeout(toastTimerRef.current);
      }
    };
  }, []);

  const triggerEggClick = useCallback(
    async (egg: RetroEasterEgg) => {
      playRetroChime(egg.tier === 'gold' ? 'gold' : 'egg');
      setActiveSpawn(null);

      let newlyCollected = false;
      let totalCount = collectedIdsRef.current.size;
      const isGuest = !user || readOnlyMode;

      if (!isGuest) {
        const result = await collectEasterEgg(egg.id);
        newlyCollected = result.newlyCollected;
        totalCount = result.totalCount;
      }

      setEggToast({
        egg,
        newlyCollected,
        totalCount,
        readOnly: isGuest,
      });

      if (toastTimerRef.current !== null) {
        window.clearTimeout(toastTimerRef.current);
      }
      toastTimerRef.current = window.setTimeout(() => {
        setEggToast(null);
      }, 5200);
    },
    [collectEasterEgg, readOnlyMode, user],
  );

  return (
    <EasterEggContext.Provider
      value={{ activeSpawn, registerSlot, triggerEggClick }}
    >
      {children}

      {/* Discreet Retro Collection Toast */}
      {eggToast && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-5 right-5 z-50 max-w-sm bg-[#121512] border border-[#2D382D] shadow-2xl px-4 py-3.5 text-[#F2F2EE]"
        >
          <div className="flex items-start gap-3">
            <pre
              aria-hidden="true"
              className={`font-mono text-xs leading-tight whitespace-pre shrink-0 pt-0.5 select-none ${eggToast.egg.colorClass}`}
            >
              {eggToast.egg.chars}
            </pre>
            <div className="min-w-0 flex-1 space-y-1">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 min-w-0">
                  <p className="text-[11px] font-mono uppercase tracking-wider text-[#4ADE80] truncate">
                    {eggToast.readOnly
                      ? 'Segredo Encontrado!'
                      : eggToast.newlyCollected
                        ? `Coletado (${eggToast.totalCount}/${RETRO_EASTER_EGGS.length})`
                        : `Já Coletado (${eggToast.totalCount}/${RETRO_EASTER_EGGS.length})`}
                  </p>
                  <span
                    className={`text-[10px] font-mono px-1.5 py-0.2 border rounded shrink-0 ${EASTER_EGG_TIER_META[eggToast.egg.tier].pillClass}`}
                  >
                    {EASTER_EGG_TIER_META[eggToast.egg.tier].label}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setEggToast(null)}
                  aria-label="Fechar aviso"
                  className="text-[#787D75] hover:text-[#F2F2EE] cursor-pointer shrink-0"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              <p className="text-xs font-semibold text-[#F2F2EE]">
                {eggToast.egg.name}{' '}
                <span className="font-normal text-[#8C9288]">
                  · {eggToast.egg.game}
                </span>
              </p>
              <p className="text-xs text-[#C7CBC4] italic">
                &ldquo;{eggToast.egg.quote}&rdquo;
              </p>
              {!eggToast.readOnly &&
                eggToast.newlyCollected &&
                eggToast.totalCount >= RETRO_EASTER_EGGS.length && (
                  <p className="text-[11px] font-mono text-[#FDE68A] pt-0.5">
                    50/50 completo! Badge Caçador Supremo desbloqueado no perfil.
                  </p>
                )}
              {eggToast.readOnly && (
                <p className="text-[11px] text-[#8C9288]">
                  Entre com sua conta para salvar a coleção no perfil.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Secret Konami Code Modal */}
      {konamiModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="konami-secret-title"
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-[2px] flex items-center justify-center p-4"
          onClick={() => setKonamiModalOpen(false)}
        >
          <div
            className="w-full max-w-md bg-[#121412] border border-[#D4AF37]/60 shadow-[0_0_40px_-10px_rgba(212,175,55,0.4)] text-[#F2F2EE] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-gradient-to-r from-[#1D162B] via-[#241B14] to-[#16261E] border-b border-[#D4AF37]/30 px-6 py-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <KeyRound className="w-4 h-4 text-[#FDE68A]" />
                <p className="text-[11px] font-mono uppercase tracking-[0.16em] text-[#FDE68A]">
                  ↑ ↑ ↓ ↓ ← → ← → B A
                </p>
              </div>
              <button
                type="button"
                onClick={() => setKonamiModalOpen(false)}
                aria-label="Fechar segredo"
                className="p-1 text-[#A8ACA5] hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="px-6 py-6 space-y-4 text-center">
              <div className="inline-flex items-center justify-center">
                <KonamiSecretBadge size="md" />
              </div>

              <h2
                id="konami-secret-title"
                className="font-display text-2xl font-semibold text-[#F2F2EE]"
              >
                {konamiNewlyUnlocked
                  ? 'O Maior Segredo Desbloqueado'
                  : 'Segredo Confirmado'}
              </h2>

              <p className="text-sm text-[#C7CBC4] leading-relaxed">
                Você descobriu o maior segredo do{' '}
                <strong className="text-[#F2F2EE]">CobraCritic</strong>. Um
                badge exclusivo foi gravado no seu perfil para provar sua
                descoberta.
              </p>

              <p className="text-xs font-mono text-[#FDE68A] bg-[#1C1810] border border-[#66511D] px-4 py-3">
                Shhh... Regra dos Cobras: não conte a ninguém como você
                conseguiu esse badge.
              </p>

              {(!user || readOnlyMode) && (
                <p className="text-xs text-[#8C9288]">
                  Faça login com sua conta aprovada e digite o código novamente
                  para gravar o badge no seu perfil.
                </p>
              )}

              <button
                type="button"
                onClick={() => setKonamiModalOpen(false)}
                className="w-full px-4 py-2.5 text-xs font-semibold bg-[#FDE68A] text-[#14120B] hover:bg-[#FEF08A] transition-colors cursor-pointer"
              >
                Guardar segredo
              </button>
            </div>
          </div>
        </div>
      )}
    </EasterEggContext.Provider>
  );
}

export function RetroEasterEggSlot({
  slot,
  mode = 'inline',
  cornerOverride,
  className = '',
}: {
  slot: string;
  mode?: 'inline' | 'corner';
  cornerOverride?: CornerPosition;
  className?: string;
}) {
  const { activeSpawn, registerSlot, triggerEggClick } =
    useContext(EasterEggContext);

  useEffect(() => {
    return registerSlot(slot);
  }, [slot, registerSlot]);

  if (!activeSpawn || activeSpawn.slot !== slot) {
    return null;
  }

  const { egg, corner } = activeSpawn;
  const resolvedCorner = cornerOverride ?? corner;
  const positionClass =
    mode === 'corner'
      ? `absolute ${CORNER_POSITION_CLASSES[resolvedCorner]} z-20`
      : 'inline-flex';

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        void triggerEggClick(egg);
      }}
      title={egg.name}
      aria-label={`Easter egg secreto: ${egg.name}`}
      className={`${positionClass} items-center justify-center font-mono text-[7px] sm:text-[8px] leading-[0.95] tracking-tight whitespace-pre select-none opacity-[0.18] hover:opacity-100 hover:scale-125 transition-all duration-300 cursor-pointer px-0.5 py-0.5 rounded focus:outline-none ${egg.colorClass} ${egg.hoverGlowClass} ${className}`}
    >
      {egg.chars}
    </button>
  );
}

export function KonamiSecretBadge({
  size = 'md',
}: {
  size?: 'sm' | 'md';
}) {
  const title =
    'Descobriu o maior segredo da plataforma. Shhh... não conte a ninguém!';
  if (size === 'sm') {
    return (
      <span
        title={title}
        className="inline-flex items-center gap-1 text-[10px] font-mono px-1.5 py-0.5 rounded border border-[#D4AF37]/60 bg-gradient-to-r from-[#1D162B] via-[#241B14] to-[#16261E] text-[#FDE68A] shrink-0"
      >
        <Sparkles className="w-2.5 h-2.5 text-[#FDE68A] shrink-0" />
        <span>Segredo</span>
      </span>
    );
  }

  return (
    <span
      title={title}
      className="inline-flex items-center gap-1.5 text-[11px] font-mono px-2.5 py-0.5 rounded border border-[#D4AF37]/60 bg-gradient-to-r from-[#1D162B] via-[#241B14] to-[#16261E] text-[#FDE68A] shadow-[0_0_16px_-6px_rgba(212,175,55,0.6)] shrink-0"
    >
      <KeyRound className="w-3 h-3 text-[#FDE68A] shrink-0" />
      <span>Guardião do Segredo</span>
    </span>
  );
}

export function EasterEggMasterBadge({
  size = 'md',
}: {
  size?: 'sm' | 'md';
}) {
  const title = `Coletou todos os ${RETRO_EASTER_EGGS.length} Easter Eggs secretos do CobraCritic!`;
  if (size === 'sm') {
    return (
      <span
        title={title}
        className="inline-flex items-center gap-1 text-[10px] font-mono px-1.5 py-0.5 rounded border border-[#4ADE80]/60 bg-gradient-to-r from-[#102619] via-[#1C2414] to-[#29200F] text-[#86EFAC] shrink-0"
      >
        <Crown className="w-2.5 h-2.5 text-[#FDE68A] shrink-0" />
        <span>50/50</span>
      </span>
    );
  }

  return (
    <span
      title={title}
      className="inline-flex items-center gap-1.5 text-[11px] font-mono px-2.5 py-0.5 rounded border border-[#4ADE80]/60 bg-gradient-to-r from-[#102619] via-[#1C2414] to-[#29200F] text-[#86EFAC] shadow-[0_0_16px_-6px_rgba(74,222,128,0.55)] shrink-0"
    >
      <Crown className="w-3 h-3 text-[#FDE68A] shrink-0" />
      <span>Caçador Supremo (50/50)</span>
    </span>
  );
}

export function EasterEggDetailModal({
  egg,
  onClose,
  onRemove,
}: {
  egg: RetroEasterEgg | null;
  onClose: () => void;
  onRemove?: (eggId: EasterEggId) => Promise<void>;
}) {
  const { user, profile } = useVeredito();
  const [removing, setRemoving] = useState(false);
  const canRemove = Boolean(onRemove && isDungeonMasterUser(user, profile));

  useEffect(() => {
    setRemoving(false);
  }, [egg]);

  useEffect(() => {
    if (!egg) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [egg, onClose]);

  if (!egg) return null;
  const tierMeta = EASTER_EGG_TIER_META[egg.tier];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="easter-egg-detail-title"
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-[2px] flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className={`w-full max-w-md bg-[#121512] border ${tierMeta.cardBorderClass} shadow-2xl text-[#F2F2EE] overflow-hidden`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-[#141714] border-b border-[#232723] px-5 py-3.5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-[11px] font-mono uppercase tracking-wider text-[#4ADE80] shrink-0">
              Easter Egg Coletado
            </span>
            <span
              className={`text-[10px] font-mono px-1.5 py-0.2 border rounded shrink-0 ${tierMeta.pillClass}`}
            >
              {tierMeta.label}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar detalhes do easter egg"
            className="p-1 text-[#8C9288] hover:text-[#F2F2EE] cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 bg-[#0C0E0C] border border-[#232723] flex items-center justify-center shrink-0">
              <pre
                className={`font-mono text-sm leading-tight whitespace-pre select-none ${egg.colorClass}`}
              >
                {egg.chars}
              </pre>
            </div>

            <div className="min-w-0 flex-1 space-y-1">
              <h3
                id="easter-egg-detail-title"
                className="font-display text-lg font-semibold text-[#F2F2EE]"
              >
                {egg.name}
              </h3>
              <p className="text-xs text-[#90968C]">
                {egg.game} · {tierMeta.chanceHint}
              </p>
              <p className="text-xs text-[#C7CBC4] italic pt-1 leading-relaxed">
                &ldquo;{egg.quote}&rdquo;
              </p>
            </div>
          </div>

          <div className="pt-2 border-t border-[#202420] flex items-center justify-between gap-2">
            {canRemove && onRemove ? (
              <button
                type="button"
                disabled={removing}
                onClick={async () => {
                  setRemoving(true);
                  try {
                    await onRemove(egg.id);
                  } finally {
                    setRemoving(false);
                  }
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-[#221313] border border-[#5B2121] text-[#FCA5A5] hover:bg-[#2F1818] transition-colors cursor-pointer disabled:opacity-50"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{removing ? 'Apagando...' : 'Apagar dos coletados'}</span>
              </button>
            ) : (
              <span />
            )}

            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 text-xs font-medium bg-[#1B1F1B] border border-[#2E352E] text-[#F2F2EE] hover:border-[#4ADE80]/60 transition-colors cursor-pointer"
            >
              Fechar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function DungeonMasterEasterEggCatalog({
  collectedIds = [],
}: {
  collectedIds?: string[];
}) {
  const {
    user,
    profile,
    removeEasterEgg,
    clearCollectedEasterEggs,
    clearKonamiSecret,
  } = useVeredito();
  const [tierFilter, setTierFilter] = useState<'all' | EasterEggTier>('all');
  const [search, setSearch] = useState('');
  const [confirmClearAll, setConfirmClearAll] = useState(false);
  const [confirmClearKonami, setConfirmClearKonami] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const isDungeonMaster = isDungeonMasterUser(user, profile);
  const collectedSet = useMemo(() => new Set(collectedIds), [collectedIds]);

  const filteredEggs = useMemo(() => {
    const q = search.trim().toLowerCase();
    return RETRO_EASTER_EGGS.filter((egg) => {
      if (tierFilter !== 'all' && egg.tier !== tierFilter) return false;
      if (!q) return true;
      return (
        egg.name.toLowerCase().includes(q) ||
        egg.game.toLowerCase().includes(q) ||
        egg.quote.toLowerCase().includes(q) ||
        egg.id.toLowerCase().includes(q)
      );
    });
  }, [tierFilter, search]);

  if (!isDungeonMaster) return null;

  const bronzeCollected = BRONZE_EGGS.filter((e) =>
    collectedSet.has(e.id),
  ).length;
  const silverCollected = SILVER_EGGS.filter((e) =>
    collectedSet.has(e.id),
  ).length;
  const goldCollected = GOLD_EGGS.filter((e) => collectedSet.has(e.id)).length;

  return (
    <section
      aria-label="Catálogo Mestre de Easter Eggs"
      className="bg-[#141614] border border-[#2C332C] p-6 space-y-5"
    >
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[#222622] pb-4">
        <div className="space-y-1">
          <p className="text-[11px] font-mono uppercase tracking-wider text-[#FBBF24]">
            Visível apenas para dungeonmaster
          </p>
          <h2 className="font-display text-xl font-semibold text-[#F2F2EE]">
            Catálogo Completo de Easter Eggs ({RETRO_EASTER_EGGS.length})
          </h2>
          <p className="text-xs text-[#8C9288]">
            Todos os 50 segredos ocultos na UI com suas respectivas chances de
            aparição.
          </p>
        </div>

        <div className="flex flex-col items-end gap-2">
          <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono">
            <span
              className={`px-2 py-1 border rounded ${EASTER_EGG_TIER_META.bronze.pillClass}`}
            >
              Bronze: {bronzeCollected}/{BRONZE_EGGS.length}
            </span>
            <span
              className={`px-2 py-1 border rounded ${EASTER_EGG_TIER_META.silver.pillClass}`}
            >
              Prata: {silverCollected}/{SILVER_EGGS.length}
            </span>
            <span
              className={`px-2 py-1 border rounded ${EASTER_EGG_TIER_META.gold.pillClass}`}
            >
              Ouro: {goldCollected}/{GOLD_EGGS.length}
            </span>
          </div>

          {(collectedIds.length > 0 || profile?.konamiUnlocked) && (
            <div className="flex flex-wrap items-center justify-end gap-2">
              {profile?.konamiUnlocked && (
                <div className="flex items-center gap-2">
                  {confirmClearKonami ? (
                    <>
                      <button
                        type="button"
                        disabled={busyId === '__konami__'}
                        onClick={async () => {
                          setBusyId('__konami__');
                          try {
                            await clearKonamiSecret();
                            setConfirmClearKonami(false);
                          } finally {
                            setBusyId(null);
                          }
                        }}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium bg-[#7F1D1D] border border-[#B91C1C] text-white rounded hover:bg-[#991B1B] cursor-pointer disabled:opacity-50"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>
                          {busyId === '__konami__'
                            ? 'Apagando...'
                            : 'Confirmar apagar selo'}
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmClearKonami(false)}
                        className="px-2 py-1 text-[11px] text-[#8C9288] hover:text-[#F2F2EE] cursor-pointer"
                      >
                        Cancelar
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmClearKonami(true)}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium bg-[#1D162B] border border-[#D4AF37]/50 text-[#FDE68A] rounded hover:border-[#F87171] hover:text-[#FCA5A5] transition-colors cursor-pointer"
                    >
                      <KeyRound className="w-3 h-3" />
                      <span>Apagar selo de segredo</span>
                    </button>
                  )}
                </div>
              )}

              {collectedIds.length > 0 && (
                <div className="flex items-center gap-2">
                  {confirmClearAll ? (
                    <>
                      <button
                        type="button"
                        disabled={busyId === '__all__'}
                        onClick={async () => {
                          setBusyId('__all__');
                          try {
                            await clearCollectedEasterEggs();
                            setConfirmClearAll(false);
                          } finally {
                            setBusyId(null);
                          }
                        }}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium bg-[#7F1D1D] border border-[#B91C1C] text-white rounded hover:bg-[#991B1B] cursor-pointer disabled:opacity-50"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>
                          {busyId === '__all__'
                            ? 'Apagando...'
                            : `Confirmar zerar (${collectedIds.length})`}
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmClearAll(false)}
                        className="px-2 py-1 text-[11px] text-[#8C9288] hover:text-[#F2F2EE] cursor-pointer"
                      >
                        Cancelar
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmClearAll(true)}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium bg-[#1C1212] border border-[#4A2020] text-[#FCA5A5] rounded hover:border-[#F87171] transition-colors cursor-pointer"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Apagar todos coletados ({collectedIds.length})</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-3.5 h-3.5 text-[#787D75] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filtrar por nome, jogo ou frase..."
            aria-label="Buscar easter egg no catálogo mestre"
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-[#0C0D0C] border border-[#2A2F2A] rounded-md text-[#F2F2EE] placeholder:text-[#787D75] focus:outline-none focus:border-[#4ADE80]"
          />
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {(
            [
              { id: 'all', label: `Todos (${RETRO_EASTER_EGGS.length})` },
              { id: 'bronze', label: `Bronze (${BRONZE_EGGS.length})` },
              { id: 'silver', label: `Prata (${SILVER_EGGS.length})` },
              { id: 'gold', label: `Ouro (${GOLD_EGGS.length})` },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setTierFilter(tab.id)}
              className={`px-2.5 py-1.5 text-xs font-medium rounded-md border transition-colors cursor-pointer ${
                tierFilter === tab.id
                  ? 'bg-[#F2F2EE] text-[#0C0D0C] border-[#F2F2EE]'
                  : 'bg-[#0C0D0C] border-[#262A26] text-[#A8ACA5] hover:text-[#F2F2EE]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {filteredEggs.length === 0 ? (
        <p className="text-xs text-[#8C9288] py-4 text-center">
          Nenhum easter egg encontrado para esse filtro.
        </p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[540px] overflow-y-auto pr-1">
          {filteredEggs.map((egg) => {
            const tierMeta = EASTER_EGG_TIER_META[egg.tier];
            const collected = collectedSet.has(egg.id);
            return (
              <div
                key={egg.id}
                className={`bg-[#0E100E] border p-3.5 flex items-start gap-3 ${tierMeta.cardBorderClass}`}
              >
                <div className="w-12 h-11 bg-[#141714] border border-[#232723] flex items-center justify-center shrink-0">
                  <pre
                    className={`font-mono text-[10px] leading-tight whitespace-pre ${egg.colorClass}`}
                  >
                    {egg.chars}
                  </pre>
                </div>

                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex flex-wrap items-center justify-between gap-1.5">
                    <p className="text-xs font-semibold text-[#F2F2EE] truncate">
                      {egg.name}
                    </p>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {collected && (
                        <>
                          <span className="text-[10px] font-mono text-[#4ADE80]">
                            Coletado
                          </span>
                          <button
                            type="button"
                            disabled={busyId === egg.id}
                            onClick={async () => {
                              setBusyId(egg.id);
                              try {
                                await removeEasterEgg(egg.id);
                              } finally {
                                setBusyId(null);
                              }
                            }}
                            title={`Apagar ${egg.name} dos coletados para teste`}
                            aria-label={`Apagar ${egg.name} dos coletados`}
                            className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-mono border border-[#4A2020] bg-[#1C1212] text-[#FCA5A5] rounded hover:border-[#F87171] cursor-pointer disabled:opacity-50"
                          >
                            <Trash2 className="w-2.5 h-2.5" />
                            <span>{busyId === egg.id ? '...' : 'Apagar'}</span>
                          </button>
                        </>
                      )}
                      <span
                        className={`text-[10px] font-mono px-1.5 py-0.2 border rounded ${tierMeta.pillClass}`}
                      >
                        {tierMeta.label}
                      </span>
                    </div>
                  </div>
                  <p className="text-[11px] text-[#8C9288]">
                    {egg.game} · {tierMeta.chanceHint}
                  </p>
                  <p className="text-[11px] text-[#C7CBC4] italic line-clamp-2">
                    &ldquo;{egg.quote}&rdquo;
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
