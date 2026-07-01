const rawBaseUrl = import.meta.env.VITE_API_URL || "http://localhost:3000";
export const API_BASE_URL = rawBaseUrl.startsWith("http")
  ? rawBaseUrl
  : `http://${rawBaseUrl}`;

export const apiFetch = async <T>(
  path: string,
  init?: RequestInit,
): Promise<T> => {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    ...init,
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "Request failed");
  }

  return (await response.json()) as T;
};
