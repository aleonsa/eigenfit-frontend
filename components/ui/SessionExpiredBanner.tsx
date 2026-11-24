import React from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { useSessionExpired } from '../../hooks/authSession';

export const SessionExpiredBanner: React.FC = () => {
  const sessionExpired = useSessionExpired();
  const { loginWithRedirect } = useAuth0();

  if (!sessionExpired) return null;

  return (
    <div
      role="status"
      className="bg-amber-50 border-b border-amber-200 px-6 py-2 text-xs text-amber-900 flex flex-wrap items-center justify-center gap-2 shrink-0"
    >
      <span>Tu sesión expiró</span>
      <span aria-hidden="true" className="text-amber-400">·</span>
      <button
        type="button"
        onClick={() => void loginWithRedirect()}
        className="font-medium underline underline-offset-2 text-amber-900 hover:text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 rounded"
      >
        Iniciar sesión de nuevo
      </button>
    </div>
  );
};
