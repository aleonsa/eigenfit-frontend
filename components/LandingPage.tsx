import React from 'react';
import { Button } from './ui/Button';
import { ArrowRight, Check, Users, CreditCard, BarChart3, Zap } from 'lucide-react';

interface LandingPageProps {
  onStart: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onStart }) => {
  return (
    <div className="min-h-screen bg-white font-sans text-slate-900 selection:bg-blue-100">
      {/* Navbar */}
      <nav className="max-w-6xl mx-auto px-6 py-6 flex justify-between items-center">
        <div className="flex items-center gap-2 text-blue-600 font-bold text-xl tracking-tight">
           <div className="w-6 h-6 bg-blue-600 rounded-sm"></div>
           <span className="text-slate-900">GymPulse</span>
        </div>
        <div className="flex items-center gap-4">
           <button className="text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors hidden sm:block">Log in</button>
           <Button onClick={onStart} className="!px-5 !py-2">Comenzar</Button>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="max-w-4xl mx-auto px-6 pt-20 pb-16 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-600 text-xs font-semibold uppercase tracking-wide mb-8">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
          </span>
          Nuevo: Pagos Automatizados 2.0
        </div>
        
        <h1 className="text-5xl sm:text-7xl font-bold tracking-tight text-slate-900 mb-8 leading-[1.1]">
          El sistema operativo para <br className="hidden sm:block" />
          <span className="text-slate-900">gimnasios modernos.</span>
        </h1>
        
        <p className="text-xl text-slate-500 mb-10 leading-relaxed max-w-2xl mx-auto font-light">
          Administra miembros, cobros y clases en una plataforma diseñada para ser invisible. Menos clics, más entrenamiento.
        </p>
        
        <div className="flex flex-col sm:flex-row justify-center gap-4 mb-12">
          <Button onClick={onStart} className="!px-8 !py-4 !text-base h-auto">
            Prueba Gratis de 14 días
            <ArrowRight className="ml-2 w-4 h-4" />
          </Button>
          <Button variant="secondary" className="!px-8 !py-4 !text-base h-auto bg-white hover:bg-slate-50">
            Ver Demo
          </Button>
        </div>

        <div className="flex flex-wrap justify-center gap-x-8 gap-y-4 text-sm text-slate-400">
          <span className="flex items-center gap-2"><Check size={14} className="text-blue-600"/> Sin tarjeta de crédito</span>
          <span className="flex items-center gap-2"><Check size={14} className="text-blue-600"/> Cancelación inmediata</span>
          <span className="flex items-center gap-2"><Check size={14} className="text-blue-600"/> Soporte 24/7</span>
        </div>
      </main>

      {/* Abstract Dashboard UI */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 mb-24">
        <div className="relative rounded-xl bg-slate-50 border border-slate-200 p-2 sm:p-4">
           <div className="absolute inset-x-0 -top-20 h-20 bg-gradient-to-t from-white via-white to-transparent z-10"></div>
           <div className="rounded-lg bg-white border border-slate-200 shadow-sm aspect-[16/9] overflow-hidden flex flex-col">
              {/* Fake Header */}
              <div className="h-12 border-b border-slate-100 flex items-center px-6 gap-4">
                <div className="w-3 h-3 rounded-full bg-slate-200"></div>
                <div className="w-3 h-3 rounded-full bg-slate-200"></div>
                <div className="flex-1"></div>
                <div className="w-20 h-2 rounded bg-slate-100"></div>
              </div>
              {/* Fake Content */}
              <div className="p-8 flex gap-8 h-full">
                 <div className="w-48 hidden sm:flex flex-col gap-4 border-r border-slate-50 pr-8">
                    <div className="w-full h-8 bg-blue-50 rounded-md"></div>
                    <div className="w-2/3 h-4 bg-slate-50 rounded-md"></div>
                    <div className="w-3/4 h-4 bg-slate-50 rounded-md"></div>
                    <div className="w-1/2 h-4 bg-slate-50 rounded-md"></div>
                 </div>
                 <div className="flex-1 flex flex-col gap-6">
                    <div className="flex gap-4">
                       <div className="flex-1 h-32 bg-slate-50 rounded-lg border border-slate-100"></div>
                       <div className="flex-1 h-32 bg-slate-50 rounded-lg border border-slate-100"></div>
                       <div className="flex-1 h-32 bg-slate-50 rounded-lg border border-slate-100"></div>
                    </div>
                    <div className="flex-1 bg-slate-50 rounded-lg border border-slate-100"></div>
                 </div>
              </div>
           </div>
        </div>
      </div>

      {/* Features Grid */}
      <section className="max-w-6xl mx-auto px-6 py-24 border-t border-slate-100">
        <div className="grid md:grid-cols-3 gap-12 lg:gap-16">
           <div className="group">
              <div className="w-12 h-12 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600 mb-6 group-hover:bg-blue-600 group-hover:text-white transition-colors duration-300">
                <Users size={24} strokeWidth={1.5} />
              </div>
              <h3 className="text-xl font-semibold mb-3 text-slate-900">Gestión de Miembros</h3>
              <p className="text-slate-500 leading-relaxed">
                Todo lo que necesitas saber sobre tus socios en una sola vista. Asistencias, pagos y notas personales.
              </p>
           </div>
           
           <div className="group">
              <div className="w-12 h-12 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600 mb-6 group-hover:bg-blue-600 group-hover:text-white transition-colors duration-300">
                <Zap size={24} strokeWidth={1.5} />
              </div>
              <h3 className="text-xl font-semibold mb-3 text-slate-900">Cobros Automáticos</h3>
              <p className="text-slate-500 leading-relaxed">
                Olvídate de perseguir pagos. El sistema gestiona renovaciones, facturas y reintentos automáticamente.
              </p>
           </div>
           
           <div className="group">
              <div className="w-12 h-12 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600 mb-6 group-hover:bg-blue-600 group-hover:text-white transition-colors duration-300">
                <BarChart3 size={24} strokeWidth={1.5} />
              </div>
              <h3 className="text-xl font-semibold mb-3 text-slate-900">Métricas Reales</h3>
              <p className="text-slate-500 leading-relaxed">
                Reportes limpios que te dicen exactamente cómo va tu negocio. Ingresos, retención y crecimiento.
              </p>
           </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-100 py-12">
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2 text-slate-900 font-bold">
            <div className="w-4 h-4 bg-slate-900 rounded-sm"></div>
            GymPulse
          </div>
          <p className="text-slate-400 text-sm">© 2024 GymPulse Inc. Diseñado para la simplicidad.</p>
          <div className="flex gap-6 text-sm font-medium text-slate-500">
            <a href="#" className="hover:text-slate-900">Twitter</a>
            <a href="#" className="hover:text-slate-900">Instagram</a>
            <a href="#" className="hover:text-slate-900">Email</a>
          </div>
        </div>
      </footer>
    </div>
  );
};