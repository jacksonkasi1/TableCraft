import type { AxiosLike } from './types';

export function isAxiosInstance(value: unknown): value is AxiosLike {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as any).request === 'function' &&
    typeof (value as any).get === 'function'
  );
}

export type MinimalResponse = Pick<Response, 'ok' | 'status' | 'statusText' | 'headers' | 'json' | 'text'>;

export function createAxiosFetchAdapter(axios: AxiosLike) {
  return async (url: string, options?: RequestInit): Promise<MinimalResponse> => {
    let headers: Record<string, string> | undefined = undefined;
    if (options?.headers) {
      headers = {};
      new Headers(options.headers as HeadersInit).forEach((value, key) => {
        headers![key] = value;
      });
    }
    const method = options?.method || 'GET';
    
    try {
      const response = await axios.request({
        url,
        method,
        headers,
        data: options?.body,
        signal: options?.signal ?? undefined,
      });
      
      return {
        ok: response.status >= 200 && response.status < 300,
        status: response.status,
        statusText: response.statusText,
        headers: new Headers(response.headers),
        json: async () => response.data,
        text: async () => typeof response.data === 'string' ? response.data : JSON.stringify(response.data),
      };
    } catch (error: unknown) {
      const axiosError = error as { response?: { data?: unknown; status: number; statusText: string; headers: Record<string, string> }; message?: string };
      
      if (axiosError.response) {
        return {
          ok: false,
          status: axiosError.response.status,
          statusText: axiosError.response.statusText,
          headers: new Headers(axiosError.response.headers),
          json: async () => axiosError.response?.data ?? { error: 'Request failed' },
          text: async () => JSON.stringify(axiosError.response?.data ?? { error: 'Request failed' }),
        };
      }
      
      throw new Error(axiosError.message ?? 'Request failed');
    }
  };
}
