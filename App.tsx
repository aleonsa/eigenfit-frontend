import React from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { LandingPage } from './components/LandingPage';
import { Dashboard } from './components/Dashboard';

const App: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth0();

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center text-slate-400">Cargando...</div>;
  }

  return isAuthenticated ? <Dashboard /> : <LandingPage />;
};

export default App;