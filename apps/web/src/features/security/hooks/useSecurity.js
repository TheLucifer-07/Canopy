import { useQuery } from '@tanstack/react-query';

export function useSecurity(api) {
  const query = useQuery({
    queryKey: ['user-security-status'],
    queryFn: async () => {
      const res = await api.getSecurityStatus();
      return res.data || res;
    }
  });

  return {
    security: query.data || null,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch
  };
}
