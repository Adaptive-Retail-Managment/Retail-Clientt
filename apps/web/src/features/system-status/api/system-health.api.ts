import { apiRequest } from '../../../lib/api-client';

export interface LivenessResponse {
  status: 'ok';
  service: 'api';
  version: string;
  uptimeSeconds: number;
  timestamp: string;
}

export interface ReadinessResponse {
  status: 'ok' | 'degraded';
  service: 'api';
  version: string;
  uptimeSeconds: number;
  timestamp: string;
  checks: {
    database: {
      status: 'up' | 'down';
      latencyMs: number;
    };
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function validateLiveness(body: unknown): LivenessResponse | null {
  if (
    isRecord(body) &&
    body.status === 'ok' &&
    body.service === 'api' &&
    typeof body.version === 'string' &&
    typeof body.uptimeSeconds === 'number'
  ) {
    return body as unknown as LivenessResponse;
  }
  return null;
}

function validateReadiness(body: unknown): ReadinessResponse | null {
  if (
    isRecord(body) &&
    (body.status === 'ok' || body.status === 'degraded') &&
    body.service === 'api' &&
    isRecord(body.checks) &&
    isRecord(body.checks.database) &&
    (body.checks.database.status === 'up' || body.checks.database.status === 'down') &&
    typeof body.checks.database.latencyMs === 'number'
  ) {
    return body as unknown as ReadinessResponse;
  }
  return null;
}

export function fetchLiveness() {
  return apiRequest<LivenessResponse>('/health', { validate: validateLiveness });
}

export function fetchReadiness() {
  return apiRequest<ReadinessResponse>('/ready', { validate: validateReadiness });
}
