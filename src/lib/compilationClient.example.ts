/**
 * Example usage of the Compilation Client
 * 
 * This file demonstrates how to integrate the compilation client
 * into existing API routes for Railway/Fly.io deployment.
 */

import { getCompilationClient, compilationUtils, CompilationError } from './compilationClient'

/**
 * Example: Updated compilation API route using the client
 */
export async function compileWithClient(
  userId: string,
  courseId: string,
  lessonId: string,
  code: string,
  contractName?: string
) {
  const client = getCompilationClient()
  
  try {
    // Validate request
    const validationErrors = compilationUtils.validateCompilationRequest({
      userId,
      courseId,
      lessonId,
      code,
      contractName
    })
    
    if (validationErrors.length > 0) {
      throw new CompilationError(`Validation failed: ${validationErrors.join(', ')}`, 400)
    }
    
    // Extract contract name if not provided
    const finalContractName = contractName || compilationUtils.extractContractName(code)
    
    // Compile using the client
    const result = await client.compile({
      userId,
      courseId,
      lessonId,
      code,
      contractName: finalContractName,
      options: {
        verbose: true,
        gasReport: true
      }
    })
    
    return result
    
  } catch (error) {
    if (error instanceof CompilationError) {
      throw error
    }
    
    throw new CompilationError(
      error instanceof Error ? error.message : 'Unknown compilation error',
      500
    )
  }
}

/**
 * Example: Updated test API route using the client
 */
export async function testWithClient(
  userId: string,
  courseId: string,
  lessonId: string,
  code: string,
  testCode: string,
  contractName?: string
) {
  const client = getCompilationClient()
  
  try {
    // Validate request
    const validationErrors = compilationUtils.validateTestRequest({
      userId,
      courseId,
      lessonId,
      code,
      testCode,
      contractName
    })
    
    if (validationErrors.length > 0) {
      throw new CompilationError(`Validation failed: ${validationErrors.join(', ')}`, 400)
    }
    
    // Extract names if not provided
    const finalContractName = contractName || compilationUtils.extractContractName(code)
    const testName = compilationUtils.extractTestName(testCode)
    
    // Run tests using the client
    const result = await client.test({
      userId,
      courseId,
      lessonId,
      code,
      testCode,
      contractName: finalContractName,
      testName,
      options: {}
    })
    
    return result
    
  } catch (error) {
    if (error instanceof CompilationError) {
      throw error
    }
    
    throw new CompilationError(
      error instanceof Error ? error.message : 'Unknown test error',
      500
    )
  }
}

/**
 * Example: Health check using the client
 */
export async function checkServiceHealth() {
  const client = getCompilationClient()
  
  try {
    const health = await client.healthCheck()
    const { status: _, ...healthWithoutStatus } = health as any
    return {
      status: 'healthy',
      service: 'foundry',
      ...healthWithoutStatus
    }
  } catch (error) {
    return {
      status: 'unhealthy',
      service: 'foundry',
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

/**
 * Example: Environment configuration
 */
export const environmentConfig = {
  development: {
    foundryServiceUrl: process.env.FOUNDRY_SERVICE_URL || '',
    timeout: 30000,
    retryAttempts: 2
  },
  production: {
    foundryServiceUrl: process.env.FLY_FOUNDRY_SERVICE_URL || 'https://dappdojo-foundry-service.fly.dev',
    timeout: 60000,
    retryAttempts: 3,
    apiKey: process.env.FLY_FOUNDRY_SERVICE_API_KEY
  }
}
