import React, { useState } from 'react';
import { StepProps } from '../../types';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { ArrowRight, ArrowLeft } from 'lucide-react';

export const AccountStep: React.FC<StepProps> = ({ data, updateData, onNext, onBack }) => {
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!data.firstName) newErrors.firstName = 'Requerido';
    if (!data.lastName) newErrors.lastName = 'Requerido';
    if (!data.gymName) newErrors.gymName = 'Requerido'; // Validate gymName
    if (!data.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) newErrors.email = 'Email inválido';
    if (!data.password || data.password.length < 6) newErrors.password = 'Mínimo 6 caracteres';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) {
      onNext();
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-slate-900">Crear cuenta</h2>
        <p className="text-sm text-slate-500 mt-1">Comienza tu prueba gratuita.</p>
      </div>

      <div className="flex gap-4">
        <Input
          label="Nombre"
          placeholder="Juan"
          value={data.firstName}
          onChange={(e) => updateData({ firstName: e.target.value })}
          error={errors.firstName}
          autoFocus
        />
        <Input
          label="Apellido"
          placeholder="Pérez"
          value={data.lastName}
          onChange={(e) => updateData({ lastName: e.target.value })}
          error={errors.lastName}
        />
      </div>

      <Input
        label="Nombre del Gimnasio / Franquicia"
        placeholder="Ej. FitLife Gym"
        value={data.gymName}
        onChange={(e) => updateData({ gymName: e.target.value })}
        error={errors.gymName}
      />

      <Input
        label="Email"
        type="email"
        placeholder="nombre@empresa.com"
        value={data.email}
        onChange={(e) => updateData({ email: e.target.value })}
        error={errors.email}
      />

      <Input
        label="Contraseña"
        type="password"
        placeholder="••••••••"
        value={data.password}
        onChange={(e) => updateData({ password: e.target.value })}
        error={errors.password}
      />

      <div className="mt-6 flex gap-3">
        <Button type="button" variant="secondary" onClick={onBack} className="!px-3">
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <Button type="submit" className="flex-1 justify-between">
          Registrarse
          <ArrowRight className="w-4 h-4" />
        </Button>
      </div>
    </form>
  );
};