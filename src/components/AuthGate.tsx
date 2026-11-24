import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Eye, Shield } from 'lucide-react';
import { COBRA_LOGO_PATH, resolveAssetUrl } from '../types';

interface AuthGateProps {
  onSignIn: () => void;
  onAdminSignIn: (usernameOrEmail: string, password: string) => Promise<void>;
  onEnterReadOnly: () => void;
  signingIn: boolean;
  authError: string | null;
  adminAuthError: string | null;
}

export function AuthGate({
  onSignIn,
  onAdminSignIn,
  onEnterReadOnly,
  signingIn,
  authError,
  adminAuthError,
}: AuthGateProps) {
  const [showAdminForm, setShowAdminForm] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const handleAdminSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (signingIn) return;
    await onAdminSignIn(username, password);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#0C0D0C] text-[#F2F2EE] px-4 py-12">
      <main className="w-full max-w-[460px] flex flex-col items-center space-y-8">
        <img
          src={resolveAssetUrl(COBRA_LOGO_PATH)}
          alt="CobraCritic"
          className="w-full max-w-[420px] h-auto object-contain select-none"
        />

        <div className="w-full max-w-[340px] flex flex-col items-center space-y-3.5">
          <button
            type="button"
            onClick={onSignIn}
            disabled={signingIn}
            className="w-full px-6 py-3.5 text-sm font-semibold rounded-md transition-colors inline-flex items-center justify-center gap-2 bg-[#F2F2EE] text-[#0C0D0C] hover:bg-white disabled:opacity-50 cursor-pointer"
          >
            <span>{signingIn ? 'Conectando...' : 'Entrar com Google'}</span>
          </button>

          <button
            type="button"
            onClick={onEnterReadOnly}
            className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 text-sm font-semibold bg-[#13261A] border border-[#2C6B41] text-[#86EFAC] rounded-md hover:bg-[#193322] hover:text-white transition-colors cursor-pointer"
          >
            <Eye className="w-4 h-4 shrink-0" />
            <span>Visualizar site (somente leitura)</span>
          </button>

          <p className="text-[11px] text-[#8C9288] text-center leading-relaxed pt-0.5">
            Membros já cadastrados entram normalmente. Novos cadastros precisam de
            aprovação de um administrador.
          </p>

          {authError && (
            <p className="text-sm text-[#F87171] text-center" role="alert">
              {authError}
            </p>
          )}

          <div className="w-full pt-2 border-t border-[#1F231F] flex flex-col items-center">
            <button
              type="button"
              onClick={() => setShowAdminForm((prev) => !prev)}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-[#8C9288] hover:text-[#4ADE80] transition-colors py-1.5 cursor-pointer"
            >
              <Shield className="w-3.5 h-3.5" />
              <span>Acesso Admin Mestre</span>
              {showAdminForm ? (
                <ChevronUp className="w-3.5 h-3.5" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5" />
              )}
            </button>

            {showAdminForm && (
              <form
                onSubmit={handleAdminSubmit}
                className="w-full mt-3 bg-[#141614] border border-[#262A26] p-4 rounded-md space-y-3"
              >
                <div className="space-y-1">
                  <label
                    htmlFor="admin-username"
                    className="block text-xs font-medium text-[#A8ACA5]"
                  >
                    Usuário admin
                  </label>
                  <input
                    id="admin-username"
                    type="text"
                    autoComplete="off"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-[#0C0D0C] border border-[#2A2F2A] rounded-md text-[#F2F2EE] focus:outline-none focus:border-[#4ADE80]"
                  />
                </div>

                <div className="space-y-1">
                  <label
                    htmlFor="admin-password"
                    className="block text-xs font-medium text-[#A8ACA5]"
                  >
                    Senha
                  </label>
                  <input
                    id="admin-password"
                    type="password"
                    autoComplete="off"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-[#0C0D0C] border border-[#2A2F2A] rounded-md text-[#F2F2EE] focus:outline-none focus:border-[#4ADE80]"
                  />
                </div>

                {adminAuthError && (
                  <p className="text-xs text-[#F87171] leading-relaxed" role="alert">
                    {adminAuthError}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={signingIn || !username.trim() || !password}
                  className="w-full px-4 py-2 text-xs font-semibold bg-[#1E8E49] text-white rounded-md hover:bg-[#16A34A] disabled:opacity-50 transition-colors cursor-pointer"
                >
                  {signingIn ? 'Verificando...' : 'Entrar como Admin'}
                </button>
              </form>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
