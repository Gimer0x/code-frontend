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
  console.log('🚀 Initializing DappDojo Application...')
  console.log('=====================================')

  // Validate configuration
  validateAndExit()

  // Print configuration summary
  const config = getConfigurationSummary()
  console.log('📋 Configuration Summary:')
  console.log(JSON.stringify(config, null, 2))

  console.log('✅ Application initialized successfully')
  console.log('=====================================')
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
  
  console.log('📊 Startup Information:')
  console.log('======================')
  console.log(`Environment: ${info.environment}`)
  console.log(`Port: ${info.port}`)
  console.log(`Database: ${info.database.connected ? 'Connected' : 'Not Connected'}`)
  console.log(`Fly.io Service: ${info.services.flyio.enabled ? 'Enabled' : 'Disabled'}`)
  console.log(`Foundry Service: ${info.services.foundry.enabled ? 'Enabled' : 'Disabled'}`)
  console.log(`Email: ${info.features.email ? 'Configured' : 'Not Configured'}`)
  console.log(`Stripe: ${info.features.stripe ? 'Configured' : 'Not Configured'}`)
  console.log(`Analytics: ${info.features.analytics ? 'Enabled' : 'Disabled'}`)
  console.log(`Caching: ${info.features.caching ? 'Enabled' : 'Disabled'}`)
  console.log(`Production Ready: ${info.productionReady ? 'Yes' : 'No'}`)
  console.log('======================')
}
