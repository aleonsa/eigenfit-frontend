import React, { useId, useRef } from 'react';
import { X } from 'lucide-react';
import { useDialogFocus } from '../../hooks/useDialogFocus';

interface DrawerProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
    subtitle?: string;
    width?: string;
}

export const Drawer: React.FC<DrawerProps> = ({
    isOpen,
    onClose,
    title,
    subtitle,
    children,
    width = 'max-w-lg'
}) => {
    const panelRef = useRef<HTMLDivElement>(null);
    const titleId = useId();
    useDialogFocus(isOpen, panelRef, onClose);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 overflow-hidden">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-slate-900/20 backdrop-blur-sm transition-opacity animate-in fade-in duration-300"
                onClick={onClose}
            />

            {/* Drawer Content */}
            <div className="fixed inset-y-0 right-0 flex pl-10">
                <div
                    ref={panelRef}
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby={titleId}
                    tabIndex={-1}
                    className={`w-screen ${width} outline-none transform transition-transform duration-300 ease-in-out bg-white shadow-2xl h-full flex flex-col animate-in slide-in-from-right`}>
                    <div className="px-6 py-6 border-b border-slate-100 flex items-start justify-between bg-white shrink-0">
                        <div>
                            <h2 id={titleId} className="text-xl font-semibold text-slate-900">{title}</h2>
                            {subtitle && <p className="text-sm text-slate-500 mt-1">{subtitle}</p>}
                        </div>
                        <button
                            type="button"
                            aria-label="Cerrar"
                            onClick={onClose}
                            className="text-slate-400 hover:text-slate-600 p-2 rounded-md hover:bg-slate-50 transition-colors -mr-2"
                        >
                            <X size={20} />
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-6">
                        {children}
                    </div>
                </div>
            </div>
        </div>
    );
};
