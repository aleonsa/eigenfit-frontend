import React, { useState, useEffect, useCallback } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { LandingPage } from './components/LandingPage';
import { Dashboard } from './components/Dashboard';
import { OnboardingView } from './components/onboarding/OnboardingView';
import { useApi } from './hooks/useApi';

interface MeData {
  user: { id: string; email: string; full_name: string };
  branch: { id: string; name: string } | null;
}

const App: React.FC = () => {
  const { isAuthenticated, isLoading: authLoading, user } = useAuth0();
  const { apiCall } = useApi();
  const [meData, setMeData] = useState<MeData | null>(null);
  const [syncing, setSyncing] = useState(false);

  const syncMe = useCallback(async () => {
    if (!user) return;
    setSyncing(true);
    try {
      const data = await apiCall<MeData>('/api/v1/me', {
        method: 'POST',
        body: JSON.stringify({
          auth0_id: user.sub,
          email: user.email,
          full_name: user.name || user.email,
        }),
      });
      setMeData(data);
    } catch (e) {
      console.error('Error syncing user:', e);
    } finally {
      setSyncing(false);
    }
  }, [user, apiCall]);

  useEffect(() => {
    if (isAuthenticated && user) {
      syncMe();
    }
  }, [isAuthenticated, user]); // eslint-disable-line react-hooks/exhaustive-deps

  if (authLoading || syncing) {
    return <div className="min-h-screen flex items-center justify-center text-slate-400">Cargando...</div>;
  }

  if (!isAuthenticated) {
    return <LandingPage />;
  }

  if (!meData?.branch) {
    return <OnboardingView userId={meData?.user.id} onComplete={syncMe} />;
  }

  return <Dashboard branchId={meData.branch.id} />;
};

export default App;
