import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  icon?: React.ReactNode;
}

export const Input: React.FC<InputProps> = ({ label, error, icon, className = '', ...props }) => {
  return (
    <div className="w-full mb-4">
      <label className="block text-xs font-medium text-slate-700 mb-1.5">
        {label}
      </label>
      <div className="relative">
        <input
          className={`
            w-full px-3 py-2.5 bg-white border rounded-md text-slate-900 placeholder-slate-400 text-sm
            focus:outline-none focus:border-blue-600
            ${error ? 'border-red-500' : 'border-slate-300'}
            ${icon ? 'pl-9' : ''}
            ${className}
          `}
          {...props}
        />
        {icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
            {icon}
          </div>
        )}
      </div>
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
};

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  options: { value: string; label: string }[];
  error?: string;
}

export const Select: React.FC<SelectProps> = ({ label, options, error, className = '', ...props }) => {
  return (
    <div className="w-full mb-4">
      <label className="block text-xs font-medium text-slate-700 mb-1.5">
        {label}
      </label>
      <div className="relative">
        <select
          className={`
            w-full px-3 py-2.5 bg-white border rounded-md text-slate-900 appearance-none text-sm
            focus:outline-none focus:border-blue-600
            ${error ? 'border-red-500' : 'border-slate-300'}
            ${className}
          `}
          {...props}
        >
          <option value="" disabled>Selecciona una opción</option>
          {options.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
        </div>
      </div>
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
};