import React, { useState } from 'react';
import { Button } from '../../ui/Button';
import { Input } from '../../ui/Input';
import { Lock, CreditCard, Monitor } from 'lucide-react';
import { KIOSK_PIN_KEY, getKioskPin } from './kiosk/KioskPinModal';

export const SettingsView: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'security' | 'billing' | 'kiosk'>('security');
    const [currentPin, setCurrentPin] = useState('');
    const [newPin, setNewPin] = useState('');
    const [confirmPin, setConfirmPin] = useState('');
    const [pinMessage, setPinMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    const handlePinChange = (e: React.FormEvent) => {
        e.preventDefault();
        setPinMessage(null);

        if (currentPin !== getKioskPin()) {
            setPinMessage({ type: 'error', text: 'El PIN actual es incorrecto.' });
            return;
        }
        if (newPin.length !== 4 || !/^\d{4}$/.test(newPin)) {
            setPinMessage({ type: 'error', text: 'El nuevo PIN debe ser de 4 dígitos numéricos.' });
            return;
        }
        if (newPin !== confirmPin) {
            setPinMessage({ type: 'error', text: 'Los PINs no coinciden.' });
            return;
        }

        localStorage.setItem(KIOSK_PIN_KEY, newPin);
        setCurrentPin('');
        setNewPin('');
        setConfirmPin('');
        setPinMessage({ type: 'success', text: 'PIN actualizado correctamente.' });
    };

    return (
        <div className="max-w-4xl mx-auto animate-in fade-in duration-500">
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Configuración</h2>
            <p className="text-slate-500 mb-8">Administra tu cuenta, contraseña y métodos de pago.</p>

            {/* Tabs */}
            <div className="flex border-b border-slate-100 mb-8">
                <button
                    onClick={() => setActiveTab('security')}
                    className={`flex items-center gap-2 px-6 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'security'
                            ? 'border-blue-600 text-blue-600'
                            : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                        }`}
                >
                    <Lock size={16} />
                    Seguridad
                </button>
                <button
                    onClick={() => setActiveTab('billing')}
                    className={`flex items-center gap-2 px-6 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'billing'
                            ? 'border-blue-600 text-blue-600'
                            : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                        }`}
                >
                    <CreditCard size={16} />
                    Facturación
                </button>
                <button
                    onClick={() => setActiveTab('kiosk')}
                    className={`flex items-center gap-2 px-6 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'kiosk'
                            ? 'border-blue-600 text-blue-600'
                            : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                        }`}
                >
                    <Monitor size={16} />
                    Modo Kiosco
                </button>
            </div>

            {/* Content */}
            <div className="bg-white p-8 rounded-xl border border-slate-100 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.02)]">
                {activeTab === 'security' && (
                    <div className="max-w-md space-y-6 animate-in fade-in duration-300">
                        <div>
                            <h3 className="text-lg font-semibold text-slate-900">Cambiar Contraseña</h3>
                            <p className="text-sm text-slate-500 mt-1">Asegúrate de usar una contraseña segura.</p>
                        </div>

                        <div className="space-y-4">
                            <Input label="Contraseña Actual" type="password" placeholder="••••••••" />
                            <Input label="Nueva Contraseña" type="password" placeholder="••••••••" />
                            <Input label="Confirmar Contraseña" type="password" placeholder="••••••••" />
                        </div>

                        <div className="pt-2">
                            <Button>Actualizar Contraseña</Button>
                        </div>
                    </div>
                )}

                {activeTab === 'billing' && (
                    <div className="space-y-8 animate-in fade-in duration-300">
                        <div>
                            <h3 className="text-lg font-semibold text-slate-900">Métodos de Pago</h3>
                            <p className="text-sm text-slate-500 mt-1">Gestiona tus tarjetas y facturación.</p>
                        </div>

                        <div className="p-4 border border-slate-200 rounded-lg flex items-center justify-between bg-slate-50/50">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-8 bg-slate-200 rounded flex items-center justify-center text-xs font-bold text-slate-500">
                                    VISA
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-slate-900">Visa terminada en 4242</p>
                                    <p className="text-xs text-slate-500">Expira en 12/2026</p>
                                </div>
                            </div>
                            <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-1 rounded">Predeterminada</span>
                        </div>

                        <div>
                            <Button variant="outline" className="gap-2">
                                <CreditCard size={16} />
                                Agregar nuevo método de pago
                            </Button>
                        </div>
                    </div>
                )}

                {activeTab === 'kiosk' && (
                    <div className="max-w-md space-y-6 animate-in fade-in duration-300">
                        <div>
                            <h3 className="text-lg font-semibold text-slate-900">PIN del Modo Kiosco</h3>
                            <p className="text-sm text-slate-500 mt-1">
                                Cambia el PIN que se usa para desbloquear el modo kiosco.
                            </p>
                        </div>

                        <form onSubmit={handlePinChange} className="space-y-4">
                            <Input
                                label="PIN Actual"
                                type="password"
                                inputMode="numeric"
                                maxLength={4}
                                placeholder="••••"
                                value={currentPin}
                                onChange={(e) => setCurrentPin(e.target.value)}
                            />
                            <Input
                                label="Nuevo PIN"
                                type="password"
                                inputMode="numeric"
                                maxLength={4}
                                placeholder="••••"
                                value={newPin}
                                onChange={(e) => setNewPin(e.target.value)}
                            />
                            <Input
                                label="Confirmar Nuevo PIN"
                                type="password"
                                inputMode="numeric"
                                maxLength={4}
                                placeholder="••••"
                                value={confirmPin}
                                onChange={(e) => setConfirmPin(e.target.value)}
                            />

                            {pinMessage && (
                                <p className={`text-sm ${pinMessage.type === 'success' ? 'text-green-600' : 'text-red-500'}`}>
                                    {pinMessage.text}
                                </p>
                            )}

                            <div className="pt-2">
                                <Button type="submit">Actualizar PIN</Button>
                            </div>
                        </form>
                    </div>
                )}
            </div>
        </div>
    );
};
