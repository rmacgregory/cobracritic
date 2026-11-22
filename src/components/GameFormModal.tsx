import React, { useState } from 'react';
import { X } from 'lucide-react';
import {
  CURATED_COVERS,
  GENRES,
  LIMITS,
  PLATFORMS,
  type Game,
  type GameInput,
} from '../types';
import { GameCover } from './GameCover';

interface GameFormModalProps {
  initialGame?: Game | null;
  onClose: () => void;
  onSubmit: (input: GameInput) => Promise<void>;
}

export function GameFormModal({
  initialGame,
  onClose,
  onSubmit,
}: GameFormModalProps) {
  const [title, setTitle] = useState(initialGame?.title || '');
  const [developer, setDeveloper] = useState(initialGame?.developer || '');
  const [releaseDate, setReleaseDate] = useState(
    initialGame?.releaseDate || new Date().toISOString().slice(0, 10),
  );
  const [platforms, setPlatforms] = useState<string[]>(
    initialGame?.platforms || ['PC'],
  );
  const [genres, setGenres] = useState<string[]>(initialGame?.genres || ['RPG']);
  const [synopsis, setSynopsis] = useState(initialGame?.synopsis || '');
  const [coverUrl, setCoverUrl] = useState(initialGame?.coverUrl || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleItem = (
    item: string,
    list: string[],
    setList: React.Dispatch<React.SetStateAction<string[]>>,
    max: number,
  ) => {
    if (list.includes(item)) {
      setList(list.filter((i) => i !== item));
    } else if (list.length < max) {
      setList([...list, item]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!title.trim()) {
      setError('Informe o título do jogo.');
      return;
    }
    if (!developer.trim()) {
      setError('Informe o estúdio ou desenvolvedora.');
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(releaseDate)) {
      setError('Informe uma data de lançamento válida.');
      return;
    }
    const year = Number.parseInt(releaseDate.slice(0, 4), 10);
    if (year < LIMITS.RELEASE_YEAR_MIN || year > LIMITS.RELEASE_YEAR_MAX) {
      setError(
        `O ano de lançamento deve estar entre ${LIMITS.RELEASE_YEAR_MIN} e ${LIMITS.RELEASE_YEAR_MAX}.`,
      );
      return;
    }
    if (platforms.length === 0) {
      setError('Selecione pelo menos uma plataforma.');
      return;
    }
    if (genres.length === 0) {
      setError('Selecione pelo menos um gênero.');
      return;
    }
    if (!synopsis.trim()) {
      setError('Adicione uma breve sinopse sobre o jogo.');
      return;
    }
    const trimmedUrl = coverUrl.trim();
    if (
      trimmedUrl &&
      !trimmedUrl.startsWith('https://') &&
      !trimmedUrl.startsWith('/src/assets/images/')
    ) {
      setError('A URL da capa deve começar com https:// ou usar uma das artes disponíveis.');
      return;
    }

    setSaving(true);
    try {
      await onSubmit({
        title: title.trim(),
        developer: developer.trim(),
        releaseDate,
        platforms,
        genres,
        synopsis: synopsis.trim(),
        coverUrl: trimmedUrl,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar o jogo.');
    } finally {
      setSaving(false);
    }
  };

  const previewYear = /^\d{4}/.test(releaseDate)
    ? Number.parseInt(releaseDate.slice(0, 4), 10)
    : undefined;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-[2px] flex items-center justify-center p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="game-modal-title"
    >
      <div className="bg-[#141614] border border-[#2A2F2A] w-full max-w-3xl max-h-[92vh] overflow-y-auto my-auto text-[#F2F2EE]">
        <div className="sticky top-0 z-10 bg-[#141614] border-b border-[#232723] px-6 py-4 flex items-center justify-between gap-4">
          <div>
            <h2
              id="game-modal-title"
              className="font-serif text-xl font-semibold text-[#F2F2EE]"
            >
              {initialGame ? 'Editar cadastro do jogo' : 'Cadastrar novo jogo'}
            </h2>
            <p className="text-xs text-[#8C9288] mt-0.5">
              Adicione jogos manualmente ao catálogo do CobraCritic.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar janela"
            className="p-2 text-[#8C9288] hover:text-[#F2F2EE] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            <div className="md:col-span-8 space-y-4">
              <div>
                <label
                  htmlFor="game-title"
                  className="block text-xs font-medium text-[#A8ACA5] mb-1.5"
                >
                  Título do jogo
                </label>
                <input
                  id="game-title"
                  type="text"
                  required
                  maxLength={LIMITS.GAME_TITLE_MAX}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ex.: Elden Ring, Hollow Knight, Baldur's Gate 3"
                  className="w-full px-3.5 py-2.5 text-sm bg-[#0C0D0C] border border-[#2C312C] rounded-md text-[#F2F2EE] placeholder:text-[#666B63] focus:outline-none focus:border-[#4ADE80]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="game-dev"
                    className="block text-xs font-medium text-[#A8ACA5] mb-1.5"
                  >
                    Estúdio / Desenvolvedora
                  </label>
                  <input
                    id="game-dev"
                    type="text"
                    required
                    maxLength={LIMITS.DEVELOPER_MAX}
                    value={developer}
                    onChange={(e) => setDeveloper(e.target.value)}
                    placeholder="Ex.: FromSoftware, Team Cherry"
                    className="w-full px-3.5 py-2.5 text-sm bg-[#0C0D0C] border border-[#2C312C] rounded-md text-[#F2F2EE] placeholder:text-[#666B63] focus:outline-none focus:border-[#4ADE80]"
                  />
                </div>

                <div>
                  <label
                    htmlFor="game-date"
                    className="block text-xs font-medium text-[#A8ACA5] mb-1.5"
                  >
                    Data de lançamento
                  </label>
                  <input
                    id="game-date"
                    type="date"
                    required
                    value={releaseDate}
                    onChange={(e) => setReleaseDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm bg-[#0C0D0C] border border-[#2C312C] rounded-md text-[#F2F2EE] font-mono focus:outline-none focus:border-[#4ADE80]"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="game-synopsis"
                  className="block text-xs font-medium text-[#A8ACA5] mb-1.5"
                >
                  Sinopse ({synopsis.length}/{LIMITS.SYNOPSIS_MAX})
                </label>
                <textarea
                  id="game-synopsis"
                  required
                  rows={4}
                  maxLength={LIMITS.SYNOPSIS_MAX}
                  value={synopsis}
                  onChange={(e) => setSynopsis(e.target.value)}
                  placeholder="Resumo curto sobre o jogo para contextualizar o grupo..."
                  className="w-full px-3.5 py-2.5 text-sm bg-[#0C0D0C] border border-[#2C312C] rounded-md text-[#F2F2EE] placeholder:text-[#666B63] leading-relaxed focus:outline-none focus:border-[#4ADE80]"
                />
              </div>
            </div>

            <div className="md:col-span-4 space-y-3">
              <p className="text-xs font-medium text-[#A8ACA5]">Prévia da capa</p>
              <div className="max-w-[180px] md:max-w-none">
                <GameCover
                  title={title.trim() || 'Novo Jogo'}
                  developer={developer.trim() || 'Estúdio'}
                  releaseYear={previewYear}
                  coverUrl={coverUrl}
                />
              </div>
            </div>
          </div>

          <div className="pt-2 border-t border-[#232723]">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-[#A8ACA5]">
                Plataformas ({platforms.length}/{LIMITS.PLATFORMS_MAX})
              </span>
              <span className="text-xs text-[#787D75]">Selecione ao menos 1</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {PLATFORMS.map((platform) => {
                const selected = platforms.includes(platform);
                return (
                  <button
                    key={platform}
                    type="button"
                    onClick={() =>
                      toggleItem(platform, platforms, setPlatforms, LIMITS.PLATFORMS_MAX)
                    }
                    className={`px-3 py-1.5 text-xs font-medium rounded-md border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      selected
                        ? 'bg-[#F2F2EE] text-[#0C0D0C] border-[#F2F2EE]'
                        : 'bg-[#0C0D0C] text-[#A8ACA5] border-[#2C312C] hover:border-[#666B63]'
                    }`}
                  >
                    {platform}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="pt-2 border-t border-[#232723]">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-[#A8ACA5]">
                Gêneros ({genres.length}/{LIMITS.GENRES_MAX})
              </span>
              <span className="text-xs text-[#787D75]">Até {LIMITS.GENRES_MAX} gêneros</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {GENRES.map((genre) => {
                const selected = genres.includes(genre);
                return (
                  <button
                    key={genre}
                    type="button"
                    onClick={() =>
                      toggleItem(genre, genres, setGenres, LIMITS.GENRES_MAX)
                    }
                    className={`px-3 py-1.5 text-xs font-medium rounded-md border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      selected
                        ? 'bg-[#F2F2EE] text-[#0C0D0C] border-[#F2F2EE]'
                        : 'bg-[#0C0D0C] text-[#A8ACA5] border-[#2C312C] hover:border-[#666B63]'
                    }`}
                  >
                    {genre}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="pt-2 border-t border-[#232723] space-y-3">
            <div>
              <label
                htmlFor="game-cover-url"
                className="block text-xs font-medium text-[#A8ACA5] mb-1.5"
              >
                URL da capa (opcional — https://...) ou escolha uma arte editorial abaixo
              </label>
              <input
                id="game-cover-url"
                type="text"
                maxLength={LIMITS.URL_MAX}
                value={coverUrl}
                onChange={(e) => setCoverUrl(e.target.value)}
                placeholder="https://exemplo.com/capa-do-jogo.jpg (deixe vazio para capa tipográfica)"
                className="w-full px-3.5 py-2 text-sm bg-[#0C0D0C] border border-[#2C312C] rounded-md text-[#F2F2EE] placeholder:text-[#666B63] focus:outline-none focus:border-[#4ADE80]"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setCoverUrl('')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md border transition-colors cursor-pointer ${
                  coverUrl === ''
                    ? 'bg-[#F2F2EE] text-[#0C0D0C] border-[#F2F2EE]'
                    : 'bg-[#0C0D0C] text-[#A8ACA5] border-[#2C312C] hover:border-[#666B63]'
                }`}
              >
                Capa tipográfica
              </button>
              {CURATED_COVERS.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => setCoverUrl(preset.url)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md border transition-colors cursor-pointer ${
                    coverUrl === preset.url
                      ? 'bg-[#F2F2EE] text-[#0C0D0C] border-[#F2F2EE]'
                      : 'bg-[#0C0D0C] text-[#A8ACA5] border-[#2C312C] hover:border-[#666B63]'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          {error && (
            <p className="text-sm text-[#F87171]" role="alert">
              {error}
            </p>
          )}

          <div className="pt-4 border-t border-[#232723] flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-[#A8ACA5] hover:text-[#F2F2EE] transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 text-sm font-semibold bg-[#F2F2EE] text-[#0C0D0C] rounded-md hover:bg-white disabled:opacity-50 transition-colors cursor-pointer"
            >
              {saving
                ? 'Salvando...'
                : initialGame
                  ? 'Salvar alterações'
                  : 'Cadastrar jogo'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
