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
}

class ApiClient {
  private baseUrl: string;

  constructor() {
    this.baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';
  }

  /**
   * Update the base URL dynamically if needed
   */
  public setBaseUrl(url: string) {
    this.baseUrl = url;
  }

  public getBaseUrl(): string {
    return this.baseUrl;
  }

  private buildUrl(
    endpoint: string,
    params?: Record<string, string | number | boolean | undefined>
  ): string {
    // If endpoint starts with http, treat as absolute
    let fullUrl = endpoint.startsWith('http')
      ? endpoint
      : `${this.baseUrl.replace(/\/$/, '')}/${endpoint.replace(/^\//, '')}`;

    if (params) {
      const searchParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
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

  public async request<T = any>(
    endpoint: string,
    options: RequestOptions = {}
  ): Promise<ApiResponse<T>> {
    const { params, body, headers = {}, ...restOptions } = options;
    const url = this.buildUrl(endpoint, params);

    const defaultHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };

    const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;
    if (isFormData) {
      delete defaultHeaders['Content-Type'];
    }

    try {
      const response = await fetch(url, {
        ...restOptions,
        headers: {
          ...defaultHeaders,
          ...(headers as Record<string, string>),
        },
        body: body ? (isFormData ? body : JSON.stringify(body)) : undefined,
      });

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
        const errorMsg = jsonResult.message || `HTTP ${response.status}: ${response.statusText}`;
        const errorCode = jsonResult.error?.code || `HTTP_${response.status}`;
        throw new ApiError(errorMsg, response.status, errorCode, jsonResult.error?.details);
      }

      return jsonResult;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(
        error instanceof Error ? error.message : 'Network request failed. Is the server running?',
        0,
        'NETWORK_ERROR'
      );
    }
  }

  public get<T = any>(endpoint: string, options?: RequestOptions): Promise<ApiResponse<T>> {
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

  public delete<T = any>(endpoint: string, options?: RequestOptions): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...options, method: 'DELETE' });
  }
}

export const apiClient = new ApiClient();
export default apiClient;
