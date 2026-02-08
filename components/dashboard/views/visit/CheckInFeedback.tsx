import React, { useEffect } from 'react';
import { Flame, LogIn, LogOut, TrendingUp, Award } from 'lucide-react';
import type { MockMember } from './mockStreakData';

interface CheckInFeedbackProps {
    type: 'in' | 'out';
    member: MockMember;
    position: number;
    onClose: () => void;
}

export const CheckInFeedback: React.FC<CheckInFeedbackProps> = ({
    type,
    member,
    position,
    onClose,
}) => {
    useEffect(() => {
        const timer = setTimeout(onClose, 5000);
        return () => clearTimeout(timer);
    }, [onClose]);

    const isCheckIn = type === 'in';
    const isTop5 = position <= 5;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-slate-900/30 backdrop-blur-sm animate-in fade-in duration-200"
                onClick={onClose}
            />

            {/* Card */}
            <div className="relative w-full max-w-sm animate-in zoom-in-95 slide-in-from-bottom-4 duration-300">
                <div className={`rounded-2xl border shadow-xl overflow-hidden ${
                    isCheckIn
                        ? isTop5
                            ? 'bg-gradient-to-b from-amber-50 to-white border-amber-200'
                            : 'bg-gradient-to-b from-green-50 to-white border-green-200'
                        : 'bg-gradient-to-b from-orange-50 to-white border-orange-200'
                }`}>
                    {/* Top icon section */}
                    <div className="pt-8 pb-4 text-center">
                        <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3 ${
                            isCheckIn
                                ? isTop5
                                    ? 'bg-amber-100 text-amber-600'
                                    : 'bg-green-100 text-green-600'
                                : 'bg-orange-100 text-orange-600'
                        }`}>
                            {isCheckIn
                                ? isTop5 ? <Award size={32} /> : <LogIn size={32} />
                                : <LogOut size={32} />
                            }
                        </div>

                        <h2 className={`text-2xl font-bold ${
                            isCheckIn
                                ? isTop5 ? 'text-amber-800' : 'text-green-700'
                                : 'text-orange-700'
                        }`}>
                            {isCheckIn ? '¡Bienvenido!' : '¡Hasta Luego!'}
                        </h2>
                        <p className="text-slate-600 font-medium mt-1">{member.name}</p>
                    </div>

                    {/* Stats section - only on check-in */}
                    {isCheckIn && (
                        <div className="px-6 pb-6 space-y-3">
                            {/* Streak */}
                            <div className="bg-white rounded-xl border border-slate-100 p-4 flex items-center gap-3">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                                    isTop5 ? 'bg-amber-100' : 'bg-orange-50'
                                }`}>
                                    <Flame size={20} className={isTop5 ? 'text-amber-500' : 'text-orange-400'} />
                                </div>
                                <div className="flex-1">
                                    <p className="text-xs text-slate-400 font-medium">Tu racha actual</p>
                                    <p className="text-xl font-bold text-slate-900">
                                        {member.streakDays + 1} días
                                    </p>
                                </div>
                            </div>

                            {/* Position */}
                            <div className="bg-white rounded-xl border border-slate-100 p-4 flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center flex-shrink-0">
                                    <TrendingUp size={20} className="text-blue-500" />
                                </div>
                                <div className="flex-1">
                                    <p className="text-xs text-slate-400 font-medium">Tu posición</p>
                                    <p className="text-xl font-bold text-slate-900">
                                        #{position}
                                        {isTop5 && (
                                            <span className="text-sm font-medium text-amber-600 ml-2">
                                                ¡Top 5!
                                            </span>
                                        )}
                                    </p>
                                </div>
                            </div>

                        </div>
                    )}

                    {/* Checkout simple message */}
                    {!isCheckIn && (
                        <div className="px-6 pb-6">
                            <div className="bg-white/60 rounded-xl p-4 text-center">
                                <p className="text-sm text-slate-500">Salida registrada</p>
                                <p className="text-sm text-slate-400 mt-1">¡Te esperamos mañana!</p>
                            </div>
                        </div>
                    )}

                    {/* Auto-close indicator */}
                    <div className="h-1 bg-slate-100">
                        <div
                            className={`h-full ${
                                isCheckIn
                                    ? isTop5 ? 'bg-amber-400' : 'bg-green-400'
                                    : 'bg-orange-400'
                            }`}
                            style={{
                                animation: 'shrink-width 5s linear forwards',
                            }}
                        />
                    </div>
                    <style>{`
                        @keyframes shrink-width {
                            from { width: 100%; }
                            to { width: 0%; }
                        }
                    `}</style>
                </div>
            </div>
        </div>
    );
};
