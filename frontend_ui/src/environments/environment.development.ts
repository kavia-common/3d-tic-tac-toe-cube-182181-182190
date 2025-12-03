declare const process: any;

export const environment = {
  production: false,
  API_BASE: process?.env?.NG_APP_API_BASE ?? '',
  BACKEND_URL: process?.env?.NG_APP_BACKEND_URL ?? '',
  FRONTEND_URL: process?.env?.NG_APP_FRONTEND_URL ?? '',
  WS_URL: process?.env?.NG_APP_WS_URL ?? '',
  NODE_ENV: process?.env?.NG_APP_NODE_ENV ?? 'development',
  NEXT_TELEMETRY_DISABLED: process?.env?.NG_APP_NEXT_TELEMETRY_DISABLED ?? '1',
  ENABLE_SOURCE_MAPS: (process?.env?.NG_APP_ENABLE_SOURCE_MAPS ?? 'true') === 'true',
  PORT: Number(process?.env?.NG_APP_PORT ?? 3000),
  TRUST_PROXY: (process?.env?.NG_APP_TRUST_PROXY ?? 'true') === 'true',
  LOG_LEVEL: process?.env?.NG_APP_LOG_LEVEL ?? 'info',
  HEALTHCHECK_PATH: process?.env?.NG_APP_HEALTHCHECK_PATH ?? '/healthz',
  FEATURE_FLAGS: process?.env?.NG_APP_FEATURE_FLAGS ?? '{}',
  EXPERIMENTS_ENABLED: (process?.env?.NG_APP_EXPERIMENTS_ENABLED ?? 'false') === 'true'
};
