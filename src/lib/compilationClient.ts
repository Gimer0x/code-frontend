/**
 * Compilation Client for Fly.io Foundry Service Integration
 * 
 * This client handles communication with the Foundry service deployed on Fly.io,
 * providing compilation and testing capabilities with robust error handling and retry logic.
 * 
 * Architecture:
 * - Foundry Service (Solidity compilation/testing) → Fly.io
 * - Main Application (Next.js, DB, etc.) → Railway
 */

import { flyioConfig, foundryConfig } from './config'

// Types for compilation requests and responses
export interface CompilationRequest {
  userId: string
  courseId: string
  lessonId: string
  code: string
  contractName?: string
  options?: {
    verbose?: boolean
    gasReport?: boolean
    extraOutput?: string
  }
}

export interface CompilationResponse {
  success: boolean
  message?: string
  result?: {
    compilationTime?: number
    artifacts?: any[]
    contracts?: any[]
    output?: string
    stderr?: string
  }
  errors?: Array<{
    type: string
    message: string
    line?: number
  }>
  warnings?: Array<{
    type: string
    message: string
    line?: number
  }>
  sessionId?: string
  timestamp?: string
}

export interface TestRequest {
  userId: string
  courseId: string
  lessonId: string
  code: string
  testCode: string
  contractName?: string
  testName?: string
  options?: Record<string, any>
}

export interface TestResponse {
  success: boolean
  message?: string
  testResults?: Array<{
    name: string
    status: 'pass' | 'fail' | 'skip'
    duration?: number
    error?: string
  }>
  testCount?: number
  passedCount?: number
  failedCount?: number
  testTime?: number
  result?: any
  output?: string
  errors?: Array<{
    type: string
    message: string
    line?: number
  }>
  timestamp?: string
}

export interface CompilationClientConfig {
  baseUrl: string
  timeout?: number
  retryAttempts?: number
  retryDelay?: number
  apiKey?: string
}

export class CompilationError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public response?: any
  ) {
    super(message)
    this.name = 'CompilationError'
  }
}

export class CompilationClient {
  private config: Required<CompilationClientConfig>
  private defaultHeaders: Record<string, string>

  constructor(config: CompilationClientConfig) {
    this.config = {
      timeout: 30000, // 30 seconds
      retryAttempts: 3,
      retryDelay: 1000, // 1 second
      ...config
    }

    this.defaultHeaders = {
      'Content-Type': 'application/json',
      'User-Agent': 'DappDojo-CompilationClient/1.0.0'
    }

    if (this.config.apiKey) {
      this.defaultHeaders['Authorization'] = `Bearer ${this.config.apiKey}`
    }
  }

  /**
   * Compile Solidity code using the remote service
   */
  async compile(request: CompilationRequest): Promise<CompilationResponse> {
    return this.makeRequest<CompilationResponse>('/api/compile', {
      method: 'POST',
      body: JSON.stringify(request)
    })
  }

  /**
   * Run tests on Solidity code using the remote service
   */
  async test(request: TestRequest): Promise<TestResponse> {
    return this.makeRequest<TestResponse>('/api/test', {
      method: 'POST',
      body: JSON.stringify(request)
    })
  }

  /**
   * Check service health
   */
  async healthCheck(): Promise<{ status: string; version?: string; timestamp: string }> {
    return this.makeRequest<{ status: string; version?: string; timestamp: string }>('/api/health', {
      method: 'GET'
    })
  }

  /**
   * Get service status and configuration
   */
  async getStatus(): Promise<{ 
    service: string
    status: string
    environment?: string
    features?: string[]
    timestamp: string
  }> {
    return this.makeRequest<{ 
      service: string
      status: string
      environment?: string
      features?: string[]
      timestamp: string
    }>('/api/status', {
      method: 'GET'
    })
  }

  /**
   * Initialize course project on Fly.io
   */
  async initCourseProject(request: {
    courseId: string
    projectPath: string
    foundryConfig?: any
    dependencies?: Array<{ name: string; version?: string; source: string }>
    templates?: Array<{ name: string; description?: string; templatePath: string; isDefault?: boolean }>
  }): Promise<any> {
    return this.makeRequest('/api/courses/init', {
      method: 'POST',
      body: JSON.stringify(request)
    })
  }

  /**
   * Install dependencies on Fly.io
   */
  async installDependencies(request: {
    courseId: string
    projectPath: string
    dependencies: Array<{ name: string; version?: string; source: string }>
  }): Promise<any> {
    return this.makeRequest('/api/dependencies/install', {
      method: 'POST',
      body: JSON.stringify(request)
    })
  }

  /**
   * Apply template to course project
   */
  async applyTemplate(request: {
    courseId: string
    projectPath: string
    templatePath: string
    targetPath?: string
  }): Promise<any> {
    return this.makeRequest('/api/templates/apply', {
      method: 'POST',
      body: JSON.stringify(request)
    })
  }

  /**
   * Get available templates
   */
  async getTemplates(): Promise<{ templates: Array<{ name: string; description: string }> }> {
    return this.makeRequest('/api/templates/list', {
      method: 'GET'
    })
  }

  /**
   * Execute project action (init, build, test, clean, status)
   */
  async executeProjectAction(courseId: string, action: string, config?: any): Promise<any> {
    return this.makeRequest(`/api/projects/${courseId}/${action}`, {
      method: 'POST',
      body: JSON.stringify(config || {})
    })
  }

  /**
   * Update project configuration
   */
  async updateProjectConfig(courseId: string, config: any): Promise<any> {
    return this.makeRequest(`/api/projects/${courseId}/config`, {
      method: 'PUT',
      body: JSON.stringify(config)
    })
  }

  /**
   * Get project status
   */
  async getProjectStatus(courseId: string): Promise<any> {
    return this.makeRequest(`/api/projects/${courseId}/status`, {
      method: 'GET'
    })
  }

  /**
   * Delete project
   */
  async deleteProject(courseId: string, projectPath: string): Promise<any> {
    return this.makeRequest(`/api/projects/${courseId}/delete`, {
      method: 'DELETE',
      body: JSON.stringify({ projectPath })
    })
  }

  /**
   * Make HTTP request with retry logic and error handling
   */
  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit,
    attempt: number = 1
  ): Promise<T> {
    const url = `${this.config.baseUrl}${endpoint}`
    
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), this.config.timeout)

      const response = await fetch(url, {
        ...options,
        headers: {
          ...this.defaultHeaders,
          ...options.headers
        },
        signal: controller.signal
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        const errorText = await response.text()
        let errorData: any = null
        
        try {
          errorData = JSON.parse(errorText)
        } catch {
          // If response is not JSON, use the text as error message
        }

        throw new CompilationError(
          errorData?.message || errorData?.error || `HTTP ${response.status}: ${response.statusText}`,
          response.status,
          errorData
        )
      }

      const data = await response.json()
      
      // If this is a compilation response, extract detailed error information
      if (endpoint === '/api/compile' && data.result) {
        // Extract errors and warnings from the nested result structure
        const extractedData = {
          ...data,
          errors: Array.isArray(data.result.errors) ? data.result.errors.map((error: any) => ({
            type: 'compilation_error',
            message: typeof error === 'string' ? error : error.message || error,
            severity: 'error',
            sourceLocation: error.sourceLocation || null
          })) : (data.errors || []),
          warnings: Array.isArray(data.result.warnings) ? data.result.warnings.map((warning: any) => ({
            type: 'compilation_warning',
            message: typeof warning === 'string' ? warning : warning.message || warning,
            severity: 'warning',
            sourceLocation: warning.sourceLocation || null
          })) : (data.warnings || []),
          success: data.result.success !== undefined ? data.result.success : data.success
        }
        return extractedData as T
      }
      
      return data as T

    } catch (error) {
      // Handle timeout
      if (error instanceof Error && error.name === 'AbortError') {
        throw new CompilationError(
          `Request timeout after ${this.config.timeout}ms`,
          408
        )
      }

      // Handle network errors with retry logic
      if (error instanceof TypeError && error.message.includes('fetch')) {
        if (attempt < this.config.retryAttempts) {
          await this.delay(this.config.retryDelay * attempt) // Exponential backoff
          return this.makeRequest<T>(endpoint, options, attempt + 1)
        }
        throw new CompilationError(
          `Network error: Unable to connect to compilation service after ${this.config.retryAttempts} attempts`,
          503
        )
      }

      // Re-throw CompilationError as-is
      if (error instanceof CompilationError) {
        throw error
      }

      // Handle other errors
      throw new CompilationError(
        error instanceof Error ? error.message : 'Unknown error occurred',
        500,
        error
      )
    }
  }

  /**
   * Delay execution for retry logic
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<CompilationClientConfig>): void {
    this.config = { ...this.config, ...newConfig }
    
    if (newConfig.apiKey) {
      this.defaultHeaders['Authorization'] = `Bearer ${newConfig.apiKey}`
    }
  }

  /**
   * Get current configuration
   */
  getConfig(): CompilationClientConfig {
    return { ...this.config }
  }
}

/**
 * Factory function to create a compilation client
 */
export function createCompilationClient(config: CompilationClientConfig): CompilationClient {
  return new CompilationClient(config)
}

/**
 * Fly.io Foundry Service client (for production)
 */
export const flyClient = createCompilationClient({
  baseUrl: flyioConfig.serviceUrl,
  timeout: flyioConfig.timeout,
  retryAttempts: flyioConfig.retryAttempts,
  retryDelay: flyioConfig.retryDelay,
  apiKey: flyioConfig.apiKey
})

/**
 * Local development client (for local Foundry service)
 */
export const localClient = createCompilationClient({
  baseUrl: foundryConfig.serviceUrl,
  timeout: foundryConfig.timeout,
  retryAttempts: foundryConfig.retryAttempts,
  retryDelay: foundryConfig.retryDelay
})

/**
 * Get the appropriate client based on environment
 * - Production: Use Fly.io deployed Foundry service
 * - Development: Use local Foundry service
 */
export function getCompilationClient(): CompilationClient {
  const isProduction = process.env.NODE_ENV === 'production'
  const hasFlyUrl = flyioConfig.serviceUrl && flyioConfig.serviceUrl !== 'https://dappdojo-foundry-service.fly.dev'
  
  if (isProduction && hasFlyUrl) {
    return flyClient
  }
  
  return localClient
}

/**
 * Utility functions for common operations
 */
export const compilationUtils = {
  /**
   * Extract contract name from Solidity code
   */
  extractContractName(code: string): string {
    const contractMatch = code.match(/contract\s+(\w+)/)
    return contractMatch ? contractMatch[1] : 'StudentContract'
  },

  /**
   * Extract test name from test code
   */
  extractTestName(testCode: string): string {
    const contractMatch = testCode.match(/contract\s+(\w+)/)
    return contractMatch ? contractMatch[1] : 'Test'
  },

  /**
   * Validate compilation request
   */
  validateCompilationRequest(request: CompilationRequest): string[] {
    const errors: string[] = []
    
    if (!request.userId) errors.push('userId is required')
    if (!request.courseId) errors.push('courseId is required')
    if (!request.lessonId) errors.push('lessonId is required')
    if (!request.code || request.code.trim().length === 0) {
      errors.push('code is required and cannot be empty')
    }
    
    return errors
  },

  /**
   * Validate test request
   */
  validateTestRequest(request: TestRequest): string[] {
    const errors: string[] = []
    
    if (!request.userId) errors.push('userId is required')
    if (!request.courseId) errors.push('courseId is required')
    if (!request.lessonId) errors.push('lessonId is required')
    if (!request.code || request.code.trim().length === 0) {
      errors.push('code is required and cannot be empty')
    }
    if (!request.testCode || request.testCode.trim().length === 0) {
      errors.push('testCode is required and cannot be empty')
    }
    
    return errors
  }
}
