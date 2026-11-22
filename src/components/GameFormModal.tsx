import React, { useState } from 'react';
import {
  Check,
  ChevronDown,
  ChevronUp,
  Image as ImageIcon,
  Loader2,
  PenLine,
  Search,
  X,
} from 'lucide-react';
import {
  findVerticalCoversForTitle,
  getRawgGameDetails,
  searchRawgGames,
  type CoverOption,
  type RawgSearchResult,
} from '../services/rawg';
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
  const [platformSearch, setPlatformSearch] = useState('');
  const [showManualFields, setShowManualFields] = useState(Boolean(initialGame));

  // RAWG.io direct lookup state
  const [rawgQuery, setRawgQuery] = useState('');
  const [rawgSearching, setRawgSearching] = useState(false);
  const [rawgImportingId, setRawgImportingId] = useState<number | null>(null);
  const [rawgResults, setRawgResults] = useState<RawgSearchResult[]>([]);
  const [rawgError, setRawgError] = useState<string | null>(null);
  const [rawgImportedTitle, setRawgImportedTitle] = useState<string | null>(null);
  const [rawgHasSearched, setRawgHasSearched] = useState(false);

  // Vertical cover candidates (Steam 600x900, Wikipedia box art, RAWG)
  const [coverOptions, setCoverOptions] = useState<CoverOption[]>([]);
  const [findingVerticalCover, setFindingVerticalCover] = useState(false);
  const [verticalCoverHint, setVerticalCoverHint] = useState<string | null>(null);

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

  const handleRawgSearch = async () => {
    const q = rawgQuery.trim();
    if (q.length < 2) {
      setRawgError('Digite pelo menos 2 caracteres para buscar no catálogo RAWG.');
      return;
    }

    setRawgError(null);
    setRawgImportedTitle(null);
    setRawgSearching(true);
    setRawgHasSearched(true);

    try {
      const results = await searchRawgGames(q);
      setRawgResults(results);
    } catch (err) {
      setRawgError(
        err instanceof Error
          ? err.message
          : 'Não foi possível buscar jogos no RAWG. Use a opção “Adicionar jogo manualmente.” abaixo.',
      );
      setRawgResults([]);
    } finally {
      setRawgSearching(false);
    }
  };

  const handleSelectRawgGame = async (candidate: RawgSearchResult) => {
    setRawgError(null);
    setRawgImportingId(candidate.id);

    try {
      const imported = await getRawgGameDetails(candidate.id);
      if (imported.title) setTitle(imported.title);
      if (imported.developer) setDeveloper(imported.developer);
      if (imported.releaseDate) setReleaseDate(imported.releaseDate);
      if (imported.platforms.length > 0) setPlatforms(imported.platforms);
      if (imported.genres.length > 0) setGenres(imported.genres);
      if (imported.synopsis) setSynopsis(imported.synopsis);
      if (imported.coverUrl) setCoverUrl(imported.coverUrl);
      setCoverOptions(imported.coverOptions || []);
      setVerticalCoverHint(
        imported.coverOptions?.some((c) => c.orientation === 'vertical')
          ? 'Capa vertical selecionada automaticamente.'
          : null,
      );

      setRawgImportedTitle(imported.title || candidate.title);
      setRawgResults([]);
      setRawgHasSearched(false);
      setShowManualFields(true);
    } catch (err) {
      setRawgError(
        err instanceof Error
          ? err.message
          : 'Erro ao importar dados do jogo selecionado.',
      );
    } finally {
      setRawgImportingId(null);
    }
  };

  const handleFindVerticalCover = async () => {
    const cleanTitle = title.trim();
    if (cleanTitle.length < 2) {
      setVerticalCoverHint('Informe o título do jogo antes de buscar a capa vertical.');
      return;
    }

    setFindingVerticalCover(true);
    setVerticalCoverHint(null);
    try {
      const found = await findVerticalCoversForTitle(cleanTitle, releaseDate);
      if (found.length === 0) {
        setVerticalCoverHint(
          'Nenhuma capa vertical encontrada automaticamente. Você pode colar uma URL manual abaixo.',
        );
        return;
      }

      setCoverOptions((prev) => {
        const merged = [...found];
        for (const existing of prev) {
          if (!merged.some((item) => item.url === existing.url)) {
            merged.push(existing);
          }
        }
        return merged;
      });
      setCoverUrl(found[0].url);
      setVerticalCoverHint(`Capa aplicada: ${found[0].label}.`);
    } catch {
      setVerticalCoverHint('Não foi possível buscar capas verticais agora.');
    } finally {
      setFindingVerticalCover(false);
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
      <div
        className={`bg-[#141614] border border-[#2A2F2A] w-full ${
          showManualFields ? 'max-w-3xl' : 'max-w-xl'
        } max-h-[92vh] overflow-y-auto my-auto text-[#F2F2EE] transition-[max-width] duration-200`}
      >
        <div className="sticky top-0 z-10 bg-[#141614] border-b border-[#232723] px-6 py-4 flex items-center justify-between gap-4">
          <div>
            <h2
              id="game-modal-title"
              className="font-serif text-xl font-semibold text-[#F2F2EE]"
            >
              {initialGame ? 'Editar cadastro do jogo' : 'Cadastrar novo jogo'}
            </h2>
            <p className="text-xs text-[#8C9288] mt-0.5">
              Busque automaticamente no catálogo RAWG ou preencha a ficha manualmente.
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
          {/* RAWG.io Lookup Panel */}
          <div className="bg-[#0C0D0C] border border-[#262A26] p-4 rounded-md space-y-3">
            <div className="flex items-center justify-between gap-2">
              <label
                htmlFor="rawg-search-input"
                className="text-xs font-medium text-[#4ADE80]"
              >
                Importar dados do RAWG.io
              </label>
              <span className="text-[11px] text-[#787D75]">
                Preenche capa, estúdio, data, plataformas e sinopse
              </span>
            </div>

            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-[#787D75] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="rawg-search-input"
                  type="text"
                  maxLength={100}
                  value={rawgQuery}
                  onChange={(e) => setRawgQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleRawgSearch();
                    }
                  }}
                  placeholder="Digite o nome do jogo para buscar (ex.: Clair Obscur, Elden Ring)..."
                  className="w-full pl-9 pr-3 py-2 text-sm bg-[#141614] border border-[#2C312C] rounded-md text-[#F2F2EE] placeholder:text-[#666B63] focus:outline-none focus:border-[#4ADE80]"
                />
              </div>
              <button
                type="button"
                onClick={handleRawgSearch}
                disabled={rawgSearching}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-[#1E8E49] text-white rounded-md hover:bg-[#16A34A] disabled:opacity-50 transition-colors shrink-0 cursor-pointer"
              >
                {rawgSearching ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Buscando...</span>
                  </>
                ) : (
                  <span>Buscar</span>
                )}
              </button>
            </div>

            {rawgError && (
              <p className="text-xs text-[#F87171] leading-relaxed" role="alert">
                {rawgError}
              </p>
            )}

            {rawgImportedTitle && (
              <p className="text-xs text-[#4ADE80] flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 shrink-0" />
                <span>
                  Dados de <strong>{rawgImportedTitle}</strong> preenchidos — revise os
                  campos abaixo e salve.
                </span>
              </p>
            )}

            {rawgResults.length > 0 && (
              <ul className="divide-y divide-[#1F231F] border border-[#232723] rounded-md max-h-60 overflow-y-auto bg-[#141614]">
                {rawgResults.map((item) => {
                  const isImporting = rawgImportingId === item.id;
                  return (
                    <li key={item.id}>
                      <button
                        type="button"
                        disabled={rawgImportingId !== null}
                        onClick={() => handleSelectRawgGame(item)}
                        className="w-full p-2.5 flex items-center justify-between gap-3 text-left hover:bg-[#1C211C] transition-colors cursor-pointer disabled:opacity-60"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          {item.coverUrl ? (
                            <img
                              src={item.coverUrl}
                              alt={item.title}
                              referrerPolicy="no-referrer"
                              className="w-12 h-9 rounded object-cover border border-[#2C312C] shrink-0 bg-[#1D1E1C]"
                            />
                          ) : (
                            <div className="w-12 h-9 rounded bg-[#1D221D] border border-[#2C312C] shrink-0" />
                          )}
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-[#F2F2EE] truncate">
                              {item.title}
                            </p>
                            <p className="text-[11px] text-[#8C9288] truncate">
                              {item.releaseDate ? item.releaseDate.slice(0, 4) : 'Ano N/D'}
                              {item.platforms.length > 0
                                ? ` · ${item.platforms.slice(0, 3).join(', ')}`
                                : ''}
                            </p>
                          </div>
                        </div>

                        <span className="text-xs font-medium text-[#4ADE80] shrink-0 inline-flex items-center gap-1">
                          {isImporting ? (
                            <>
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              <span>Importando...</span>
                            </>
                          ) : (
                            <span>Selecionar</span>
                          )}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}

            {rawgHasSearched && !rawgSearching && !rawgError && rawgResults.length === 0 && (
              <p className="text-xs text-[#8C9288]">
                Nenhum jogo encontrado para “{rawgQuery}”. Use a opção “Adicionar jogo
                manualmente.” abaixo para cadastrar a ficha.
              </p>
            )}
          </div>

          {!showManualFields ? (
            <div className="flex items-center justify-between gap-3 pt-1">
              <button
                type="button"
                onClick={() => setShowManualFields(true)}
                className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium text-[#A8ACA5] hover:text-[#F2F2EE] bg-[#0C0D0C] hover:bg-[#1A1E1A] border border-[#262A26] hover:border-[#3A403A] rounded-md transition-colors cursor-pointer"
              >
                <PenLine className="w-3.5 h-3.5 text-[#787D75]" />
                <span>Adicionar jogo manualmente.</span>
                <ChevronDown className="w-3.5 h-3.5 text-[#787D75]" />
              </button>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-[#A8ACA5] hover:text-[#F2F2EE] transition-colors cursor-pointer"
              >
                Cancelar
              </button>
            </div>
          ) : (
            <>
              {!initialGame && !rawgImportedTitle && (
                <div className="flex items-center justify-between gap-2 pb-1 border-b border-[#232723]">
                  <span className="text-xs font-medium text-[#A8ACA5]">
                    Cadastro manual do jogo
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowManualFields(false)}
                    className="inline-flex items-center gap-1 text-xs text-[#8C9288] hover:text-[#F2F2EE] transition-colors cursor-pointer"
                  >
                    <span>Ocultar campos</span>
                    <ChevronUp className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

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
              <p className="text-xs font-medium text-[#A8ACA5]">Prévia da capa (vertical)</p>
              <div className="max-w-[180px] md:max-w-none">
                <GameCover
                  title={title.trim() || 'Novo Jogo'}
                  developer={developer.trim() || 'Estúdio'}
                  releaseYear={previewYear}
                  coverUrl={coverUrl}
                />
              </div>
              <button
                type="button"
                onClick={handleFindVerticalCover}
                disabled={findingVerticalCover || !title.trim()}
                className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium bg-[#0C0D0C] hover:bg-[#1A1E1A] text-[#D2D6CE] border border-[#2C312C] hover:border-[#4ADE80]/60 rounded-md disabled:opacity-50 transition-colors cursor-pointer"
              >
                {findingVerticalCover ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-[#4ADE80]" />
                    <span>Buscando capa vertical...</span>
                  </>
                ) : (
                  <>
                    <ImageIcon className="w-3.5 h-3.5 text-[#4ADE80]" />
                    <span>Buscar capa vertical</span>
                  </>
                )}
              </button>
              {verticalCoverHint && (
                <p className="text-[11px] text-[#8C9288] leading-snug">
                  {verticalCoverHint}
                </p>
              )}
            </div>
          </div>

          <div className="pt-2 border-t border-[#232723] space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-medium text-[#A8ACA5]">
                Plataformas ({platforms.length}/{LIMITS.PLATFORMS_MAX})
              </span>
              <input
                type="text"
                value={platformSearch}
                onChange={(e) => setPlatformSearch(e.target.value)}
                placeholder="Filtrar consoles..."
                aria-label="Filtrar plataformas"
                className="w-44 px-2.5 py-1 text-xs bg-[#0C0D0C] border border-[#2C312C] rounded-md text-[#F2F2EE] placeholder:text-[#666B63] focus:outline-none focus:border-[#4ADE80]"
              />
            </div>
            <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto pr-1">
              {PLATFORMS.filter((platform) => {
                const q = platformSearch.trim().toLowerCase();
                if (!q) return true;
                return (
                  platforms.includes(platform) ||
                  platform.toLowerCase().includes(q)
                );
              }).map((platform) => {
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
            {coverOptions.length > 0 && (
              <div className="space-y-2">
                <span className="block text-xs font-medium text-[#A8ACA5]">
                  Capas encontradas automaticamente
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {coverOptions.map((option) => {
                    const selected = coverUrl === option.url;
                    return (
                      <button
                        key={option.url}
                        type="button"
                        onClick={() => setCoverUrl(option.url)}
                        className={`flex items-center gap-2.5 p-2 rounded-md border text-left transition-colors cursor-pointer ${
                          selected
                            ? 'bg-[#172119] border-[#4ADE80] text-[#F2F2EE]'
                            : 'bg-[#0C0D0C] border-[#262A26] text-[#A8ACA5] hover:border-[#4A524A]'
                        }`}
                      >
                        <img
                          src={option.url}
                          alt={option.label}
                          referrerPolicy="no-referrer"
                          className="w-9 h-12 rounded object-cover border border-[#2C312C] shrink-0 bg-[#181A18]"
                        />
                        <div className="min-w-0">
                          <p className="text-xs font-medium leading-tight line-clamp-2">
                            {option.label}
                          </p>
                          <p className="text-[10px] text-[#787D75] mt-0.5">
                            {option.orientation === 'vertical'
                              ? 'Formato vertical'
                              : option.orientation === 'square'
                                ? 'Formato quadrado'
                                : 'Formato horizontal'}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

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
            </>
          )}
        </form>
      </div>
    </div>
  );
}
