import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom';
import { OnboardingData, PlanType } from './types';
import { AccountStep } from './components/steps/AccountStep';
import { LandingPage } from './components/LandingPage';
import { Dashboard } from './components/Dashboard';

const OnboardingFlow: React.FC = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState<OnboardingData>({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    gymName: '',
    gymType: '',
    capacity: '',
    selectedPlan: PlanType.PRO,
    billingCycle: 'monthly',
    cardName: '',
    cardNumber: '',
    expiryDate: '',
    cvc: ''
  });

  const updateData = (fields: Partial<OnboardingData>) => {
    setFormData(prev => ({ ...prev, ...fields }));
  };

  const handleRegister = () => {
    // Aquí iría la lógica de registro real (API call)
    console.log('Registrando usuario:', formData);
    // Redirigir al dashboard
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen bg-white sm:bg-[#F9FAFB] flex flex-col justify-center py-8 px-4 sm:px-6 lg:px-8 animate-in fade-in duration-500">
      <div className="sm:mx-auto sm:w-full sm:max-w-md mb-8 flex justify-center cursor-pointer" onClick={() => navigate('/')}>
        <div className="flex items-center gap-2 text-blue-600">
          <div className="w-6 h-6 bg-blue-600 rounded-sm"></div>
          <span className="text-xl font-bold tracking-tight text-slate-900">GymPulse</span>
        </div>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-[440px]">
        <div className="bg-white sm:border sm:border-slate-200 sm:rounded-lg sm:p-8">
          <AccountStep
            data={formData}
            updateData={updateData}
            onNext={handleRegister}
            onBack={() => navigate('/')}
          />
        </div>

        <div className="mt-6 text-center text-xs text-slate-400 flex justify-center gap-4">
          <a href="#" className="hover:text-slate-600">Ayuda</a>
          <a href="#" className="hover:text-slate-600">Privacidad</a>
        </div>
      </div>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage onStart={() => window.location.href = '/register'} />} />
        <Route path="/register" element={<OnboardingFlow />} />
        <Route path="/dashboard" element={<Dashboard />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;