import { useQuery, useMutation, useQueryClient, type QueryKey, type UseQueryOptions, type UseMutationOptions } from '@tanstack/react-query';
import { useApi } from './useApi';

export function useApiQuery<T>(
    key: QueryKey,
    endpoint: string,
    options?: Omit<UseQueryOptions<T>, 'queryKey' | 'queryFn'>,
) {
    const { apiCall } = useApi();
    return useQuery<T>({
        queryKey: key,
        queryFn: () => apiCall<T>(endpoint),
        ...options,
    });
}

export function useApiMutation<TData = unknown, TVariables = { endpoint: string; options?: RequestInit }>(
    options?: Omit<UseMutationOptions<TData, Error, TVariables>, 'mutationFn'>,
) {
    const { apiCall } = useApi();
    return useMutation<TData, Error, TVariables>({
        mutationFn: (vars) => {
            const { endpoint, options: fetchOptions } = vars as unknown as { endpoint: string; options?: RequestInit };
            return apiCall<TData>(endpoint, fetchOptions);
        },
        ...options,
    });
}

export { useQueryClient };
