/**
 * Application startup utilities
 * Handles configuration validation and initialization
 */

import { validateAndExit, getConfigurationSummary } from './config-validator'
import { getEnvironmentConfig } from './config'

/**
 * Initialize application with configuration validation
 */
export function initializeApplication(): void {

  // Validate configuration
  validateAndExit()

  // Print configuration summary
  const config = getConfigurationSummary()

}

/**
 * Check if application is ready for production
 */
export function isProductionReady(): boolean {
  const config = getEnvironmentConfig()
  
  // Check required production settings
  const checks = [
    config.database.url && config.database.url !== 'postgresql://postgres:password@localhost:5432/dappdojo',
    config.auth.jwtSecret && config.auth.jwtSecret !== 'your-super-secret-jwt-key-change-in-production',
    config.auth.nextAuthSecret && config.auth.nextAuthSecret !== 'your-nextauth-secret-key-change-in-production',
    config.app.nodeEnv === 'production'
  ]

  return checks.every(check => check === true)
}

/**
 * Get startup information
 */
export function getStartupInfo(): any {
  const config = getEnvironmentConfig()
  
  return {
    environment: config.app.nodeEnv,
    port: config.app.port,
    database: {
      connected: !!config.database.url,
      type: 'PostgreSQL'
    },
    services: {
      flyio: {
        enabled: !!config.flyio.serviceUrl,
        url: config.flyio.serviceUrl
      },
      foundry: {
        enabled: !!config.foundry.serviceUrl,
        url: config.foundry.serviceUrl
      }
    },
    features: {
      email: !!(config.email.user && config.email.pass),
      stripe: !!(config.stripe.secretKey && config.stripe.publishableKey),
      analytics: config.analytics.enabled,
      caching: config.cache.enableRedis || config.cache.enableMemoryCache
    },
    productionReady: isProductionReady()
  }
}

/**
 * Log startup information
 */
export function logStartupInfo(): void {
  const info = getStartupInfo()
  
}
