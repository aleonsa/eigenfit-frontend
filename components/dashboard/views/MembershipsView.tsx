import React, { useState } from 'react';
import { Plus, Trash2, CreditCard, Edit2 } from 'lucide-react';
import { Button } from '../../ui/Button';
import { Modal } from '../../ui/Modal';
import { Input } from '../../ui/Input';

interface Membership {
    id: string;
    title: string;
    description: string;
    duration: number; // in months
    price: number;
}

export const MembershipsView: React.FC = () => {
    const [memberships, setMemberships] = useState<Membership[]>([
        { id: '1', title: 'Gimnasio', description: 'Acceso a área de pesas y cardio', duration: 1, price: 400 },
        { id: '2', title: 'Kickboxing', description: 'Clases de defensa personal', duration: 1, price: 450 },
        { id: '3', title: 'Alberca 4 dias', description: 'Acceso a alberca y regaderas', duration: 1, price: 800 },
        { id: '4', title: 'Regadera', description: 'Uso exclusivo de regaderas', duration: 1, price: 100 },
    ]);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [formData, setFormData] = useState({ title: '', description: '', duration: '', price: '' });

    const handleOpenModal = (membership?: Membership) => {
        if (membership) {
            setEditingId(membership.id);
            setFormData({
                title: membership.title,
                description: membership.description,
                duration: membership.duration.toString(),
                price: membership.price.toString()
            });
        } else {
            setEditingId(null);
            setFormData({ title: '', description: '', duration: '', price: '' });
        }
        setIsModalOpen(true);
    };

    const handleSave = () => {
        if (editingId) {
            // Edit existing
            setMemberships(prev => prev.map(m => m.id === editingId ? {
                ...m,
                title: formData.title,
                description: formData.description,
                duration: Number(formData.duration),
                price: Number(formData.price)
            } : m));
        } else {
            // Create new
            const newMembership: Membership = {
                id: Date.now().toString(),
                title: formData.title,
                description: formData.description,
                duration: Number(formData.duration),
                price: Number(formData.price)
            };
            setMemberships([...memberships, newMembership]);
        }
        setIsModalOpen(false);
    };

    const handleDelete = (id: string) => {
        setMemberships(prev => prev.filter(m => m.id !== id));
    };

    return (
        <div className="max-w-4xl mx-auto animate-in fade-in duration-500">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h2 className="text-xl font-bold text-slate-900">Membresías</h2>
                    <p className="text-sm text-slate-500 mt-1">Administra los planes y paquetes de tu gimnasio.</p>
                </div>
                <Button className="gap-2" onClick={() => handleOpenModal()}>
                    <Plus size={16} />
                    Nueva Membresía
                </Button>
            </div>

            <div className="space-y-3">
                {memberships.map((membership) => (
                    <div
                        key={membership.id}
                        className="group flex flex-col sm:flex-row sm:items-center gap-4 p-4 bg-white rounded-lg border border-slate-100 shadow-[0_2px_8px_-4px_rgba(0,0,0,0.02)] hover:shadow-md hover:border-blue-100 transition-all duration-200"
                    >
                        <div className="flex-1 grid grid-cols-1 sm:grid-cols-12 gap-4 items-center">

                            <div className="sm:col-span-3">
                                <label className="text-xs font-semibold text-slate-400 uppercase mb-1 block sm:hidden">Título</label>
                                <span className="font-medium text-slate-900 text-sm">{membership.title}</span>
                            </div>

                            <div className="sm:col-span-5">
                                <label className="text-xs font-semibold text-slate-400 uppercase mb-1 block sm:hidden">Descripción</label>
                                <span className="text-sm text-slate-500 truncate block">{membership.description}</span>
                            </div>

                            <div className="sm:col-span-2">
                                <label className="text-xs font-semibold text-slate-400 uppercase mb-1 block sm:hidden">Duración</label>
                                <span className="text-sm text-slate-600 bg-slate-50 px-2 py-1 rounded-md inline-block">
                                    {membership.duration} {membership.duration === 1 ? 'Mes' : 'Meses'}
                                </span>
                            </div>

                            <div className="sm:col-span-2">
                                <label className="text-xs font-semibold text-slate-400 uppercase mb-1 block sm:hidden">Precio</label>
                                <span className="font-bold text-slate-900">${membership.price}</span>
                            </div>

                        </div>

                        <div className="flex items-center gap-2 border-t sm:border-t-0 border-slate-50 pt-3 sm:pt-0 mt-2 sm:mt-0 justify-end">
                            <button
                                onClick={() => handleOpenModal(membership)}
                                className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                                title="Editar"
                            >
                                <Edit2 size={16} />
                            </button>
                            <button
                                onClick={() => handleDelete(membership.id)}
                                className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors"
                                title="Eliminar"
                            >
                                <Trash2 size={16} />
                            </button>
                        </div>
                    </div>
                ))}

                {memberships.length === 0 && (
                    <div className="text-center py-12 bg-white rounded-lg border border-slate-100 border-dashed">
                        <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-3 text-slate-400">
                            <CreditCard size={20} />
                        </div>
                        <h3 className="text-sm font-medium text-slate-900">No hay membresías</h3>
                        <p className="text-xs text-slate-500 mt-1">Crea una nueva membresía para comenzar.</p>
                    </div>
                )}
            </div>

            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={editingId ? 'Editar Membresía' : 'Nueva Membresía'}
            >
                <div className="space-y-4">
                    <Input
                        label="Título"
                        placeholder="Ej. Mensualidad Gym"
                        value={formData.title}
                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    />
                    <Input
                        label="Descripción"
                        placeholder="Ej. Acceso a todas las áreas"
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    />
                    <div className="grid grid-cols-2 gap-4">
                        <Input
                            label="Duración (Meses)"
                            type="number"
                            placeholder="1"
                            value={formData.duration}
                            onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                        />
                        <Input
                            label="Precio"
                            type="number"
                            placeholder="0.00"
                            value={formData.price}
                            onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                        />
                    </div>
                    <div className="pt-2 flex justify-end gap-3">
                        <Button variant="outline" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
                        <Button onClick={handleSave}>Guardar</Button>
                    </div>
                </div>
            </Modal>

        </div>
    );
};
