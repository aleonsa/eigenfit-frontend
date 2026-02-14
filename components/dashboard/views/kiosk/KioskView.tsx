import React, { useState } from 'react';
import { Lock } from 'lucide-react';
import { VisitView } from '../VisitView';
import { KioskPinModal } from './KioskPinModal';

interface KioskViewProps {
    branchId: string;
    branchName: string;
    onExit: () => void;
}

export const KioskView: React.FC<KioskViewProps> = ({ branchId, branchName, onExit }) => {
    const [showPin, setShowPin] = useState(false);

    return (
        <div className="min-h-screen bg-[#FAFAFA] flex flex-col">
            {/* Minimal header with branch name and lock icon */}
            <header className="h-14 bg-white border-b border-slate-100 flex items-center justify-between px-6 shrink-0">
                <h2 className="text-lg font-bold text-slate-900 tracking-tight truncate" title={branchName}>
                    {branchName}
                </h2>
                <button
                    onClick={() => setShowPin(true)}
                    className="p-2 rounded-md bg-blue-50 text-blue-500 hover:bg-blue-100 hover:text-blue-600 transition-colors"
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
