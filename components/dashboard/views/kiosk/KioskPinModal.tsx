import React, { useState, useRef, useEffect } from 'react';
import { X } from 'lucide-react';

export const KIOSK_PIN_KEY = 'eigenfit_kiosk_pin';
export const DEFAULT_KIOSK_PIN = '1234';

export function getKioskPin(): string {
    return localStorage.getItem(KIOSK_PIN_KEY) || DEFAULT_KIOSK_PIN;
}

interface KioskPinModalProps {
    onSuccess: () => void;
    onClose: () => void;
}

export const KioskPinModal: React.FC<KioskPinModalProps> = ({ onSuccess, onClose }) => {
    const [digits, setDigits] = useState<string[]>(['', '', '', '']);
    const [error, setError] = useState(false);
    const inputsRef = useRef<(HTMLInputElement | null)[]>([]);

    useEffect(() => {
        inputsRef.current[0]?.focus();
    }, []);

    const handleChange = (index: number, value: string) => {
        if (!/^\d?$/.test(value)) return;

        const newDigits = [...digits];
        newDigits[index] = value;
        setDigits(newDigits);
        setError(false);

        if (value && index < 3) {
            inputsRef.current[index + 1]?.focus();
        }

        // Check PIN when all digits are filled
        if (value && index === 3) {
            const pin = newDigits.join('');
            if (pin === getKioskPin()) {
                onSuccess();
            } else {
                setError(true);
                setTimeout(() => {
                    setDigits(['', '', '', '']);
                    inputsRef.current[0]?.focus();
                }, 600);
            }
        }
    };

    const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
        if (e.key === 'Backspace' && !digits[index] && index > 0) {
            inputsRef.current[index - 1]?.focus();
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100]">
            <div className="bg-white rounded-2xl p-8 w-full max-w-sm mx-4 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-semibold text-slate-900">Ingresa el PIN</h3>
                    <button
                        onClick={onClose}
                        className="p-1 text-slate-400 hover:text-slate-600 transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                <p className="text-sm text-slate-500 mb-6">
                    Ingresa el PIN de administrador para desbloquear.
                </p>

                <div className="flex gap-3 justify-center mb-6">
                    {digits.map((digit, i) => (
                        <input
                            key={i}
                            ref={el => { inputsRef.current[i] = el; }}
                            type="password"
                            inputMode="numeric"
                            maxLength={1}
                            value={digit}
                            onChange={e => handleChange(i, e.target.value)}
                            onKeyDown={e => handleKeyDown(i, e)}
                            className={`w-14 h-14 text-center text-2xl font-bold rounded-xl border-2 transition-all duration-200 outline-none ${
                                error
                                    ? 'border-red-400 bg-red-50 animate-shake'
                                    : 'border-slate-200 bg-slate-50 focus:border-blue-500 focus:bg-white'
                            }`}
                        />
                    ))}
                </div>

                {error && (
                    <p className="text-center text-sm text-red-500 animate-in fade-in duration-200">
                        PIN incorrecto. Intenta de nuevo.
                    </p>
                )}
            </div>
        </div>
    );
};
