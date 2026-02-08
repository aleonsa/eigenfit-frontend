import React from 'react';
import { Flame, Trophy } from 'lucide-react';
import { top5 } from './mockStreakData';

const medals = ['🥇', '🥈', '🥉'];

export const StreakLeaderboard: React.FC = () => {
    return (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
                <Trophy size={20} className="text-amber-500" />
                <h3 className="text-lg font-bold text-slate-900">Racha del Mes</h3>
            </div>

            {/* List */}
            <div className="divide-y divide-slate-50">
                {top5.map((member, idx) => (
                    <div
                        key={member.id}
                        className={`flex items-center gap-3 px-6 py-3.5 transition-colors ${
                            idx === 0 ? 'bg-amber-50/50' : ''
                        }`}
                    >
                        {/* Position */}
                        <span className="text-xl w-8 text-center flex-shrink-0">
                            {idx < 3 ? medals[idx] : (
                                <span className="text-sm font-semibold text-slate-400">
                                    {idx + 1}
                                </span>
                            )}
                        </span>

                        {/* Avatar placeholder */}
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold flex-shrink-0 ${
                            idx === 0
                                ? 'bg-amber-100 text-amber-700'
                                : idx === 1
                                ? 'bg-slate-200 text-slate-600'
                                : idx === 2
                                ? 'bg-orange-100 text-orange-700'
                                : 'bg-slate-100 text-slate-500'
                        }`}>
                            {member.name.split(' ').map(n => n[0]).join('')}
                        </div>

                        {/* Name */}
                        <div className="flex-1 min-w-0">
                            <p className={`text-sm font-medium truncate ${
                                idx === 0 ? 'text-amber-900' : 'text-slate-800'
                            }`}>
                                {member.name}
                            </p>
                            <p className="text-xs text-slate-400">
                                {member.monthVisits} visitas este mes
                            </p>
                        </div>

                        {/* Streak badge */}
                        <div className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold flex-shrink-0 ${
                            idx === 0
                                ? 'bg-amber-100 text-amber-700'
                                : 'bg-slate-100 text-slate-600'
                        }`}>
                            <Flame size={13} className={idx === 0 ? 'text-amber-500' : 'text-slate-400'} />
                            {member.streakDays}d
                        </div>
                    </div>
                ))}
            </div>

            {/* Footer hint */}
            <div className="px-6 py-3 bg-slate-50/50 border-t border-slate-100">
                <p className="text-[11px] text-slate-400 text-center">
                    Domingos no cuentan · 2 descansos permitidos por semana. Es decir, si visitas el gimnasio 4 veces por semana, mantienes tu racha. ¡Sigue así! 🚀
                </p>
            </div>
        </div>
    );
};
