import { useAuth0 } from '@auth0/auth0-react';
import { useCallback } from 'react';
import { markSessionExpired } from './authSession';

const API_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';

const AUTH_TOKEN_ERROR_CODES = new Set([
  'login_required',
  'consent_required',
  'interaction_required',
  'missing_refresh_token',
  'invalid_grant',
]);

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

export interface ApiCallOptions extends RequestInit {
  /** Permite enviar la petición sin Authorization si falla el refresh del token (solo kiosco /scan). */
  allowAnonymous?: boolean;
}

export function isAuthError(error: unknown): boolean {
  return error instanceof ApiError && (error.status === 401 || error.code === 'auth_required');
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
      options: ApiCallOptions = {}
    ): Promise<T> => {
      const { allowAnonymous = false, headers: optionHeaders, ...fetchOptions } = options;
      const headers = new Headers(optionHeaders);
      if (!headers.has('Content-Type')) {
        headers.set('Content-Type', 'application/json');
      }

      let hasAuthHeader = headers.has('Authorization');

      // Solo agregar token si el usuario está autenticado
      if (isAuthenticated) {
        try {
          const token = await getAccessTokenSilently();
          headers.set('Authorization', `Bearer ${token}`);
          hasAuthHeader = true;
        } catch (error) {
          console.error('Error obteniendo token:', error);
          const tokenErrorCode =
            typeof error === 'object' && error !== null && 'error' in error
              ? (error as { error?: unknown }).error
              : undefined;
          const isCredentialFailure =
            typeof tokenErrorCode === 'string' && AUTH_TOKEN_ERROR_CODES.has(tokenErrorCode);

          if (isCredentialFailure) {
            markSessionExpired();
          }
          if (!allowAnonymous) {
            if (isCredentialFailure) {
              throw new ApiError(
                401,
                'auth_required',
                'Tu sesión expiró. Inicia sesión de nuevo para continuar.',
                null,
              );
            }
            throw new ApiError(
              0,
              'token_unavailable',
              'No pudimos conectar. Intenta de nuevo.',
              null,
            );
          }
        }
      }

      const response = await fetch(`${API_URL}${endpoint}`, {
        ...fetchOptions,
        headers,
      });

      if (!response.ok) {
        if (response.status === 401 && hasAuthHeader) {
          markSessionExpired();
        }
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
