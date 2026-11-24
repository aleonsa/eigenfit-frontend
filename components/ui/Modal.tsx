import React, { useId, useRef } from 'react';
import { X } from 'lucide-react';
import { useDialogFocus } from '../../hooks/useDialogFocus';

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
    width?: string;
}

export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, width = 'max-w-md' }) => {
    const panelRef = useRef<HTMLDivElement>(null);
    const titleId = useId();
    useDialogFocus(isOpen, panelRef, onClose);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-0">
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm transition-opacity animate-in fade-in duration-200"
                onClick={onClose}
            />

            {/* Modal Content */}
            <div
                ref={panelRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby={titleId}
                tabIndex={-1}
                className={`relative outline-none bg-white rounded-xl shadow-xl border border-slate-100 w-full ${width} transform transition-all animate-in zoom-in-95 slide-in-from-bottom-2 duration-200`}>
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-50">
                    <h3 id={titleId} className="text-lg font-semibold text-slate-900">{title}</h3>
                    <button
                        type="button"
                        aria-label="Cerrar"
                        onClick={onClose}
                        className="text-slate-400 hover:text-slate-600 p-1 rounded-md hover:bg-slate-50 transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6">
                    {children}
                </div>
            </div>
        </div>
    );
};
