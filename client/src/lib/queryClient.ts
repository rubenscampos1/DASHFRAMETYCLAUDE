import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const res = await fetch(url, {
    method,
    headers: data ? { "Content-Type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const res = await fetch(queryKey.join("/") as string, {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      // Polling de fallback leve (30s) caso WebSocket falhe
      // WebSocket é a fonte principal de atualizações (< 100ms)
      refetchInterval: 30000, // 30 segundos (fallback)
      refetchOnWindowFocus: true, // Atualizar ao focar na janela
      // Cache por 5 minutos - WebSocket invalida quando necessário
      staleTime: 5 * 60 * 1000, // 5 minutos
      // Manter dados em cache por 10 minutos
      gcTime: 10 * 60 * 1000, // 10 minutos
      retry: false,
      // Mostrar dados em cache enquanto busca novos em background
      refetchOnMount: "always",
    },
    mutations: {
      retry: false,
    },
  },
});
