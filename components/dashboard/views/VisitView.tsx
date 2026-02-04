import React, { useState, useEffect } from 'react';
import { QrCode, CheckCircle2, User, LogOut, LogIn } from 'lucide-react';
import { Button } from '../../ui/Button';

export const VisitView: React.FC = () => {
    const [idInput, setIdInput] = useState('');
    const [status, setStatus] = useState<'idle' | 'success'>('idle');
    const [feedback, setFeedback] = useState<{ type: 'in' | 'out', name: string } | null>(null);

    const handleCheck = (e: React.FormEvent) => {
        e.preventDefault();
        if (!idInput.trim()) return;

        // Simulate logic: Randomly decide if it's check-in or check-out for demo
        // In real app, this would query the backend
        const isEntry = Math.random() > 0.5;

        setFeedback({
            type: isEntry ? 'in' : 'out',
            name: 'Juan Pérez' // Mock user name
        });
        setStatus('success');
        setIdInput('');
    };

    useEffect(() => {
        if (status === 'success') {
            const timer = setTimeout(() => {
                setStatus('idle');
                setFeedback(null);
            }, 3000); // Reset after 3 seconds
            return () => clearTimeout(timer);
        }
    }, [status]);

    return (
        <div className="max-w-lg mx-auto mt-10 animate-in fade-in slide-in-from-bottom-2 duration-500">
            {status === 'idle' ? (
                <div className="bg-white p-8 rounded-xl border border-slate-200 shadow-sm text-center">
                    <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-6">
                        <QrCode size={32} />
                    </div>
                    <h2 className="text-2xl font-bold text-slate-900 mb-2">Punto de Acceso</h2>
                    <p className="text-slate-500 mb-8">Escanea tu código o ingresa tu ID para registrar tu entrada o salida.</p>

                    <form onSubmit={handleCheck} className="space-y-4">
                        <input
                            type="text"
                            placeholder="Ingresa tu ID"
                            value={idInput}
                            onChange={(e) => setIdInput(e.target.value)}
                            className="w-full text-center text-lg px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all placeholder:text-slate-300"
                            autoFocus
                        />
                        <Button type="submit" className="w-full !py-3 !text-base shadow-none">
                            Registrar
                        </Button>
                    </form>

                </div>
            ) : (
                <div className={`p-8 rounded-xl border shadow-sm text-center animate-in zoom-in-95 duration-300 ${feedback?.type === 'in' ? 'bg-green-50 border-green-100' : 'bg-orange-50 border-orange-100'}`}>
                    <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 ${feedback?.type === 'in' ? 'bg-green-100 text-green-600' : 'bg-orange-100 text-orange-600'}`}>
                        {feedback?.type === 'in' ? <LogIn size={40} /> : <LogOut size={40} />}
                    </div>

                    <h2 className={`text-2xl font-bold mb-2 ${feedback?.type === 'in' ? 'text-green-700' : 'text-orange-700'}`}>
                        {feedback?.type === 'in' ? '¡Bienvenido!' : '¡Hasta Luego!'}
                    </h2>

                    <div className="bg-white/60 rounded-lg p-4 mt-6 inline-flex items-center gap-3 mx-auto">
                        <div className="w-10 h-10 bg-slate-200 rounded-full flex items-center justify-center text-slate-500">
                            <User size={20} />
                        </div>
                        <div className="text-left">
                            <p className="font-semibold text-slate-900">{feedback?.name}</p>
                            <p className="text-xs text-slate-500">{feedback?.type === 'in' ? 'Entrada registrada' : 'Salida registrada'}</p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
