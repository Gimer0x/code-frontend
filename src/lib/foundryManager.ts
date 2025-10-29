import path from 'path'
import fs from 'fs'
import { exec } from 'child_process'
import util from 'util'

const execPromise = util.promisify(exec)

export interface FoundryProject {
  courseId: string
  projectPath: string
  isInitialized: boolean
}

export class FoundryManager {
  private basePath: string

  constructor() {
    this.basePath = path.join(process.cwd(), 'foundry-projects')
  }

  /**
   * Get or create a Foundry project for a specific student and course
   */
  async getOrCreateStudentProject(userId: string, courseId: string): Promise<FoundryProject> {
    const projectPath = path.join(this.basePath, `student-${userId}`, `course-${courseId}`)
    
    // Create project directory if it doesn't exist
    if (!fs.existsSync(projectPath)) {
      fs.mkdirSync(projectPath, { recursive: true })
    }

    // Check if project is already initialized
    const foundryTomlPath = path.join(projectPath, 'foundry.toml')
    const isInitialized = fs.existsSync(foundryTomlPath)

    if (!isInitialized) {
      await this.initializeProject(projectPath)
      
      // Wait for initialization to complete by checking for OpenZeppelin
      const openZeppelinPath = path.join(projectPath, 'lib', 'openzeppelin-contracts')
      let attempts = 0
      const maxAttempts = 15 // Increased to 15 seconds
      
      while (!fs.existsSync(openZeppelinPath) && attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 1000))
        attempts++
      }
      
      if (!fs.existsSync(openZeppelinPath)) {
      } else {
      }
    } else {
      // Ensure existing projects have warning configuration
      this.updateFoundryConfig(projectPath)
    }

    return {
      courseId: `${userId}-${courseId}`,
      projectPath,
      isInitialized: true
    }
  }

  /**
   * Get or create a Foundry project for a specific course
   */
  async getOrCreateProject(courseId: string): Promise<FoundryProject> {
    const projectPath = path.join(this.basePath, `course-${courseId}`)
    
    // Create project directory if it doesn't exist
    if (!fs.existsSync(projectPath)) {
      fs.mkdirSync(projectPath, { recursive: true })
    }

    // Check if project is already initialized
    const foundryTomlPath = path.join(projectPath, 'foundry.toml')
    const isInitialized = fs.existsSync(foundryTomlPath)

    if (!isInitialized) {
      await this.initializeProject(projectPath)
      
      // Wait for initialization to complete by checking for OpenZeppelin
      const openZeppelinPath = path.join(projectPath, 'lib', 'openzeppelin-contracts')
      let attempts = 0
      const maxAttempts = 15 // Increased to 15 seconds
      
      while (!fs.existsSync(openZeppelinPath) && attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 1000))
        attempts++
      }
      
      if (!fs.existsSync(openZeppelinPath)) {
      } else {
      }
    }

    return {
      courseId,
      projectPath,
      isInitialized: true
    }
  }

  /**
   * Clean up compilation artifacts for a specific contract
   */
  private cleanupContractArtifacts(projectPath: string, contractName: string): void {
    try {
      const outDir = path.join(projectPath, 'out')
      const contractOutDir = path.join(outDir, `${contractName}.sol`)
      
      if (fs.existsSync(contractOutDir)) {
        fs.rmSync(contractOutDir, { recursive: true, force: true })
      }
    } catch (cleanupError) {
    }
  }

  /**
   * Update foundry.toml with warning configuration
   */
  private updateFoundryConfig(projectPath: string): void {
    const foundryConfigPath = path.join(projectPath, 'foundry.toml')
    
    if (fs.existsSync(foundryConfigPath)) {
      // Read existing config
      const existingConfig = fs.readFileSync(foundryConfigPath, 'utf8')
      
      // Check if warning config already exists
      if (!existingConfig.includes('solc_args') || !existingConfig.includes('--warn-unused-return')) {
        // Update the config with warning flags
        const updatedConfig = existingConfig.replace(
          /(\[profile\.default\][\s\S]*?)(remappings = \[[\s\S]*?\])/,
          `$1extra_output = ["storageLayout", "metadata"]
extra_output_files = ["metadata"]
solc_args = "--warn-unused-return --warn-unused-param"
$2`
        )
        
        fs.writeFileSync(foundryConfigPath, updatedConfig)
      }
    }
  }

  /**
   * Initialize a new Foundry project
   */
  private async initializeProject(projectPath: string): Promise<void> {
    try {
      // Create foundry.toml
      const foundryConfig = `[profile.default]
src = "src"
out = "out"
libs = ["lib"]
solc = "0.8.30"
optimizer = true
optimizer_runs = 200
extra_output = ["storageLayout", "metadata"]
extra_output_files = ["metadata"]
solc_args = "--warn-unused-return --warn-unused-param"
remappings = [
    "@openzeppelin/contracts/=lib/openzeppelin-contracts/contracts/",
    "forge-std/=lib/forge-std/src/"
]
`
      fs.writeFileSync(path.join(projectPath, 'foundry.toml'), foundryConfig)

      // Create src and test directories
      fs.mkdirSync(path.join(projectPath, 'src'), { recursive: true })
      fs.mkdirSync(path.join(projectPath, 'test'), { recursive: true })

      // Initialize git repository first
      try {
        await execPromise(`cd ${projectPath} && git init`)
      } catch (gitError) {
      }

      // Initialize forge project
      try {
        await execPromise(`cd ${projectPath} && forge init --no-git --force .`, {
          maxBuffer: 1024 * 1024 * 5, // 5MB buffer
          encoding: 'utf8'
        })
      } catch (initError) {
      }

      // Install forge-std
      try {
        await execPromise(`cd ${projectPath} && forge install foundry-rs/forge-std`, {
          maxBuffer: 1024 * 1024 * 5, // 5MB buffer
          encoding: 'utf8'
        })
      } catch (installError) {
      }

      // Install OpenZeppelin contracts
      try {
        await execPromise(`cd ${projectPath} && forge install OpenZeppelin/openzeppelin-contracts`, {
          maxBuffer: 1024 * 1024 * 5, // 5MB buffer
          encoding: 'utf8'
        })
      } catch (installError) {
      }

    } catch (error) {
      throw error
    }
  }

  /**
   * Update solution code for a specific lesson
   */
  async updateSolutionCode(courseId: string, lessonId: string, contractName: string, solutionCode: string): Promise<void> {
    const project = await this.getOrCreateProject(courseId)
    const contractPath = path.join(project.projectPath, 'src', `${contractName}.sol`)
    
    // Write the solution code to the contract file
    fs.writeFileSync(contractPath, solutionCode)
  }

  /**
   * Update student's solution code for a specific lesson
   */
  async updateStudentSolutionCode(userId: string, courseId: string, lessonId: string, contractName: string, solutionCode: string): Promise<void> {
    const project = await this.getOrCreateStudentProject(userId, courseId)
    const srcDir = path.join(project.projectPath, 'src')
    
    // Clean up old contract files (except the current one)
    const files = fs.readdirSync(srcDir)
    files.forEach(file => {
      if (file.endsWith('.sol') && file !== `${contractName}.sol`) {
        const oldFilePath = path.join(srcDir, file)
        try {
          fs.unlinkSync(oldFilePath)
        } catch (error) {
        }
      }
    })
    
    // Write the solution code to the contract file
    const contractPath = path.join(srcDir, `${contractName}.sol`)
    fs.writeFileSync(contractPath, solutionCode)
  }

  /**
   * Update test code for a specific lesson
   */
  async updateTestCode(courseId: string, lessonId: string, testName: string, testCode: string): Promise<void> {
    const project = await this.getOrCreateProject(courseId)
    const testPath = path.join(project.projectPath, 'test', `${testName}.t.sol`)
    
    // Write the test code to the test file
    fs.writeFileSync(testPath, testCode)
  }

  /**
   * Run tests for a specific test file
   */
  async runTests(courseId: string, testFileName: string, timeout: number = 30000): Promise<any> {
    const project = await this.getOrCreateProject(courseId)
    
    return new Promise(async (resolve, reject) => {
      let resolved = false
      
      const timer = setTimeout(() => {
        if (!resolved) {
          resolved = true
          reject(new Error(`Test execution timed out after ${timeout / 1000} seconds`))
        }
      }, timeout)

      try {
        // Run specific test file
        const command = `cd ${project.projectPath} && forge test test/${testFileName} --json`
        
        const result = await execPromise(command, {
          maxBuffer: 1024 * 1024 * 10, // 10MB buffer
          encoding: 'utf8'
        })
        
        clearTimeout(timer)
        if (!resolved) {
          resolved = true
          resolve(result)
        }
      } catch (error) {
        clearTimeout(timer)
        if (!resolved) {
          resolved = true
          reject(error)
        }
      }
    })
  }

  /**
   * Get all test files in a course project
   */
  async getTestFiles(courseId: string): Promise<string[]> {
    const project = await this.getOrCreateProject(courseId)
    const testDir = path.join(project.projectPath, 'test')
    
    if (!fs.existsSync(testDir)) {
      return []
    }

    const files = fs.readdirSync(testDir)
    return files.filter(file => file.endsWith('.t.sol'))
  }

  /**
   * Check if a Foundry project is properly initialized
   */
  async isProjectInitialized(courseId: string): Promise<boolean> {
    const projectPath = path.join(this.basePath, `course-${courseId}`)
    const foundryTomlPath = path.join(projectPath, 'foundry.toml')
    return fs.existsSync(foundryTomlPath)
  }

  /**
   * Check if forge-std library is installed
   */
  async isForgeStdInstalled(courseId: string): Promise<boolean> {
    const projectPath = path.join(this.basePath, `course-${courseId}`)
    const forgeStdPath = path.join(projectPath, 'lib', 'forge-std')
    return fs.existsSync(forgeStdPath)
  }

  /**
   * Check if OpenZeppelin contracts library is installed
   */
  async isOpenZeppelinInstalled(courseId: string): Promise<boolean> {
    const projectPath = path.join(this.basePath, `course-${courseId}`)
    const openZeppelinPath = path.join(projectPath, 'lib', 'openzeppelin-contracts')
    return fs.existsSync(openZeppelinPath)
  }

  /**
   * Validate that all required components are installed before compilation
   */
  async validateProjectSetup(courseId: string): Promise<{
    isValid: boolean
    missingComponents: string[]
    projectExists: boolean
    forgeStdInstalled: boolean
    openZeppelinInstalled: boolean
  }> {
    const projectExists = await this.isProjectInitialized(courseId)
    const forgeStdInstalled = await this.isForgeStdInstalled(courseId)
    const openZeppelinInstalled = await this.isOpenZeppelinInstalled(courseId)

    const missingComponents: string[] = []
    
    if (!projectExists) {
      missingComponents.push('Foundry project')
    }
    if (!forgeStdInstalled) {
      missingComponents.push('forge-std library')
    }
    if (!openZeppelinInstalled) {
      missingComponents.push('OpenZeppelin contracts library')
    }

    return {
      isValid: missingComponents.length === 0,
      missingComponents,
      projectExists,
      forgeStdInstalled,
      openZeppelinInstalled
    }
  }

  /**
   * Compile code using Foundry for student projects
   */
  async compileStudentCode(code: string, userId: string, courseId: string, timeout: number = 30000): Promise<{ success: boolean; errors: any[]; warnings: any[] }> {
    const project = await this.getOrCreateStudentProject(userId, courseId)
    
    // Ensure warning configuration is enabled
    this.updateFoundryConfig(project.projectPath)
    
    // Extract contract name from code
    let contractName = 'TempContract'
    const contractMatch = code.match(/contract\s+(\w+)/)
    if (contractMatch) {
      contractName = contractMatch[1]
    }
    
    const contractFilePath = path.join(project.projectPath, 'src', `${contractName}.sol`)
    
    try {
      // Clean the specific contract's folder in out directory before compilation
      const outDir = path.join(project.projectPath, 'out')
      const contractOutDir = path.join(outDir, contractName)
      if (fs.existsSync(contractOutDir)) {
        fs.rmSync(contractOutDir, { recursive: true, force: true })
      }
      
      // Write the code to the contract file
      fs.writeFileSync(contractFilePath, code)
      
      // Use spawn for better handling of large outputs
      
      const result = await new Promise<{ stdout: string; stderr: string }>((resolve, reject) => {
        const { spawn } = require('child_process')
        // Compile only the specific contract file
        const child = spawn('forge', ['build', '--json', `src/${contractName}.sol`], {
          cwd: project.projectPath,
          stdio: ['pipe', 'pipe', 'pipe']
        })
        
        let stdout = ''
        let stderr = ''
        
        child.stdout.on('data', (data: any) => {
          stdout += data.toString()
        })
        
        child.stderr.on('data', (data: any) => {
          stderr += data.toString()
        })
        
        child.on('close', (code: number) => {
          if (code === 0) {
            resolve({ stdout, stderr })
          } else {
            reject(new Error(`Forge build failed with exit code ${code}: ${stderr}`))
          }
        })
        
        child.on('error', (error: any) => {
          reject(error)
        })
        
        // Set timeout
        const timeoutId = setTimeout(() => {
          child.kill()
          reject(new Error(`Compilation timed out after ${timeout / 1000} seconds`))
        }, timeout)
        
        child.on('close', () => {
          clearTimeout(timeoutId)
        })
      })
      
      // Parse the output
      const errors: any[] = []
      const warnings: any[] = []
      
      try {
        const output = JSON.parse(result.stdout)
        
        if (output.errors) {
          output.errors.forEach((error: any) => {
            if (error.severity === 'warning') {
              warnings.push({
                severity: 'warning',
                message: error.message || error.formattedMessage || 'Unknown warning',
                type: error.type || 'CompilationWarning',
                line: error.sourceLocation?.start || 0,
                column: error.sourceLocation?.end || 0
              })
            } else {
              errors.push({
                severity: error.severity || 'error',
                message: error.message || error.formattedMessage || 'Unknown error',
                type: error.type || 'CompilationError',
                line: error.sourceLocation?.start || 0,
                column: error.sourceLocation?.end || 0
              })
            }
          })
        }
        
        // Also check for separate warnings array (if it exists)
        if (output.warnings) {
          output.warnings.forEach((warning: any) => {
            warnings.push({
              severity: 'warning',
              message: warning.message || warning.formattedMessage || 'Unknown warning',
              type: warning.type || 'CompilationWarning',
              line: warning.sourceLocation?.start || 0,
              column: warning.sourceLocation?.end || 0
            })
          })
        }
        
        // Parse stderr for additional warnings (if any)
        if (result.stderr) {
          const stderrText = result.stderr
          
          // Look for Foundry warning patterns in stderr (fallback)
          const warningRegex = /Warning \((\d+)\): (.+?)\n\s*-->\s*(.+?):(\d+):(\d+):/g
          let match
          
          while ((match = warningRegex.exec(stderrText)) !== null) {
            const [, warningCode, message, file, line, column] = match
            warnings.push({
              severity: 'warning',
              message: message.trim(),
              type: 'CompilationWarning',
              line: parseInt(line),
              column: parseInt(column)
            })
          }
        }
      } catch (parseError) {
        errors.push({
          severity: 'error',
          message: 'Failed to parse compilation output',
          type: 'ParseError'
        })
      }
      
      // Clean up compilation artifacts for the specific contract
      this.cleanupContractArtifacts(project.projectPath, contractName)

      return {
        success: errors.length === 0,
        errors,
        warnings
      }
    } catch (error) {
      return {
        success: false,
        errors: [{
          severity: 'error',
          message: error instanceof Error ? error.message : 'Compilation failed',
          type: 'CompilationError'
        }],
        warnings: []
      }
    }
  }

  /**
   * Run tests for a student's project
   */
  async runStudentTests(userId: string, courseId: string, testFileName: string): Promise<any> {
    try {
      const projectPath = path.join(this.basePath, `student-${userId}`, `course-${courseId}`)
      
      if (!fs.existsSync(projectPath)) {
        throw new Error('Student project not found')
      }

      // Ensure warning configuration is enabled
      this.updateFoundryConfig(projectPath)

      // Clean the specific contract's folder in out directory before testing
      // Extract contract name from test file name (e.g., HelloWorldTest.t.sol -> HelloWorld)
      const contractName = testFileName.replace('Test.t.sol', '').replace('.t.sol', '')
      this.cleanupContractArtifacts(projectPath, contractName)


      // Clean up old test files that reference deleted contracts
      const testDir = path.join(projectPath, 'test')
      const scriptDir = path.join(projectPath, 'script')
      
      // Remove old test files that might reference deleted contracts
      if (fs.existsSync(testDir)) {
        const testFiles = fs.readdirSync(testDir)
        testFiles.forEach(file => {
          if (file.endsWith('.t.sol') && file !== testFileName) {
            const oldTestPath = path.join(testDir, file)
            try {
              fs.unlinkSync(oldTestPath)
            } catch (error) {
            }
          }
        })
      }
      
      // Remove old script files
      if (fs.existsSync(scriptDir)) {
        const scriptFiles = fs.readdirSync(scriptDir)
        scriptFiles.forEach(file => {
          if (file.endsWith('.s.sol')) {
            const oldScriptPath = path.join(scriptDir, file)
            try {
              fs.unlinkSync(oldScriptPath)
            } catch (error) {
            }
          }
        })
      }

      // Run forge test with specific test file
      const command = `cd "${projectPath}" && forge test test/${testFileName} --json`
      
      try {
        const { stdout, stderr } = await execPromise(command, { timeout: 30000 })
        
        if (stderr) {
        }

        // Parse the JSON output
        try {
          const testOutput = JSON.parse(stdout)
          
          // Clean up compilation artifacts after testing
          this.cleanupContractArtifacts(projectPath, contractName)
          
          return this.parseTestResults(testOutput)
        } catch (parseError) {
          return {
            success: false,
            message: 'Failed to parse test results',
            rawOutput: stdout,
            error: stderr
          }
        }
      } catch (execError: any) {
        // Handle case where tests fail but still return JSON output
        if (execError.stdout) {
          try {
            const testOutput = JSON.parse(execError.stdout)
            
            // Clean up compilation artifacts after testing (even on error)
            this.cleanupContractArtifacts(projectPath, contractName)
            
            return this.parseTestResults(testOutput)
          } catch (parseError) {
            return {
              success: false,
              message: 'Failed to parse test results',
              rawOutput: execError.stdout,
              error: execError.stderr
            }
          }
        }
        throw execError
      }
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Test execution failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Parse test results from Foundry JSON output
   */
  private parseTestResults(testOutput: any): any {
    const results = {
      success: true,
      totalTests: 0,
      passedTests: 0,
      failedTests: 0,
      testResults: [] as any[],
      errors: [] as any[],
      warnings: [] as any[]
    }

    try {
      // Parse test results from Foundry output
      for (const [testFile, testData] of Object.entries(testOutput)) {
        if (testData && typeof testData === 'object' && 'test_results' in testData) {
          const testResults = (testData as any).test_results
          
          for (const [testName, testResult] of Object.entries(testResults)) {
            results.totalTests++
            
            const test = testResult as any
            const isSuccess = test.status === 'Success'
            
            if (isSuccess) {
              results.passedTests++
            } else {
              results.failedTests++
              results.success = false
            }
            
            results.testResults.push({
              name: testName,
              status: test.status,
              success: isSuccess,
              gas: test.kind?.Unit?.gas || 0,
              duration: test.duration,
              reason: test.reason,
              logs: test.logs || [],
              decodedLogs: test.decoded_logs || []
            })
          }
        }
      }
    } catch (error) {
      results.errors.push({
        message: 'Failed to parse test results',
        type: 'ParseError'
      })
    }

    return results
  }

  /**
   * Clean up old projects (optional - not implemented yet as requested)
   */
  async cleanupOldProjects(): Promise<void> {
    // Implementation for future cleanup
  }
}

// Export singleton instance
export const foundryManager = new FoundryManager()
