import { CURATED_COVERS, resolveAssetUrl } from '../types';
import { ScoreBadge } from './ScoreBadge';

interface AuthGateProps {
  onSignIn: () => void;
  signingIn: boolean;
  authError: string | null;
}

export function AuthGate({ onSignIn, signingIn, authError }: AuthGateProps) {
  return (
    <div className="min-h-screen flex flex-col bg-[#0C0D0C] text-[#F2F2EE]">
      <header className="border-b border-[#222622] bg-[#0C0D0C]/95 backdrop-blur-sm">
        <div className="max-w-[1240px] mx-auto px-4 sm:px-8 h-16 flex items-center justify-between gap-8">
          <span className="font-serif text-2xl font-semibold tracking-tight text-[#F2F2EE] whitespace-nowrap shrink-0">
            CobraCritic
          </span>
          <button
            type="button"
            onClick={onSignIn}
            disabled={signingIn}
            className="px-4 py-2 text-sm font-medium bg-[#F2F2EE] text-[#0C0D0C] rounded-md hover:bg-white disabled:opacity-50 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            {signingIn ? 'Entrando...' : 'Entrar com Google'}
          </button>
        </div>
      </header>

      <main className="flex-1 max-w-[1240px] mx-auto px-4 sm:px-8 py-12 lg:py-20 flex items-center">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center w-full">
          {/* Left editorial column */}
          <div className="lg:col-span-6 space-y-6">
            <p className="text-xs font-mono uppercase tracking-[0.16em] text-[#4ADE80]">
              Grupo dos Cobras · Críticas de jogos
            </p>
            <h1 className="font-serif text-4xl sm:text-5xl lg:text-[3.4rem] font-medium leading-[1.08] tracking-tight text-[#F2F2EE]">
              O veredito oficial dos Cobras, jogo por jogo.
            </h1>
            <p className="text-base sm:text-lg text-[#A8ACA5] leading-relaxed max-w-xl">
              Cadastre manualmente os jogos que o grupo joga, publique notas de 0 a 100 com
              médias exclusivas dos Cobras, busque jogos e membros pelo menu lateral e
              debata críticas no feed social.
            </p>

            <div className="pt-2 space-y-3">
              <button
                type="button"
                onClick={onSignIn}
                disabled={signingIn}
                className="px-6 py-3 text-sm font-semibold bg-[#F2F2EE] text-[#0C0D0C] rounded-md hover:bg-white disabled:opacity-50 transition-colors cursor-pointer"
              >
                {signingIn
                  ? 'Conectando sua conta...'
                  : 'Entrar com Google no CobraCritic'}
              </button>
              {authError && (
                <p className="text-sm text-[#F87171]" role="alert">
                  {authError}
                </p>
              )}
            </div>

            <div className="pt-6 border-t border-[#222622] grid grid-cols-1 sm:grid-cols-3 gap-6">
              <div>
                <p className="text-sm font-semibold text-[#F2F2EE]">Catálogo manual</p>
                <p className="text-xs text-[#90968C] mt-1 leading-relaxed">
                  Cadastro enxuto feito pelo grupo com filtros por plataforma, gênero e
                  lançamento.
                </p>
              </div>
              <div>
                <p className="text-sm font-semibold text-[#F2F2EE]">Média dos Cobras</p>
                <p className="text-xs text-[#90968C] mt-1 leading-relaxed">
                  Notas de 0 a 100, distribuição de avaliações e ranking de polêmicas.
                </p>
              </div>
              <div>
                <p className="text-sm font-semibold text-[#F2F2EE]">Feed &amp; Membros</p>
                <p className="text-xs text-[#90968C] mt-1 leading-relaxed">
                  Busque colegas do grupo, leia seus históricos e comente cada review.
                </p>
              </div>
            </div>
          </div>

          {/* Right visual showcase */}
          <div className="lg:col-span-6">
            <div className="grid grid-cols-2 gap-5">
              <div className="space-y-5">
                <article className="bg-[#141614] border border-[#262A26] p-3">
                  <div className="aspect-[3/4] overflow-hidden bg-[#1D1E1C]">
                    <img
                      src={resolveAssetUrl(CURATED_COVERS[0].url)}
                      alt="Capa de fantasia sombria"
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="pt-3 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-serif text-sm font-medium text-[#F2F2EE] truncate">
                        Citadel of Silver Ash
                      </p>
                      <p className="text-xs text-[#90968C] truncate">PC · PS5 · 2025</p>
                    </div>
                    <ScoreBadge score={91} size="sm" />
                  </div>
                </article>

                <article className="bg-[#141614] border border-[#262A26] p-3">
                  <div className="aspect-[3/4] overflow-hidden bg-[#1D1E1C]">
                    <img
                      src={resolveAssetUrl(CURATED_COVERS[2].url)}
                      alt="Capa de estratégia botânica"
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="pt-3 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-serif text-sm font-medium text-[#F2F2EE] truncate">
                        Observatório Botânico
                      </p>
                      <p className="text-xs text-[#90968C] truncate">Switch · PC · 2024</p>
                    </div>
                    <ScoreBadge score={86} size="sm" />
                  </div>
                </article>
              </div>

              <div className="space-y-5 pt-8">
                <article className="bg-[#141614] border border-[#262A26] p-3">
                  <div className="aspect-[3/4] overflow-hidden bg-[#1D1E1C]">
                    <img
                      src={resolveAssetUrl(CURATED_COVERS[1].url)}
                      alt="Capa de exploração espacial"
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="pt-3 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-serif text-sm font-medium text-[#F2F2EE] truncate">
                        Solar Drift: Horizon IX
                      </p>
                      <p className="text-xs text-[#90968C] truncate">PC · Steam Deck · 2026</p>
                    </div>
                    <ScoreBadge score={84} size="sm" />
                  </div>
                </article>

                <article className="bg-[#141614] border border-[#262A26] p-3">
                  <div className="aspect-[3/4] overflow-hidden bg-[#1D1E1C]">
                    <img
                      src={resolveAssetUrl(CURATED_COVERS[3].url)}
                      alt="Capa de corrida endurance"
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="pt-3 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-serif text-sm font-medium text-[#F2F2EE] truncate">
                        Apex Tarmac: Endurance
                      </p>
                      <p className="text-xs text-[#90968C] truncate">PS5 · Xbox · 2025</p>
                    </div>
                    <ScoreBadge score={72} size="sm" />
                  </div>
                </article>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
