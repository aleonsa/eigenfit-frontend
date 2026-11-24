import { useAuth0 } from '@auth0/auth0-react';
import { useCallback } from 'react';

const API_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';

/**
 * Error HTTP del backend. `code` viene de `detail.code` cuando el backend
 * responde `{detail: {code, message, ...}}` (p. ej. la agenda); `detail` guarda el cuerpo completo.
 */
export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string | null,
    message: string,
    public detail: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

function describeDetail(detail: unknown): { code: string | null; message: string | null } {
  if (typeof detail === 'string') return { code: null, message: detail };
  if (detail && typeof detail === 'object' && !Array.isArray(detail)) {
    const d = detail as Record<string, unknown>;
    return {
      code: typeof d.code === 'string' ? d.code : null,
      message: typeof d.message === 'string' ? d.message : null,
    };
  }
  return { code: null, message: null };
}

export const useApi = () => {
  const { getAccessTokenSilently, isAuthenticated } = useAuth0();

  const apiCall = useCallback(
    async <T = any>(
      endpoint: string,
      options: RequestInit = {}
    ): Promise<T> => {
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
        ...options.headers,
      };

      // Solo agregar token si el usuario está autenticado
      if (isAuthenticated) {
        try {
          const token = await getAccessTokenSilently();
          headers['Authorization'] = `Bearer ${token}`;
        } catch (error) {
          console.error('Error obteniendo token:', error);
        }
      }

      const response = await fetch(`${API_URL}${endpoint}`, {
        ...options,
        headers,
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        const detail = body?.detail;
        const { code, message } = describeDetail(detail);
        throw new ApiError(
          response.status,
          code,
          message ??
            `Error en la petición: ${response.status} ${response.statusText} en el endpoint ${endpoint}`,
          detail,
        );
      }

      if (response.status === 204) return undefined as T;
      return response.json();
    },
    [getAccessTokenSilently, isAuthenticated]
  );

  return { apiCall };
};
