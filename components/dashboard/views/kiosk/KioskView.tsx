import React, { useState } from 'react';
import { Lock } from 'lucide-react';
import { VisitView } from '../VisitView';
import { KioskPinModal } from './KioskPinModal';

interface KioskViewProps {
    branchId: string;
    onExit: () => void;
}

export const KioskView: React.FC<KioskViewProps> = ({ branchId, onExit }) => {
    const [showPin, setShowPin] = useState(false);

    return (
        <div className="min-h-screen bg-[#FAFAFA] flex flex-col">
            {/* Minimal header with logo and lock icon */}
            <header className="h-14 bg-white border-b border-slate-100 flex items-center justify-between px-6 shrink-0">
                <div className="flex items-center gap-2 text-blue-600 font-bold text-lg tracking-tight">
                    <img src="icon.png" alt="EigenFit Logo" className="w-5 h-5" />
                    <span className="text-slate-900">EigenFit</span>
                </div>
                <button
                    onClick={() => setShowPin(true)}
                    className="p-2 text-slate-300 hover:text-slate-500 transition-colors"
                    title="Desbloquear"
                >
                    <Lock size={18} />
                </button>
            </header>

            {/* Visit view content */}
            <div className="flex-1 overflow-auto p-6 sm:p-8">
                <VisitView branchId={branchId} />
            </div>

            {/* PIN modal */}
            {showPin && (
                <KioskPinModal
                    onSuccess={onExit}
                    onClose={() => setShowPin(false)}
                />
            )}
        </div>
    );
};
