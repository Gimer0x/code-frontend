/**
 * Environment configuration utility
 * Centralizes all environment variable access with validation and defaults
 */

// Database configuration
export const dbConfig = {
  url: process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/dappdojo',
  maxConnections: parseInt(process.env.DB_MAX_CONNECTIONS || '10'),
  connectionTimeout: parseInt(process.env.DB_CONNECTION_TIMEOUT || '30000'),
}

// Authentication configuration
export const authConfig = {
  jwtSecret: process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production',
  nextAuthSecret: process.env.NEXTAUTH_SECRET || 'your-nextauth-secret-key-change-in-production',
  nextAuthUrl: process.env.NEXTAUTH_URL || 'http://localhost:3000',
  sessionMaxAge: parseInt(process.env.SESSION_MAX_AGE || '2592000'), // 30 days
}

// Email configuration
export const emailConfig = {
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  user: process.env.SMTP_USER || '',
  pass: process.env.SMTP_PASS || '',
  from: process.env.SMTP_FROM || 'DappDojo <noreply@dappdojo.com>',
  secure: process.env.SMTP_SECURE === 'true',
}

// Fly.io service configuration
export const flyioConfig = {
  serviceUrl: process.env.FLY_FOUNDRY_SERVICE_URL || 'https://dappdojo-foundry-service.fly.dev',
  apiKey: process.env.FLY_FOUNDRY_SERVICE_API_KEY || '',
  timeout: parseInt(process.env.FLY_SERVICE_TIMEOUT || '60000'),
  retryAttempts: parseInt(process.env.FLY_RETRY_ATTEMPTS || '3'),
  retryDelay: parseInt(process.env.FLY_RETRY_DELAY || '2000'),
}

// Local Foundry service configuration
export const foundryConfig = {
  serviceUrl: process.env.FOUNDRY_SERVICE_URL || 'http://localhost:3002',
  timeout: parseInt(process.env.FOUNDRY_TIMEOUT || '30000'),
  retryAttempts: parseInt(process.env.FOUNDRY_RETRY_ATTEMPTS || '2'),
  retryDelay: parseInt(process.env.FOUNDRY_RETRY_DELAY || '1000'),
}

// Course project configuration
export const courseProjectConfig = {
  basePath: process.env.COURSE_PROJECTS_BASE_PATH || '/courses',
  localPath: process.env.LOCAL_COURSE_PROJECTS_PATH || './student-sessions',
  maxSize: parseInt(process.env.MAX_COURSE_PROJECT_SIZE || '100'), // MB
  cleanupInterval: parseInt(process.env.COURSE_CLEANUP_INTERVAL || '3600000'), // 1 hour
}

// Compilation and testing configuration
export const compilationConfig = {
  timeout: parseInt(process.env.COMPILATION_TIMEOUT || '60000'),
  testTimeout: parseInt(process.env.TEST_TIMEOUT || '120000'),
  maxRetryAttempts: parseInt(process.env.MAX_RETRY_ATTEMPTS || '3'),
  retryDelay: parseInt(process.env.RETRY_DELAY || '2000'),
  enableCaching: process.env.ENABLE_COMPILATION_CACHE === 'true',
  cacheTTL: parseInt(process.env.COMPILATION_CACHE_TTL || '3600'), // 1 hour
}

// File upload configuration
export const uploadConfig = {
  maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '10'), // MB
  allowedTypes: process.env.ALLOWED_FILE_TYPES?.split(',') || [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp'
  ],
  uploadDir: process.env.UPLOAD_DIR || './public/uploads',
  thumbnailSize: parseInt(process.env.THUMBNAIL_SIZE || '300'),
  enableCompression: process.env.ENABLE_IMAGE_COMPRESSION === 'true',
}

// Stripe configuration
export const stripeConfig = {
  secretKey: process.env.STRIPE_SECRET_KEY || '',
  publishableKey: process.env.STRIPE_PUBLISHABLE_KEY || '',
  webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || '',
  monthlyPriceId: process.env.STRIPE_MONTHLY_PRICE_ID || '',
  yearlyPriceId: process.env.STRIPE_YEARLY_PRICE_ID || '',
  currency: process.env.STRIPE_CURRENCY || 'usd',
}

// Application configuration
export const appConfig = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3000'),
  url: process.env.APP_URL || 'http://localhost:3000',
  corsOrigin: process.env.CORS_ORIGIN || '*',
  forceHttps: process.env.FORCE_HTTPS === 'true',
  trustProxy: process.env.TRUST_PROXY === 'true',
}

// Logging configuration
export const loggingConfig = {
  level: process.env.LOG_LEVEL || 'info',
  enableRequestLogging: process.env.ENABLE_REQUEST_LOGGING === 'true',
  enableErrorTracking: process.env.ENABLE_ERROR_TRACKING === 'true',
  logFormat: process.env.LOG_FORMAT || 'combined',
}

// Rate limiting configuration
export const rateLimitConfig = {
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW || '900000'), // 15 minutes
  maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
  skipSuccessfulRequests: process.env.RATE_LIMIT_SKIP_SUCCESS === 'true',
  skipFailedRequests: process.env.RATE_LIMIT_SKIP_FAILED === 'false',
}

// Cache configuration
export const cacheConfig = {
  redisUrl: process.env.REDIS_URL || '',
  ttl: parseInt(process.env.CACHE_TTL || '3600'), // 1 hour
  enableRedis: process.env.ENABLE_REDIS === 'true',
  enableMemoryCache: process.env.ENABLE_MEMORY_CACHE === 'true',
  maxMemoryCacheSize: parseInt(process.env.MAX_MEMORY_CACHE_SIZE || '100'), // MB
}

// Analytics configuration
export const analyticsConfig = {
  enabled: process.env.ENABLE_ANALYTICS === 'true',
  trackingId: process.env.ANALYTICS_TRACKING_ID || '',
  enableUserTracking: process.env.ENABLE_USER_TRACKING === 'true',
  enablePerformanceTracking: process.env.ENABLE_PERFORMANCE_TRACKING === 'true',
}

// Development configuration
export const devConfig = {
  debug: process.env.DEBUG === 'true',
  enableApiDocs: process.env.ENABLE_API_DOCS === 'true',
  apiKey: process.env.DEV_API_KEY || 'dev-api-key-for-testing',
  enableMockData: process.env.ENABLE_MOCK_DATA === 'true',
  enableTestMode: process.env.ENABLE_TEST_MODE === 'true',
}

// Validation function to check required environment variables
export function validateEnvironment(): { isValid: boolean; errors: string[] } {
  const errors: string[] = []

  // Required for production
  if (appConfig.nodeEnv === 'production') {
    if (!process.env.DATABASE_URL) {
      errors.push('DATABASE_URL is required in production')
    }
    if (!process.env.JWT_SECRET || process.env.JWT_SECRET === 'your-super-secret-jwt-key-change-in-production') {
      errors.push('JWT_SECRET must be set to a secure value in production')
    }
    if (!process.env.NEXTAUTH_SECRET || process.env.NEXTAUTH_SECRET === 'your-nextauth-secret-key-change-in-production') {
      errors.push('NEXTAUTH_SECRET must be set to a secure value in production')
    }
    if (!process.env.STRIPE_SECRET_KEY) {
      errors.push('STRIPE_SECRET_KEY is required for payment processing')
    }
  }

  // Required for Fly.io integration
  if (process.env.FLY_FOUNDRY_SERVICE_URL && !process.env.FLY_FOUNDRY_SERVICE_API_KEY) {
    errors.push('FLY_FOUNDRY_SERVICE_API_KEY is required when using Fly.io service')
  }

  // Email configuration validation
  if (emailConfig.user && !emailConfig.pass) {
    errors.push('SMTP_PASS is required when SMTP_USER is set')
  }

  return {
    isValid: errors.length === 0,
    errors
  }
}

// Get configuration for a specific environment
export function getEnvironmentConfig() {
  const validation = validateEnvironment()
  
  return {
    database: dbConfig,
    auth: authConfig,
    email: emailConfig,
    flyio: flyioConfig,
    foundry: foundryConfig,
    courseProject: courseProjectConfig,
    compilation: compilationConfig,
    upload: uploadConfig,
    stripe: stripeConfig,
    app: appConfig,
    logging: loggingConfig,
    rateLimit: rateLimitConfig,
    cache: cacheConfig,
    analytics: analyticsConfig,
    dev: devConfig,
    validation
  }
}

// Export default configuration
export default getEnvironmentConfig()
