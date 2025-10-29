/**
 * Configuration validation utility
 * Validates environment variables and configuration on application startup
 */

import { getEnvironmentConfig } from './config'

export interface ValidationResult {
  isValid: boolean
  errors: string[]
  warnings: string[]
  config: any
}

/**
 * Validate all configuration
 */
export function validateConfiguration(): ValidationResult {
  const config = getEnvironmentConfig()
  const errors: string[] = []
  const warnings: string[] = []

  // Database validation
  if (!config.database.url) {
    errors.push('DATABASE_URL is required')
  } else if (!config.database.url.startsWith('postgresql://')) {
    errors.push('DATABASE_URL must be a PostgreSQL connection string')
  }

  // Authentication validation
  if (!config.auth.jwtSecret || config.auth.jwtSecret === 'your-super-secret-jwt-key-change-in-production') {
    errors.push('JWT_SECRET must be set to a secure value')
  }

  if (!config.auth.nextAuthSecret || config.auth.nextAuthSecret === 'your-nextauth-secret-key-change-in-production') {
    errors.push('NEXTAUTH_SECRET must be set to a secure value')
  }

  // Fly.io configuration validation
  if (config.flyio.serviceUrl && !config.flyio.apiKey) {
    errors.push('FLY_FOUNDRY_SERVICE_API_KEY is required when using Fly.io service')
  }

  if (config.flyio.serviceUrl && !config.flyio.serviceUrl.startsWith('https://')) {
    warnings.push('Fly.io service URL should use HTTPS in production')
  }

  // Email configuration validation
  if (config.email.user && !config.email.pass) {
    errors.push('SMTP_PASS is required when SMTP_USER is set')
  }

  if (config.email.user && !config.email.host) {
    errors.push('SMTP_HOST is required when SMTP_USER is set')
  }

  // Stripe configuration validation
  if (config.stripe.secretKey && !config.stripe.publishableKey) {
    errors.push('STRIPE_PUBLISHABLE_KEY is required when STRIPE_SECRET_KEY is set')
  }

  if (config.stripe.secretKey && config.stripe.secretKey.startsWith('sk_test_') && config.app.nodeEnv === 'production') {
    warnings.push('Using Stripe test keys in production environment')
  }

  // File upload validation
  if (config.upload.maxFileSize > 100) {
    warnings.push('MAX_FILE_SIZE is set to a large value, consider reducing for better performance')
  }

  // Rate limiting validation
  if (config.rateLimit.maxRequests > 1000) {
    warnings.push('RATE_LIMIT_MAX_REQUESTS is set to a high value, consider reducing for security')
  }

  // Compilation timeout validation
  if (config.compilation.timeout > 300000) {
    warnings.push('COMPILATION_TIMEOUT is set to a very high value, consider reducing')
  }

  // Course project size validation
  if (config.courseProject.maxSize > 500) {
    warnings.push('MAX_COURSE_PROJECT_SIZE is set to a large value, consider reducing')
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    config
  }
}

/**
 * Print configuration validation results
 */
export function printValidationResults(result: ValidationResult): void {

  if (result.isValid) {
  } else {
    result.errors.forEach(error => {
    })
  }

  if (result.warnings.length > 0) {
    result.warnings.forEach(warning => {
    })
  }

}

/**
 * Validate configuration and exit if invalid
 */
export function validateAndExit(): void {
  const result = validateConfiguration()
  printValidationResults(result)

  if (!result.isValid) {
    process.exit(1)
  }

  if (result.warnings.length > 0) {
  }
}

/**
 * Get configuration summary for debugging
 */
export function getConfigurationSummary(): any {
  const config = getEnvironmentConfig()
  
  return {
    environment: config.app.nodeEnv,
    database: {
      connected: !!config.database.url,
      url: config.database.url ? '***' : 'Not set'
    },
    auth: {
      jwtSecret: config.auth.jwtSecret ? '***' : 'Not set',
      nextAuthSecret: config.auth.nextAuthSecret ? '***' : 'Not set'
    },
    flyio: {
      serviceUrl: config.flyio.serviceUrl,
      hasApiKey: !!config.flyio.apiKey
    },
    foundry: {
      serviceUrl: config.foundry.serviceUrl
    },
    email: {
      configured: !!(config.email.user && config.email.pass),
      host: config.email.host
    },
    stripe: {
      configured: !!(config.stripe.secretKey && config.stripe.publishableKey),
      testMode: config.stripe.secretKey?.startsWith('sk_test_')
    },
    upload: {
      maxFileSize: config.upload.maxFileSize,
      allowedTypes: config.upload.allowedTypes.length
    },
    compilation: {
      timeout: config.compilation.timeout,
      testTimeout: config.compilation.testTimeout
    }
  }
}
