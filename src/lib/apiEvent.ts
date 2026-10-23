
export const API_ERROR_EVENT = 'api_error';

export interface ApiErrorDetail {
  url: string;
  status: number;
  statusText: string;
  error: string;
  timestamp: number;
}

export function dispatchApiError(detail: ApiErrorDetail) {
  const event = new CustomEvent(API_ERROR_EVENT, { detail });
  window.dispatchEvent(event);
}
