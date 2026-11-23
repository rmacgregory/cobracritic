import type { Game, Review } from '../types';

export interface CommonGameComparison {
  gameId: string;
  gameTitle: string;
  myScore: number;
  theirScore: number;
  diff: number;
}

export interface MemberTasteAffinity {
  affinityPct: number;
  label: string;
  accentClass: string;
  barClass: string;
  commonCount: number;
  avgDiff: number;
  closestGame: CommonGameComparison | null;
  mostDivergentGame: CommonGameComparison | null;
  commonGames: CommonGameComparison[];
}

export function computeTasteAffinity(
  myUid: string | null | undefined,
  otherUid: string,
  allReviews: Review[],
  gamesById: Map<string, Game>,
): MemberTasteAffinity | null {
  if (!myUid || myUid === otherUid) return null;

  const myReviewsByGame = new Map<string, Review>();
  const theirReviewsByGame = new Map<string, Review>();

  for (const r of allReviews) {
    if (r.authorId === myUid) {
      myReviewsByGame.set(r.gameId, r);
    } else if (r.authorId === otherUid) {
      theirReviewsByGame.set(r.gameId, r);
    }
  }

  const commonGames: CommonGameComparison[] = [];
  for (const [gameId, myRev] of myReviewsByGame.entries()) {
    const theirRev = theirReviewsByGame.get(gameId);
    if (!theirRev) continue;
    const gameTitle = gamesById.get(gameId)?.title || myRev.gameTitle || theirRev.gameTitle;
    commonGames.push({
      gameId,
      gameTitle,
      myScore: myRev.score,
      theirScore: theirRev.score,
      diff: Math.abs(myRev.score - theirRev.score),
    });
  }

  if (commonGames.length === 0) return null;

  const avgDiff =
    commonGames.reduce((sum, item) => sum + item.diff, 0) / commonGames.length;
  const affinityPct = Math.round(Math.max(0, Math.min(100, 100 - avgDiff)));

  const sortedByDiff = [...commonGames].sort((a, b) => a.diff - b.diff);
  const closestGame = sortedByDiff[0] || null;
  const mostDivergentGame =
    sortedByDiff.length > 1 ? sortedByDiff[sortedByDiff.length - 1] : null;

  let label = 'Polos opostos';
  let accentClass = 'text-[#F87171]';
  let barClass = 'bg-[#EF4444]';

  if (affinityPct >= 90) {
    label = 'Almas gêmeas';
    accentClass = 'text-[#4ADE80]';
    barClass = 'bg-[#16A34A]';
  } else if (affinityPct >= 78) {
    label = 'Sintonia alta';
    accentClass = 'text-[#4ADE80]';
    barClass = 'bg-[#22C55E]';
  } else if (affinityPct >= 65) {
    label = 'Gosto parecido';
    accentClass = 'text-[#60A5FA]';
    barClass = 'bg-[#3B82F6]';
  } else if (affinityPct >= 50) {
    label = 'Opiniões divididas';
    accentClass = 'text-[#FBBF24]';
    barClass = 'bg-[#D97706]';
  }

  return {
    affinityPct,
    label,
    accentClass,
    barClass,
    commonCount: commonGames.length,
    avgDiff: Number(avgDiff.toFixed(1)),
    closestGame,
    mostDivergentGame,
    commonGames: sortedByDiff,
  };
}
