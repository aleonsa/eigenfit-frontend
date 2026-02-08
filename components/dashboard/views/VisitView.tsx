import React, { useState, useCallback } from 'react';
import { QrCode } from 'lucide-react';
import { Button } from '../../ui/Button';
import { StreakLeaderboard } from './visit/StreakLeaderboard';
import { CheckInFeedback } from './visit/CheckInFeedback';
import { getMemberById, getMemberPosition, type MockMember } from './visit/mockStreakData';

interface FeedbackData {
    type: 'in' | 'out';
    member: MockMember;
    position: number;
}

export const VisitView: React.FC = () => {
    const [idInput, setIdInput] = useState('');
    const [feedback, setFeedback] = useState<FeedbackData | null>(null);
    const [error, setError] = useState('');

    const handleCheck = (e: React.FormEvent) => {
        e.preventDefault();
        const id = idInput.trim();
        if (!id) return;

        const member = getMemberById(id);
        if (!member) {
            setError('Miembro no encontrado. Intenta con IDs 101-112.');
            setIdInput('');
            setTimeout(() => setError(''), 3000);
            return;
        }

        // Mock: randomly decide check-in or check-out
        const isEntry = Math.random() > 0.3; // 70% chance check-in for better demo

        setFeedback({
            type: isEntry ? 'in' : 'out',
            member,
            position: getMemberPosition(id),
        });
        setIdInput('');
        setError('');
    };

    const closeFeedback = useCallback(() => {
        setFeedback(null);
    }, []);

    return (
        <div className="max-w-4xl mx-auto mt-8 px-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                {/* Left: Check-in form */}
                <div className="bg-white p-8 rounded-xl border border-slate-200 shadow-sm text-center">
                    <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-6">
                        <QrCode size={32} />
                    </div>
                    <h2 className="text-2xl font-bold text-slate-900 mb-2">Punto de Acceso</h2>
                    <p className="text-slate-500 mb-8">Ingresa tu ID para registrar tu entrada o salida.</p>

                    <form onSubmit={handleCheck} className="space-y-4">
                        <input
                            type="text"
                            placeholder="Ingresa tu ID (ej: 101)"
                            value={idInput}
                            onChange={(e) => setIdInput(e.target.value)}
                            className="w-full text-center text-lg px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all placeholder:text-slate-300"
                            autoFocus
                        />
                        <Button type="submit" className="w-full !py-3 !text-base shadow-none">
                            Registrar
                        </Button>
                    </form>

                    {error && (
                        <p className="mt-4 text-sm text-red-500 animate-in fade-in duration-200">
                            {error}
                        </p>
                    )}

                    <p className="mt-6 text-xs text-slate-300">
                        IDs de prueba: 101 - 112
                    </p>
                </div>

                {/* Right: Leaderboard */}
                <StreakLeaderboard />
            </div>

            {/* Check-in feedback overlay */}
            {feedback && (
                <CheckInFeedback
                    type={feedback.type}
                    member={feedback.member}
                    position={feedback.position}
                    onClose={closeFeedback}
                />
            )}
        </div>
    );
};
