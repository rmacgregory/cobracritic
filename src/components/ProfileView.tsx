import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  Camera,
  LogOut,
  Plus,
  X,
} from 'lucide-react';
import { useVeredito } from '../context/VereditoContext';
import { LIMITS, type GameWithStats, type Review } from '../types';
import { AvatarCropModal } from './AvatarCropModal';
import { ReviewCard } from './ReviewCard';

interface ProfileViewProps {
  onSelectGame: (gameId: string) => void;
  onEditReview: (game: GameWithStats, review: Review) => void;
}

export function ProfileView({ onSelectGame, onEditReview }: ProfileViewProps) {
  const {
    user,
    profile,
    gamesWithStats,
    reviews,
    comments,
    updateUserProfile,
    signOutUser,
  } = useVeredito();

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [displayName, setDisplayName] = useState(
    profile?.displayName || user?.displayName || '',
  );
  const [bio, setBio] = useState(profile?.bio || '');
  const [topFiveGames, setTopFiveGames] = useState<string[]>(
    profile?.topFiveGames || [],
  );
  const [newGameTitle, setNewGameTitle] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);

  const [cropSourceUrl, setCropSourceUrl] = useState<string | null>(null);
  const [avatarError, setAvatarError] = useState<string | null>(null);

  const [saving, setSaving] = useState(false);
  const [savedNotice, setSavedNotice] = useState(false);

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.displayName);
      setBio(profile.bio);
      setTopFiveGames(profile.topFiveGames || []);
    }
  }, [profile]);

  const gamesById = useMemo(() => {
    const map = new Map<string, GameWithStats>();
    for (const g of gamesWithStats) map.set(g.id, g);
    return map;
  }, [gamesWithStats]);

  const gameByLowerTitle = useMemo(() => {
    const map = new Map<string, GameWithStats>();
    for (const g of gamesWithStats) map.set(g.title.toLowerCase(), g);
    return map;
  }, [gamesWithStats]);

  const catalogSuggestions = useMemo(() => {
    const q = newGameTitle.trim().toLowerCase();
    if (!q) return [];
    const existingLower = new Set(topFiveGames.map((t) => t.toLowerCase()));
    return gamesWithStats
      .filter(
        (g) =>
          g.title.toLowerCase().includes(q) &&
          !existingLower.has(g.title.toLowerCase()),
      )
      .slice(0, 5);
  }, [gamesWithStats, newGameTitle, topFiveGames]);

  const myReviews = useMemo(() => {
    if (!user) return [];
    return reviews.filter((r) => r.authorId === user.uid);
  }, [reviews, user]);

  const myGamesCount = useMemo(() => {
    if (!user) return 0;
    return gamesWithStats.filter((g) => g.createdBy === user.uid).length;
  }, [gamesWithStats, user]);

  const myCommentsCount = useMemo(() => {
    if (!user) return 0;
    return comments.filter((c) => c.authorId === user.uid).length;
  }, [comments, user]);

  const myAverageScore = useMemo(() => {
    if (myReviews.length === 0) return null;
    const sum = myReviews.reduce((acc, r) => acc + r.score, 0);
    return Math.round(sum / myReviews.length);
  }, [myReviews]);

  const currentPhoto = profile?.photoURL || user?.photoURL || '';
  const shownName = profile?.displayName || user?.displayName || 'Seu Perfil';
  const initials = shownName
    .split(' ')
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase();

  const handleAddTopGame = (titleToAdd?: string) => {
    const value = (titleToAdd ?? newGameTitle)
      .trim()
      .slice(0, LIMITS.TOP_FIVE_TITLE_MAX);
    if (!value || topFiveGames.length >= LIMITS.TOP_FIVE_MAX) return;
    if (topFiveGames.some((g) => g.toLowerCase() === value.toLowerCase())) {
      setNewGameTitle('');
      setShowSuggestions(false);
      return;
    }
    setTopFiveGames((prev) => [...prev, value]);
    setNewGameTitle('');
    setShowSuggestions(false);
    setSavedNotice(false);
  };

  const handleRemoveTopGame = (index: number) => {
    setTopFiveGames((prev) => prev.filter((_, idx) => idx !== index));
    setSavedNotice(false);
  };

  const handleMoveTopGame = (index: number, direction: -1 | 1) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= topFiveGames.length) return;
    setTopFiveGames((prev) => {
      const next = [...prev];
      const temp = next[index];
      next[index] = next[targetIndex];
      next[targetIndex] = temp;
      return next;
    });
    setSavedNotice(false);
  };

  const handleAvatarFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    setAvatarError(null);
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setAvatarError('Selecione um arquivo de imagem (JPG, PNG ou WebP).');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setAvatarError('Escolha uma imagem menor que 10 MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setCropSourceUrl(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleConfirmAvatarCrop = async (croppedDataUrl: string) => {
    await updateUserProfile({
      displayName: displayName.trim() || shownName,
      bio: bio.trim(),
      topFiveGames,
      photoURL: croppedDataUrl,
    });
    setSavedNotice(true);
  };

  const handleRemoveAvatar = async () => {
    setSaving(true);
    try {
      await updateUserProfile({
        displayName: displayName.trim() || shownName,
        bio: bio.trim(),
        topFiveGames,
        photoURL: '',
      });
      setSavedNotice(true);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim()) return;
    setSaving(true);
    setSavedNotice(false);
    try {
      await updateUserProfile({
        displayName: displayName.trim(),
        bio: bio.trim(),
        topFiveGames,
      });
      setSavedNotice(true);
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="max-w-[1140px] mx-auto px-4 sm:px-8 py-8 space-y-10">
      {/* Header with circular avatar + sign out */}
      <div className="border-b border-[#232723] pb-6 flex flex-wrap items-center justify-between gap-6">
        <div className="flex items-center gap-5 min-w-0">
          <div className="relative shrink-0">
            {currentPhoto ? (
              <img
                src={currentPhoto}
                alt={shownName}
                referrerPolicy="no-referrer"
                className="w-20 h-20 rounded-full object-cover border-2 border-[#2F352F]"
              />
            ) : (
              <div className="w-20 h-20 rounded-full bg-[#1C201C] border-2 border-[#2F352F] text-[#F2F2EE] text-xl font-semibold flex items-center justify-center">
                {initials}
              </div>
            )}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              aria-label="Alterar foto de avatar"
              title="Alterar foto de avatar (300×300)"
              className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-[#F2F2EE] text-[#0C0D0C] border-2 border-[#0C0D0C] flex items-center justify-center hover:bg-white transition-colors cursor-pointer"
            >
              <Camera className="w-3.5 h-3.5" />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={handleAvatarFileSelected}
              className="hidden"
            />
          </div>

          <div className="min-w-0">
            <p className="text-xs font-mono uppercase tracking-[0.15em] text-[#4ADE80]">
              Perfil do Cobra
            </p>
            <h1 className="font-serif text-3xl sm:text-4xl font-medium text-[#F2F2EE] mt-0.5 truncate">
              {shownName}
            </h1>
            <div className="flex flex-wrap items-center gap-3 mt-1.5">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="text-xs font-medium text-[#4ADE80] hover:underline cursor-pointer"
              >
                Alterar avatar (recorte 300×300)
              </button>
              {currentPhoto && (
                <>
                  <span className="text-[#3A403A]" aria-hidden="true">
                    ·
                  </span>
                  <button
                    type="button"
                    onClick={handleRemoveAvatar}
                    disabled={saving}
                    className="text-xs text-[#8C9288] hover:text-[#F87171] cursor-pointer"
                  >
                    Remover foto
                  </button>
                </>
              )}
            </div>
            {avatarError && (
              <p className="text-xs text-[#F87171] mt-1" role="alert">
                {avatarError}
              </p>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={signOutUser}
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium border border-[#2F352F] bg-[#141614] text-[#F2F2EE] rounded-md hover:border-[#666B63] transition-colors cursor-pointer shrink-0"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Sair da conta</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left column: stats + edit profile + TOP 5 */}
        <section className="lg:col-span-5 space-y-6">
          <div className="bg-[#141614] border border-[#262A26] p-6 space-y-4">
            <h2 className="font-serif text-lg font-medium text-[#F2F2EE]">
              Resumo Pessoal
            </h2>
            <dl className="grid grid-cols-2 gap-4 pt-2 border-t border-[#222622]">
              <div>
                <dt className="text-xs text-[#8C9288]">Críticas</dt>
                <dd className="font-mono text-2xl font-semibold text-[#F2F2EE] tabular-nums mt-0.5">
                  {myReviews.length}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-[#8C9288]">Média dada</dt>
                <dd className="font-mono text-2xl font-semibold text-[#F2F2EE] tabular-nums mt-0.5">
                  {myAverageScore !== null ? myAverageScore : '—'}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-[#8C9288]">Jogos cadastrados</dt>
                <dd className="font-mono text-2xl font-semibold text-[#F2F2EE] tabular-nums mt-0.5">
                  {myGamesCount}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-[#8C9288]">Comentários</dt>
                <dd className="font-mono text-2xl font-semibold text-[#F2F2EE] tabular-nums mt-0.5">
                  {myCommentsCount}
                </dd>
              </div>
            </dl>
          </div>

          <form
            onSubmit={handleSaveProfile}
            className="bg-[#141614] border border-[#262A26] p-6 space-y-5"
          >
            <h2 className="font-serif text-lg font-medium text-[#F2F2EE]">
              Editar Perfil Público
            </h2>

            <div>
              <label
                htmlFor="profile-name"
                className="block text-xs font-medium text-[#A8ACA5] mb-1.5"
              >
                Nome exibido no CobraCritic
              </label>
              <input
                id="profile-name"
                type="text"
                required
                maxLength={LIMITS.DISPLAY_NAME_MAX}
                value={displayName}
                onChange={(e) => {
                  setDisplayName(e.target.value);
                  setSavedNotice(false);
                }}
                className="w-full px-3.5 py-2 text-sm bg-[#0C0D0C] border border-[#2C312C] rounded-md text-[#F2F2EE] focus:outline-none focus:border-[#4ADE80]"
              />
            </div>

            <div>
              <label
                htmlFor="profile-bio"
                className="block text-xs font-medium text-[#A8ACA5] mb-1.5"
              >
                Bio curta ({bio.length}/{LIMITS.BIO_MAX})
              </label>
              <textarea
                id="profile-bio"
                rows={3}
                maxLength={LIMITS.BIO_MAX}
                value={bio}
                onChange={(e) => {
                  setBio(e.target.value);
                  setSavedNotice(false);
                }}
                placeholder="Ex.: Fã de RPGs de turno e soulslikes difíceis demais."
                className="w-full px-3.5 py-2 text-sm bg-[#0C0D0C] border border-[#2C312C] rounded-md text-[#F2F2EE] placeholder:text-[#666B63] focus:outline-none focus:border-[#4ADE80]"
              />
            </div>

            {/* TOP 5 Jogos da Vida */}
            <div className="pt-4 border-t border-[#222622] space-y-3">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="top-five-input"
                  className="text-xs font-medium text-[#F2F2EE]"
                >
                  TOP 5 Jogos da Vida
                </label>
                <span className="font-mono text-xs text-[#8C9288] tabular-nums">
                  {topFiveGames.length}/{LIMITS.TOP_FIVE_MAX}
                </span>
              </div>

              {topFiveGames.length > 0 ? (
                <ol className="divide-y divide-[#202420] border border-[#262A26] bg-[#0C0D0C]">
                  {topFiveGames.map((gameTitle, index) => {
                    const matchedGame = gameByLowerTitle.get(gameTitle.toLowerCase());
                    return (
                      <li
                        key={`${gameTitle}-${index}`}
                        className="px-3 py-2.5 flex items-center justify-between gap-2"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="font-mono text-xs font-semibold text-[#4ADE80] tabular-nums w-5 shrink-0">
                            {String(index + 1).padStart(2, '0')}
                          </span>
                          {matchedGame ? (
                            <button
                              type="button"
                              onClick={() => onSelectGame(matchedGame.id)}
                              className="text-sm text-[#F2F2EE] hover:text-[#4ADE80] truncate text-left cursor-pointer"
                            >
                              {gameTitle}
                            </button>
                          ) : (
                            <span className="text-sm text-[#F2F2EE] truncate">
                              {gameTitle}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleMoveTopGame(index, -1)}
                            disabled={index === 0}
                            aria-label={`Subir ${gameTitle}`}
                            className="p-1 text-[#8C9288] hover:text-[#F2F2EE] disabled:opacity-30 cursor-pointer"
                          >
                            <ArrowUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleMoveTopGame(index, 1)}
                            disabled={index === topFiveGames.length - 1}
                            aria-label={`Descer ${gameTitle}`}
                            className="p-1 text-[#8C9288] hover:text-[#F2F2EE] disabled:opacity-30 cursor-pointer"
                          >
                            <ArrowDown className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemoveTopGame(index)}
                            aria-label={`Remover ${gameTitle}`}
                            className="p-1 text-[#8C9288] hover:text-[#F87171] cursor-pointer"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </li>
                    );
                  })}
                </ol>
              ) : (
                <p className="text-xs text-[#787D75]">
                  Adicione até 5 jogos marcantes da sua vida para exibir no seu perfil dos
                  Cobras.
                </p>
              )}

              {topFiveGames.length < LIMITS.TOP_FIVE_MAX && (
                <div className="relative">
                  <div className="flex items-center gap-2">
                    <input
                      id="top-five-input"
                      type="text"
                      maxLength={LIMITS.TOP_FIVE_TITLE_MAX}
                      value={newGameTitle}
                      onFocus={() => setShowSuggestions(true)}
                      onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                      onChange={(e) => {
                        setNewGameTitle(e.target.value);
                        setShowSuggestions(true);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddTopGame();
                        }
                      }}
                      placeholder="Digite um jogo (ex.: Chrono Trigger, Elden Ring)..."
                      className="flex-1 px-3 py-2 text-xs bg-[#0C0D0C] border border-[#2C312C] rounded-md text-[#F2F2EE] placeholder:text-[#666B63] focus:outline-none focus:border-[#4ADE80]"
                    />
                    <button
                      type="button"
                      onClick={() => handleAddTopGame()}
                      disabled={!newGameTitle.trim()}
                      className="inline-flex items-center gap-1 px-3 py-2 text-xs font-medium bg-[#1F241F] border border-[#2F352F] text-[#F2F2EE] rounded-md hover:border-[#4ADE80] disabled:opacity-40 whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Adicionar</span>
                    </button>
                  </div>

                  {showSuggestions && catalogSuggestions.length > 0 && (
                    <ul className="absolute left-0 right-0 mt-1 z-20 bg-[#181B18] border border-[#2F352F] rounded-md overflow-hidden shadow-xl divide-y divide-[#222622]">
                      {catalogSuggestions.map((g) => (
                        <li key={g.id}>
                          <button
                            type="button"
                            onMouseDown={(e) => {
                              e.preventDefault();
                              handleAddTopGame(g.title);
                            }}
                            className="w-full px-3 py-2 text-left text-xs text-[#F2F2EE] hover:bg-[#222622] flex items-center justify-between gap-2 cursor-pointer"
                          >
                            <span className="truncate">{g.title}</span>
                            <span className="text-[11px] text-[#8C9288] font-mono shrink-0">
                              {g.releaseYear}
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>

            <div className="flex items-center justify-between gap-3 pt-2 border-t border-[#222622]">
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 text-xs font-semibold bg-[#F2F2EE] text-[#0C0D0C] rounded-md hover:bg-white disabled:opacity-50 transition-colors cursor-pointer"
              >
                {saving ? 'Salvando...' : 'Salvar perfil'}
              </button>
              {savedNotice && (
                <span className="text-xs text-[#4ADE80] font-medium">
                  Perfil atualizado
                </span>
              )}
            </div>
          </form>
        </section>

        {/* Right column: TOP 5 showcase + Published Reviews */}
        <section className="lg:col-span-7 space-y-8">
          {(profile?.topFiveGames || []).length > 0 && (
            <div className="bg-[#141614] border border-[#262A26] p-6 space-y-4">
              <div className="flex items-baseline justify-between gap-4">
                <h2 className="font-serif text-xl font-medium text-[#F2F2EE]">
                  TOP 5 Jogos da Vida
                </h2>
                <span className="text-xs font-mono text-[#787D75]">
                  Hall pessoal
                </span>
              </div>
              <ol className="divide-y divide-[#202420]">
                {(profile?.topFiveGames || []).map((title, idx) => {
                  const catalogMatch = gameByLowerTitle.get(title.toLowerCase());
                  return (
                    <li
                      key={`${title}-${idx}`}
                      className="py-3 first:pt-1 last:pb-0 flex items-center justify-between gap-4"
                    >
                      <div className="flex items-baseline gap-3.5 min-w-0">
                        <span className="font-mono text-sm font-semibold text-[#4ADE80] tabular-nums w-6 shrink-0">
                          {String(idx + 1).padStart(2, '0')}
                        </span>
                        {catalogMatch ? (
                          <button
                            type="button"
                            onClick={() => onSelectGame(catalogMatch.id)}
                            className="font-serif text-base text-[#F2F2EE] hover:text-[#4ADE80] truncate text-left cursor-pointer"
                          >
                            {title}
                          </button>
                        ) : (
                          <span className="font-serif text-base text-[#F2F2EE] truncate">
                            {title}
                          </span>
                        )}
                      </div>
                      {catalogMatch && (
                        <span className="text-xs font-mono text-[#8C9288] shrink-0">
                          No catálogo
                        </span>
                      )}
                    </li>
                  );
                })}
              </ol>
            </div>
          )}

          <div className="space-y-6">
            <h2 className="font-serif text-2xl font-medium text-[#F2F2EE]">
              Minhas Críticas Publicadas
            </h2>

            {myReviews.length === 0 ? (
              <div className="border border-[#262A26] bg-[#141614] p-10 text-center space-y-2">
                <p className="font-serif text-xl text-[#F2F2EE]">
                  Você ainda não publicou nenhuma crítica
                </p>
                <p className="text-sm text-[#90968C]">
                  Escolha um jogo no catálogo para registrar sua nota e opinião.
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {myReviews.map((review) => {
                  const game = gamesById.get(review.gameId) || null;
                  return (
                    <ReviewCard
                      key={review.id}
                      review={review}
                      game={game}
                      showGameHeader
                      defaultCommentsOpen={false}
                      onSelectGame={onSelectGame}
                      onEditReview={
                        game ? (rev) => onEditReview(game, rev) : undefined
                      }
                    />
                  );
                })}
              </div>
            )}
          </div>
        </section>
      </div>

      {cropSourceUrl && (
        <AvatarCropModal
          imageSrc={cropSourceUrl}
          onClose={() => setCropSourceUrl(null)}
          onConfirm={handleConfirmAvatarCrop}
        />
      )}
    </main>
  );
}
