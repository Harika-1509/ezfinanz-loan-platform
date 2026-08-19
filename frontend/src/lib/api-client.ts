/**
 * Standard API Response Envelope matching backend contract
 */
export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  error?: {
    code: string;
    details?: any;
  };
  meta?: {
    timestamp: string;
    [key: string]: any;
  };
}

export class ApiError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details?: any;

  constructor(
    message: string,
    statusCode: number = 500,
    code: string = 'API_ERROR',
    details?: any
  ) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

export interface RequestOptions extends Omit<RequestInit, 'body'> {
  params?: Record<string, string | number | boolean | undefined>;
  body?: any;
  skipAuth?: boolean;
}

const TOKEN_STORAGE_KEY = 'ezfinanz_access_token';

class ApiClient {
  private baseUrl: string;
  private accessToken: string | null = null;
  private isRefreshing: boolean = false;
  private refreshSubscribers: Array<(token: string) => void> = [];

  constructor() {
    this.baseUrl =
      process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';

    // Hydrate token from localStorage in client environment
    if (typeof window !== 'undefined') {
      this.accessToken = localStorage.getItem(TOKEN_STORAGE_KEY);
    }
  }

  public setAccessToken(token: string | null) {
    this.accessToken = token;
    if (typeof window !== 'undefined') {
      if (token) {
        localStorage.setItem(TOKEN_STORAGE_KEY, token);
      } else {
        localStorage.removeItem(TOKEN_STORAGE_KEY);
      }
    }
  }

  public getAccessToken(): string | null {
    if (!this.accessToken && typeof window !== 'undefined') {
      this.accessToken = localStorage.getItem(TOKEN_STORAGE_KEY);
    }
    return this.accessToken;
  }

  public clearAccessToken() {
    this.setAccessToken(null);
  }

  public setBaseUrl(url: string) {
    this.baseUrl = url;
  }

  public getBaseUrl(): string {
    return this.baseUrl;
  }

  private onRefreshed(token: string) {
    this.refreshSubscribers.forEach((cb) => cb(token));
    this.refreshSubscribers = [];
  }

  private addRefreshSubscriber(cb: (token: string) => void) {
    this.refreshSubscribers.push(cb);
  }

  private buildUrl(
    endpoint: string,
    params?: Record<string, string | number | boolean | undefined>
  ): string {
    let fullUrl = endpoint.startsWith('http')
      ? endpoint
      : `${this.baseUrl.replace(/\/$/, '')}/${endpoint.replace(/^\//, '')}`;

    if (params) {
      const searchParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          searchParams.append(key, String(value));
        }
      });
      const queryString = searchParams.toString();
      if (queryString) {
        fullUrl += (fullUrl.includes('?') ? '&' : '?') + queryString;
      }
    }

    return fullUrl;
  }

  /**
   * Main request method with automatic token injection, error handling, and 401 token refresh
   */
  public async request<T = any>(
    endpoint: string,
    options: RequestOptions = {}
  ): Promise<ApiResponse<T>> {
    const { params, body, headers = {}, skipAuth, ...restOptions } = options;
    const url = this.buildUrl(endpoint, params);

    const defaultHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };

    const currentToken = this.getAccessToken();
    if (currentToken && !skipAuth) {
      defaultHeaders['Authorization'] = `Bearer ${currentToken}`;
    }

    const isFormData =
      typeof FormData !== 'undefined' && body instanceof FormData;
    if (isFormData) {
      delete defaultHeaders['Content-Type'];
    }

    try {
      const response = await fetch(url, {
        ...restOptions,
        credentials: 'include', // Ensures HttpOnly cookies (refresh token) are sent
        headers: {
          ...defaultHeaders,
          ...(headers as Record<string, string>),
        },
        body: body ? (isFormData ? body : JSON.stringify(body)) : undefined,
      });

      // Handle 401 Unauthorized with token refresh if not an auth endpoint
      if (
        response.status === 401 &&
        !skipAuth &&
        !endpoint.includes('/auth/login') &&
        !endpoint.includes('/auth/signup') &&
        !endpoint.includes('/auth/refresh')
      ) {
        if (!this.isRefreshing) {
          this.isRefreshing = true;

          try {
            const refreshRes = await this.post<{ accessToken: string }>(
              '/auth/refresh',
              {},
              { skipAuth: true }
            );

            const newToken = refreshRes.data?.accessToken;
            if (newToken) {
              this.setAccessToken(newToken);
              this.isRefreshing = false;
              this.onRefreshed(newToken);

              // Replay original request with new token
              return this.request<T>(endpoint, options);
            }
          } catch (refreshErr) {
            this.isRefreshing = false;
            this.clearAccessToken();
            this.refreshSubscribers = [];
            throw new ApiError(
              'Session expired. Please log in again.',
              401,
              'UNAUTHORIZED'
            );
          }
        } else {
          // Wait for active refresh to complete then retry
          return new Promise((resolve, reject) => {
            this.addRefreshSubscriber(async (token: string) => {
              try {
                const retryRes = await this.request<T>(endpoint, options);
                resolve(retryRes);
              } catch (err) {
                reject(err);
              }
            });
          });
        }
      }

      let jsonResult: ApiResponse<T>;
      try {
        jsonResult = await response.json();
      } catch {
        throw new ApiError(
          `Failed to parse server response (${response.statusText})`,
          response.status,
          'INVALID_RESPONSE'
        );
      }

      if (!response.ok || !jsonResult.success) {
        const errorMsg =
          jsonResult.message || `HTTP ${response.status}: ${response.statusText}`;
        const errorCode =
          jsonResult.error?.code || `HTTP_${response.status}`;
        throw new ApiError(
          errorMsg,
          response.status,
          errorCode,
          jsonResult.error?.details
        );
      }

      return jsonResult;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(
        error instanceof Error
          ? error.message
          : 'Network request failed. Is the server running?',
        0,
        'NETWORK_ERROR'
      );
    }
  }

  public get<T = any>(
    endpoint: string,
    options?: RequestOptions
  ): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...options, method: 'GET' });
  }

  public post<T = any>(
    endpoint: string,
    body?: any,
    options?: RequestOptions
  ): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...options, method: 'POST', body });
  }

  public put<T = any>(
    endpoint: string,
    body?: any,
    options?: RequestOptions
  ): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...options, method: 'PUT', body });
  }

  public patch<T = any>(
    endpoint: string,
    body?: any,
    options?: RequestOptions
  ): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...options, method: 'PATCH', body });
  }

  public delete<T = any>(
    endpoint: string,
    options?: RequestOptions
  ): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...options, method: 'DELETE' });
  }
}

export const apiClient = new ApiClient();
export default apiClient;
