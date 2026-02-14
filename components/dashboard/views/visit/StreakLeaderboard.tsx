import React from 'react';
import { Flame, Trophy } from 'lucide-react';

const medals = ['🥇', '🥈', '🥉'];

export interface StreakLeaderboardItem {
    memberId: string;
    memberName: string;
    monthVisits: number;
    streakDays: number;
    rank: number;
}

interface StreakLeaderboardProps {
    className?: string;
    items: StreakLeaderboardItem[];
    loading?: boolean;
    error?: string;
}

const LoadingRows: React.FC = () => (
    <div className="divide-y divide-slate-50 flex-1">
        {Array.from({ length: 5 }).map((_, idx) => (
            <div key={idx} className="flex items-center gap-3 px-6 py-3.5">
                <div className="w-8 h-5 rounded bg-slate-100 animate-pulse" />
                <div className="w-9 h-9 rounded-full bg-slate-100 animate-pulse" />
                <div className="flex-1 space-y-1.5">
                    <div className="h-3 w-2/3 rounded bg-slate-100 animate-pulse" />
                    <div className="h-2.5 w-1/3 rounded bg-slate-100 animate-pulse" />
                </div>
                <div className="w-12 h-6 rounded-full bg-slate-100 animate-pulse" />
            </div>
        ))}
    </div>
);

export const StreakLeaderboard: React.FC<StreakLeaderboardProps> = ({
    className = '',
    items,
    loading = false,
    error = '',
}) => {
    const showEmpty = !loading && !error && items.length === 0;

    const renderBody = () => {
        if (loading) {
            return <LoadingRows />;
        }

        if (error) {
            return (
                <div className="flex-1 flex items-center justify-center px-6">
                    <p className="text-sm text-orange-600 text-center">{error}</p>
                </div>
            );
        }

        if (showEmpty) {
            return (
                <div className="flex-1 flex items-center justify-center px-6">
                    <p className="text-sm text-slate-500 text-center">Aun no hay datos de racha este mes.</p>
                </div>
            );
        }

        return (
            <div className="divide-y divide-slate-50 flex-1">
                {items.map((member, idx) => (
                    <div
                        key={member.memberId}
                        className={`flex items-center gap-3 px-6 py-3.5 transition-colors ${
                            idx === 0 ? 'bg-amber-50/50' : ''
                        }`}
                    >
                        <span className="text-xl w-8 text-center flex-shrink-0">
                            {idx < 3 ? medals[idx] : (
                                <span className="text-sm font-semibold text-slate-400">
                                    {member.rank}
                                </span>
                            )}
                        </span>

                        <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold flex-shrink-0 ${
                            idx === 0
                                ? 'bg-amber-100 text-amber-700'
                                : idx === 1
                                ? 'bg-slate-200 text-slate-600'
                                : idx === 2
                                ? 'bg-orange-100 text-orange-700'
                                : 'bg-slate-100 text-slate-500'
                        }`}>
                            {member.memberName.split(' ').map(name => name[0]).join('').slice(0, 2).toUpperCase()}
                        </div>

                        <div className="flex-1 min-w-0">
                            <p className={`text-sm font-medium truncate ${
                                idx === 0 ? 'text-amber-900' : 'text-slate-800'
                            }`}>
                                {member.memberName}
                            </p>
                            <p className="text-xs text-slate-400">
                                {member.monthVisits} visitas este mes
                            </p>
                        </div>

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
        );
    };

    return (
        <div className={`bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden h-full flex flex-col ${className}`}>
            <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
                <Trophy size={20} className="text-amber-500" />
                <h3 className="text-lg font-bold text-slate-900">Racha del Mes</h3>
            </div>

            {renderBody()}

            <div className="px-6 py-3 bg-slate-50/50 border-t border-slate-100">
                <p className="text-[11px] text-slate-400 text-center">
                    Domingos no cuentan · 2 descansos permitidos por semana. Es decir, si visitas el gimnasio 4 veces por semana, mantienes tu racha.
                </p>
            </div>
        </div>
    );
}
