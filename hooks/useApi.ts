import { useAuth0 } from '@auth0/auth0-react';
import { useCallback } from 'react';

const API_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';

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
        const error = await response.json().catch(() => ({}));
        throw new Error(error.detail || 'Error en la petición');
      }

      return response.json();
    },
    [getAccessTokenSilently, isAuthenticated]
  );

  return { apiCall };
};