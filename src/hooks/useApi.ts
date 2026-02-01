/**
 * Custom hooks for API calls
 * Provides standardized patterns for data fetching and mutations
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { ApiState, MutationState } from '../types/api.types';

/**
 * Hook for fetching data from API
 * Handles loading, error states, and caching
 * 
 * @example
 * const { data, isLoading, error, execute, refetch } = useQuery(
 *   () => pilgrimageApi.getSites({ page: 1 }),
 *   { autoFetch: true }
 * );
 */
export function useQuery<T>(
  queryFn: () => Promise<T>,
  options: {
    autoFetch?: boolean;
    onSuccess?: (data: T) => void;
    onError?: (error: string) => void;
    cacheKey?: string;
  } = {}
) {
  const { autoFetch = false, onSuccess, onError } = options;
  
  const [state, setState] = useState<ApiState<T>>({
    data: null,
    isLoading: autoFetch,
    error: null,
    isSuccess: false,
  });

  const isMounted = useRef(true);

  const execute = useCallback(async (): Promise<T | null> => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const result = await queryFn();
      
      if (isMounted.current) {
        setState({
          data: result,
          isLoading: false,
          error: null,
          isSuccess: true,
        });
        onSuccess?.(result);
      }
      
      return result;
    } catch (err: any) {
      const errorMessage = err.message || 'Đã xảy ra lỗi';
      
      if (isMounted.current) {
        setState(prev => ({
          ...prev,
          isLoading: false,
          error: errorMessage,
          isSuccess: false,
        }));
        onError?.(errorMessage);
      }
      
      return null;
    }
  }, [queryFn, onSuccess, onError]);

  const refetch = useCallback(() => {
    return execute();
  }, [execute]);

  const reset = useCallback(() => {
    setState({
      data: null,
      isLoading: false,
      error: null,
      isSuccess: false,
    });
  }, []);

  // Auto fetch on mount if enabled
  useEffect(() => {
    if (autoFetch) {
      execute();
    }
  }, [autoFetch, execute]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  return {
    ...state,
    execute,
    refetch,
    reset,
  };
}

/**
 * Hook for API mutations (POST, PUT, DELETE)
 * Handles loading and error states
 * 
 * @example
 * const { mutate, isLoading, error, reset } = useMutation(
 *   (data) => authApi.login(data),
 *   {
 *     onSuccess: (result) => navigation.navigate('Home'),
 *     onError: (error) => showToast(error),
 *   }
 * );
 * 
 * // Later
 * await mutate({ email, password });
 */
export function useMutation<TData, TVariables>(
  mutationFn: (variables: TVariables) => Promise<TData>,
  options: {
    onSuccess?: (data: TData, variables: TVariables) => void;
    onError?: (error: string, variables: TVariables) => void;
    onSettled?: (data: TData | null, error: string | null, variables: TVariables) => void;
  } = {}
) {
  const { onSuccess, onError, onSettled } = options;

  const [state, setState] = useState<MutationState<TData>>({
    data: null,
    isLoading: false,
    error: null,
    isSuccess: false,
    reset: () => {},
  });

  const isMounted = useRef(true);

  const mutate = useCallback(
    async (variables: TVariables): Promise<TData | null> => {
      setState(prev => ({ ...prev, isLoading: true, error: null, isSuccess: false }));

      try {
        const result = await mutationFn(variables);

        if (isMounted.current) {
          setState(prev => ({
            ...prev,
            data: result,
            isLoading: false,
            error: null,
            isSuccess: true,
          }));
          onSuccess?.(result, variables);
          onSettled?.(result, null, variables);
        }

        return result;
      } catch (err: any) {
        const errorMessage = err.message || 'Đã xảy ra lỗi';

        if (isMounted.current) {
          setState(prev => ({
            ...prev,
            isLoading: false,
            error: errorMessage,
            isSuccess: false,
          }));
          onError?.(errorMessage, variables);
          onSettled?.(null, errorMessage, variables);
        }

        return null;
      }
    },
    [mutationFn, onSuccess, onError, onSettled]
  );

  const reset = useCallback(() => {
    setState({
      data: null,
      isLoading: false,
      error: null,
      isSuccess: false,
      reset: () => {},
    });
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  return {
    ...state,
    mutate,
    mutateAsync: mutate, // Alias for consistency
    reset,
  };
}

/**
 * Hook for infinite scrolling / pagination
 * 
 * @example
 * const {
 *   data,
 *   isLoading,
 *   isFetchingMore,
 *   hasMore,
 *   fetchMore,
 *   refetch,
 * } = useInfiniteQuery(
 *   (page) => pilgrimageApi.getSites({ page, limit: 10 }),
 *   { getNextPage: (lastPage) => lastPage.pagination.hasNext ? lastPage.pagination.page + 1 : null }
 * );
 */
export function useInfiniteQuery<T, TItem>(
  queryFn: (page: number) => Promise<T>,
  options: {
    getItems: (data: T) => TItem[];
    getNextPage: (data: T, currentPage: number) => number | null;
    initialPage?: number;
    onSuccess?: (data: TItem[]) => void;
    onError?: (error: string) => void;
  }
) {
  const { getItems, getNextPage, initialPage = 1, onSuccess, onError } = options;

  const [items, setItems] = useState<TItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const currentPage = useRef(initialPage);
  const isMounted = useRef(true);

  const fetchData = useCallback(
    async (isLoadMore = false) => {
      if (isLoadMore) {
        setIsFetchingMore(true);
      } else {
        setIsLoading(true);
        currentPage.current = initialPage;
        setItems([]);
      }
      setError(null);

      try {
        const result = await queryFn(currentPage.current);
        const newItems = getItems(result);
        const nextPage = getNextPage(result, currentPage.current);

        if (isMounted.current) {
          setItems(prev => (isLoadMore ? [...prev, ...newItems] : newItems));
          setHasMore(nextPage !== null);
          currentPage.current = nextPage ?? currentPage.current;
          onSuccess?.(newItems);
        }
      } catch (err: any) {
        const errorMessage = err.message || 'Đã xảy ra lỗi';
        if (isMounted.current) {
          setError(errorMessage);
          onError?.(errorMessage);
        }
      } finally {
        if (isMounted.current) {
          setIsLoading(false);
          setIsFetchingMore(false);
        }
      }
    },
    [queryFn, getItems, getNextPage, initialPage, onSuccess, onError]
  );

  const fetchMore = useCallback(() => {
    if (!isFetchingMore && hasMore) {
      fetchData(true);
    }
  }, [fetchData, isFetchingMore, hasMore]);

  const refetch = useCallback(() => {
    fetchData(false);
  }, [fetchData]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  return {
    data: items,
    isLoading,
    isFetchingMore,
    hasMore,
    error,
    fetchMore,
    refetch,
  };
}

export default { useQuery, useMutation, useInfiniteQuery };
