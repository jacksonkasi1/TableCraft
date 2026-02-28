import type { AxiosLike } from "./types";

/**
 * Type guard to check if a given value is an Axios-like instance.
 * It checks for the presence of 'request' and 'get' methods.
 *
 * @param value - The value to check
 * @returns True if the value looks like an Axios instance
 */
export function isAxiosInstance(value: unknown): value is AxiosLike {
  return (
    (typeof value === "object" || typeof value === "function") &&
    value !== null &&
    typeof (value as any).request === "function" &&
    typeof (value as any).get === "function"
  );
}

/**
 * A minimal representation of the standard fetch API's Response object.
 * Used to normalize responses from different HTTP clients.
 */
export type MinimalResponse = Pick<
  Response,
  "ok" | "status" | "statusText" | "headers" | "json" | "text"
>;

/**
 * Creates an adapter that wraps an Axios instance to behave like the native fetch API.
 * This allows TableCraft's client to use an existing Axios setup (with interceptors, etc.)
 * without needing to bundle Axios statically.
 *
 * @param axios - The Axios instance to wrap
 * @param withCredentials - Whether to include credentials (cookies) in cross-origin requests. Defaults to false.
 * @returns A function compatible with the native fetch signature
 */
export function createAxiosFetchAdapter(axios: AxiosLike, withCredentials: boolean = false) {
  return async (url: string, options?: RequestInit): Promise<MinimalResponse> => {
    let headers: Record<string, string> | undefined = undefined;
    if (options?.headers) {
      headers = {};
      new Headers(options.headers as HeadersInit).forEach((value, key) => {
        headers![key] = value;
      });
    }
    const method = options?.method || "GET";

    try {
      const response = await axios.request({
        url,
        method,
        headers,
        data: options?.body,
        signal: options?.signal ?? undefined,
        withCredentials,
      });

      return {
        ok: response.status >= 200 && response.status < 300,
        status: response.status,
        statusText: response.statusText,
        headers: new Headers(response.headers),
        json: async () => response.data,
        text: async () =>
          typeof response.data === "string" ? response.data : JSON.stringify(response.data),
      };
    } catch (error: unknown) {
      const axiosError = error as {
        response?: {
          data?: unknown;
          status: number;
          statusText: string;
          headers: Record<string, string>;
        };
        message?: string;
      };

      if (axiosError.response) {
        return {
          ok: false,
          status: axiosError.response.status,
          statusText: axiosError.response.statusText,
          headers: new Headers(axiosError.response.headers),
          json: async () => axiosError.response?.data ?? { error: "Request failed" },
          text: async () =>
            JSON.stringify(axiosError.response?.data ?? { error: "Request failed" }),
        };
      }

      throw new Error(axiosError.message ?? "Request failed");
    }
  };
}
