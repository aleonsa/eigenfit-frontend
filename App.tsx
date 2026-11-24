import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { LandingPage } from './components/LandingPage';
import { Dashboard } from './components/Dashboard';
import { OnboardingView } from './components/onboarding/OnboardingView';
import { Button } from './components/ui/Button';
import { isAuthError, useApi } from './hooks/useApi';

interface MeData {
  user: { id: string; email: string; full_name: string };
  branch: { id: string; name: string; timezone?: string } | null;
  role: string | null;
}

type MeState = 'idle' | 'loading' | 'ready' | 'auth_error' | 'error';

const App: React.FC = () => {
  const { isAuthenticated, isLoading: authLoading, user, loginWithRedirect, logout } = useAuth0();
  const { apiCall } = useApi();
  const [meData, setMeData] = useState<MeData | null>(null);
  const [meState, setMeState] = useState<MeState>('idle');

  const userSub = user?.sub;
  const userFullNameRef = useRef<string>('');
  userFullNameRef.current = user?.name || user?.email || '';
  const syncRequestIdRef = useRef(0);

  const syncMe = useCallback(async () => {
    if (!userSub) return;
    const requestId = ++syncRequestIdRef.current;
    setMeState('loading');
    try {
      const data = await apiCall<MeData>('/api/v1/me', {
        method: 'POST',
        // auth0_id y email los toma el backend del JWT verificado.
        body: JSON.stringify({ full_name: userFullNameRef.current }),
      });
      if (syncRequestIdRef.current !== requestId) return;
      setMeData(data);
      setMeState('ready');
    } catch (e) {
      if (syncRequestIdRef.current !== requestId) return;
      console.error('Error syncing user:', e);
      setMeData(null);
      setMeState(isAuthError(e) ? 'auth_error' : 'error');
    }
  }, [userSub, apiCall]);

  useEffect(() => {
    if (authLoading) return;
    if (isAuthenticated && userSub) {
      void syncMe();
    } else {
      syncRequestIdRef.current += 1;
      setMeData(null);
      setMeState('idle');
    }
  }, [isAuthenticated, userSub, authLoading]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSignOut = () => {
    void logout({ logoutParams: { returnTo: window.location.origin } });
  };

  if (authLoading) {
    return <div className="min-h-screen flex items-center justify-center bg-[#FAFAFA] text-sm text-slate-500">Cargando...</div>;
  }

  if (!isAuthenticated) {
    return <LandingPage />;
  }

  if (meState === 'idle' || meState === 'loading') {
    return <div className="min-h-screen flex items-center justify-center bg-[#FAFAFA] text-sm text-slate-500">Cargando...</div>;
  }

  if (meState === 'auth_error') {
    return (
      <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center p-6">
        <div className="w-full max-w-sm bg-white border border-slate-100 rounded-lg shadow-[0_2px_10px_-4px_rgba(0,0,0,0.02)] p-6 space-y-5">
          <div className="space-y-1.5">
            <h1 className="text-base font-semibold text-slate-900">Tu sesión expiró</h1>
            <p className="text-sm text-slate-600">
              Inicia sesión de nuevo para continuar en tu cuenta.
            </p>
          </div>
          <div className="flex flex-col gap-2">
            <Button type="button" onClick={() => void loginWithRedirect()} className="w-full">
              Iniciar sesión de nuevo
            </Button>
            <Button type="button" variant="outline" onClick={handleSignOut} className="w-full">
              Cerrar sesión
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (meState === 'error' || !meData) {
    return (
      <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center p-6">
        <div className="w-full max-w-sm bg-white border border-slate-100 rounded-lg shadow-[0_2px_10px_-4px_rgba(0,0,0,0.02)] p-6 space-y-5">
          <div className="space-y-1.5">
            <h1 className="text-base font-semibold text-slate-900">No pudimos cargar tu cuenta</h1>
            <p className="text-sm text-slate-600">
              Hubo un problema al conectar con el servidor. Intenta de nuevo.
            </p>
          </div>
          <div className="flex flex-col gap-2">
            <Button type="button" onClick={() => void syncMe()} className="w-full">
              Reintentar
            </Button>
            <Button type="button" variant="outline" onClick={handleSignOut} className="w-full">
              Cerrar sesión
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (!meData.branch) {
    return <OnboardingView userId={meData.user.id} onComplete={syncMe} />;
  }

  return <Dashboard branchId={meData.branch.id} branchName={meData.branch.name} userRole={meData.role || 'employee'}
      branchTimezone={meData.branch.timezone || 'America/Mexico_City'}
    />;
};

export default App;
