import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { auth } from "./firebase";

// Throw error if response is not OK
async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

// 🔐 Get Firebase ID token and return Authorization header
async function getAuthHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = {};

  const currentUser = auth.currentUser;
  if (currentUser) {
    const token = await currentUser.getIdToken();
    headers["Authorization"] = `Bearer ${token}`;
  }

  return headers;
}

// 🔁 Generic API request with optional body
export async function apiRequest(
  method: string,
  url: string,
  data?: unknown
): Promise<Response> {
  const headers: Record<string, string> = {};

  const currentUser = auth.currentUser;
  if (currentUser) {
    const token = await currentUser.getIdToken();
    headers["Authorization"] = `Bearer ${token}`;
  }

  if (data) {
    headers["Content-Type"] = "application/json";
  }

  const res = await fetch(url, {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

// 🔁 Query function wrapper for React Query
type UnauthorizedBehavior = "returnNull" | "throw";

export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401 }) =>
  async ({ queryKey }) => {
    const headers = await getAuthHeaders();

    const res = await fetch(queryKey.join("/") as string, {
      headers,
      credentials: "include",
    });

    if (on401 === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

// 🔁 React Query client
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
