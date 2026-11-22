import React from 'react';
import { FIREBASE_DATABASE_ID, FIREBASE_PROJECT_ID } from '../firebase';

interface ErrorBoundaryState {
  hasError: boolean;
  message: string;
  isQuotaError: boolean;
  isDailyReadQuota: boolean;
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = {
      hasError: false,
      message: '',
      isQuotaError: false,
      isDailyReadQuota: false,
    };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    const raw = error?.message || 'Ocorreu um erro inesperado.';
    let parsedMessage = raw;
    try {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed.error === 'string') {
        parsedMessage = parsed.error;
      }
    } catch {
      // Plain error message
    }

    const isQuotaError = parsedMessage.includes('Quota exceeded');
    const isDailyReadQuota = parsedMessage.includes(
      'Free daily read units per project (free tier database)',
    );

    return {
      hasError: true,
      message: parsedMessage,
      isQuotaError,
      isDailyReadQuota,
    };
  }

  componentDidCatch(error: Error) {
    console.error('CobraCritic ErrorBoundary:', error);
  }

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    const upgradeUrl = `https://console.firebase.google.com/project/${FIREBASE_PROJECT_ID}/firestore/databases/${FIREBASE_DATABASE_ID}/data?openUpgradeDialog=true`;

    return (
      <div className="min-h-screen bg-[#0C0D0C] text-[#F2F2EE] flex items-center justify-center px-6 py-12">
        <div className="max-w-lg w-full border border-[#262A26] bg-[#141614] p-8">
          <p className="text-xs font-mono tracking-wider text-[#90968C] mb-2">
            Erro de sincronização
          </p>
          <h1 className="font-serif text-2xl font-semibold text-[#F2F2EE] mb-3">
            Não foi possível concluir a operação
          </h1>
          {this.state.isQuotaError ? (
            <div className="space-y-3 text-sm text-[#A8ACA5] leading-relaxed mb-6">
              <p>
                A cota gratuita diária do banco de dados Firestore foi atingida. O limite é
                redefinido automaticamente no dia seguinte.
              </p>
              {this.state.isDailyReadQuota && (
                <p>
                  Você pode verificar detalhes ou fazer upgrade no console do projeto:{' '}
                  <a
                    href={upgradeUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="underline text-[#4ADE80] font-medium"
                  >
                    Abrir banco no Firebase Console
                  </a>
                </p>
              )}
            </div>
          ) : (
            <p className="text-sm text-[#A8ACA5] leading-relaxed mb-6 break-words">
              {this.state.message}
            </p>
          )}
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="px-5 py-2.5 text-sm font-medium bg-[#F2F2EE] text-[#0C0D0C] rounded-md hover:bg-white transition-colors cursor-pointer"
          >
            Recarregar CobraCritic
          </button>
        </div>
      </div>
    );
  }
}
