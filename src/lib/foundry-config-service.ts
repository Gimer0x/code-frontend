/**
 * Foundry Configuration Service
 * Utility service for Foundry configuration validation and presets
 * Note: Database operations are handled by the backend API
 */

import { getCompilationClient } from './compilationClient'

export interface FoundryConfig {
  // Compiler settings
  solc: string
  viaIR?: boolean
  evmVersion?: string
  
  // Optimizer settings
  optimizer: boolean
  optimizerRuns: number
  
  // Output settings
  extraOutput?: string[]
  extraOutputFiles?: string[]
  bytecodeHash?: string
  cborMetadata?: boolean
  
  // Gas reporting
  gasReports?: string[]
  gasReportsIgnore?: string[]
  
  // Metadata
  metadata?: Record<string, any>
  
  // Advanced settings
  verbosity?: number
  debug?: Record<string, any>
  ffi?: boolean
  buildInfo?: boolean
}

export interface LibraryConfig {
  name: string
  version: string
  source: 'github' | 'npm' | 'git'
  url?: string
  branch?: string
  commit?: string
  installPath?: string
}

export interface CourseFoundryConfig {
  courseId: string
  foundryConfig: FoundryConfig
  libraries: LibraryConfig[]
  remappings: Record<string, string>
  profiles?: Record<string, FoundryConfig>
}

export class FoundryConfigService {
  private client = getCompilationClient()

  /**
   * Get course Foundry configuration from backend
   * Note: This should proxy to backend API instead
   */
  async getCourseConfig(courseId: string): Promise<CourseFoundryConfig | null> {
    // This method is deprecated - use backend API directly
    // Keeping for backward compatibility but it won't query database
    return null
  }

  /**
   * Update course Foundry configuration
   * Note: This should proxy to backend API instead
   */
  async updateCourseConfig(courseId: string, config: Partial<CourseFoundryConfig>): Promise<boolean> {
    // This method is deprecated - use backend API directly
    // Keeping for backward compatibility but it won't update database
    try {
      // Update configuration on Foundry service only
      const result = await this.client.updateProjectConfig(courseId, {
        foundryConfig: config.foundryConfig,
        remappings: config.remappings
      })
      
      return result.success
    } catch (error) {
      return false
    }
  }

  /**
   * Get default Foundry configuration
   */
  getDefaultConfig(): FoundryConfig {
    return {
      solc: '0.8.19',
      viaIR: false,
      evmVersion: 'london',
      optimizer: true,
      optimizerRuns: 200,
      extraOutput: ['metadata'],
      extraOutputFiles: ['metadata'],
      bytecodeHash: 'none',
      cborMetadata: true,
      gasReports: [],
      gasReportsIgnore: [],
      verbosity: 1,
      ffi: false,
      buildInfo: true
    }
  }

  /**
   * Get available Solidity compiler versions
   */
  getAvailableSolcVersions(): string[] {
    return [
      '0.8.26', '0.8.25', '0.8.24', '0.8.23', '0.8.22', '0.8.21', '0.8.20',
      '0.8.19', '0.8.18', '0.8.17', '0.8.16', '0.8.15', '0.8.14', '0.8.13',
      '0.8.12', '0.8.11', '0.8.10', '0.8.9', '0.8.8', '0.8.7', '0.8.6',
      '0.8.5', '0.8.4', '0.8.3', '0.8.2', '0.8.1', '0.8.0'
    ]
  }

  /**
   * Get available EVM versions
   */
  getAvailableEVMVersions(): string[] {
    return [
      'shanghai', 'london', 'berlin', 'istanbul', 'petersburg', 'constantinople',
      'byzantium', 'spuriousDragon', 'tangerineWhistle', 'homestead', 'frontier'
    ]
  }

  /**
   * Get available libraries
   */
  getAvailableLibraries(): LibraryConfig[] {
    return [
      {
        name: 'forge-std',
        version: 'latest',
        source: 'github',
        url: 'https://github.com/foundry-rs/forge-std'
      },
      {
        name: 'openzeppelin-contracts',
        version: 'latest',
        source: 'github',
        url: 'https://github.com/OpenZeppelin/openzeppelin-contracts'
      },
      {
        name: 'solmate',
        version: 'latest',
        source: 'github',
        url: 'https://github.com/transmissions11/solmate'
      },
      {
        name: 'ds-test',
        version: 'latest',
        source: 'github',
        url: 'https://github.com/dapphub/ds-test'
      },
      {
        name: 'hardhat',
        version: 'latest',
        source: 'npm',
        url: 'https://www.npmjs.com/package/hardhat'
      },
      {
        name: 'truffle',
        version: 'latest',
        source: 'npm',
        url: 'https://www.npmjs.com/package/truffle'
      }
    ]
  }

  /**
   * Get default remappings
   */
  getDefaultRemappings(): Record<string, string> {
    return {
      'forge-std/': 'lib/forge-std/src/',
      '@openzeppelin/': 'lib/openzeppelin-contracts/',
      'solmate/': 'lib/solmate/src/',
      'ds-test/': 'lib/ds-test/src/'
    }
  }

  /**
   * Validate Foundry configuration
   */
  validateConfig(config: FoundryConfig): { isValid: boolean; errors: string[] } {
    const errors: string[] = []

    // Validate Solidity version
    const availableVersions = this.getAvailableSolcVersions()
    if (!availableVersions.includes(config.solc)) {
      errors.push(`Invalid Solidity version: ${config.solc}`)
    }

    // Validate EVM version
    if (config.evmVersion) {
      const availableEVMVersions = this.getAvailableEVMVersions()
      if (!availableEVMVersions.includes(config.evmVersion)) {
        errors.push(`Invalid EVM version: ${config.evmVersion}`)
      }
    }

    // Validate optimizer runs
    if (config.optimizer && config.optimizerRuns < 0) {
      errors.push('Optimizer runs must be non-negative')
    }

    // Validate bytecode hash
    if (config.bytecodeHash && !['none', 'ipfs', 'bzzr1'].includes(config.bytecodeHash)) {
      errors.push('Invalid bytecode hash value')
    }

    return {
      isValid: errors.length === 0,
      errors
    }
  }

  /**
   * Generate foundry.toml content
   */
  generateFoundryToml(config: FoundryConfig): string {
    let toml = '[profile.default]\n'
    
    // Basic settings
    toml += `src = "src"\n`
    toml += `out = "out"\n`
    toml += `libs = ["lib"]\n`
    toml += `solc = "${config.solc}"\n`
    
    // Optimizer settings
    toml += `optimizer = ${config.optimizer}\n`
    if (config.optimizer) {
      toml += `optimizer_runs = ${config.optimizerRuns}\n`
    }
    
    // Advanced compiler settings
    if (config.viaIR) {
      toml += `via_ir = ${config.viaIR}\n`
    }
    
    if (config.evmVersion) {
      toml += `evm_version = "${config.evmVersion}"\n`
    }
    
    // Output settings
    if (config.extraOutput && config.extraOutput.length > 0) {
      toml += `extra_output = [${config.extraOutput.map(output => `"${output}"`).join(', ')}]\n`
    }
    
    if (config.extraOutputFiles && config.extraOutputFiles.length > 0) {
      toml += `extra_output_files = [${config.extraOutputFiles.map(file => `"${file}"`).join(', ')}]\n`
    }
    
    if (config.bytecodeHash) {
      toml += `bytecode_hash = "${config.bytecodeHash}"\n`
    }
    
    if (config.cborMetadata !== undefined) {
      toml += `cbor_metadata = ${config.cborMetadata}\n`
    }
    
    // Gas reporting
    if (config.gasReports && config.gasReports.length > 0) {
      toml += `gas_reports = [${config.gasReports.map(report => `"${report}"`).join(', ')}]\n`
    }
    
    if (config.gasReportsIgnore && config.gasReportsIgnore.length > 0) {
      toml += `gas_reports_ignore = [${config.gasReportsIgnore.map(ignore => `"${ignore}"`).join(', ')}]\n`
    }
    
    // Advanced settings
    if (config.verbosity !== undefined) {
      toml += `verbosity = ${config.verbosity}\n`
    }
    
    if (config.ffi !== undefined) {
      toml += `ffi = ${config.ffi}\n`
    }
    
    if (config.buildInfo !== undefined) {
      toml += `build_info = ${config.buildInfo}\n`
    }
    
    // Metadata
    if (config.metadata && Object.keys(config.metadata).length > 0) {
      toml += '\n[profile.default.metadata]\n'
      for (const [key, value] of Object.entries(config.metadata)) {
        toml += `${key} = "${value}"\n`
      }
    }
    
    return toml
  }

  /**
   * Generate remappings.txt content
   */
  generateRemappings(remappings: Record<string, string>): string {
    let content = ''
    for (const [key, value] of Object.entries(remappings)) {
      content += `${key} ${value}\n`
    }
    return content
  }

  /**
   * Get configuration presets
   */
  getConfigurationPresets(): Record<string, FoundryConfig> {
    return {
      development: {
        solc: '0.8.19',
        optimizer: false,
        optimizerRuns: 0,
        viaIR: false,
        evmVersion: 'london',
        extraOutput: ['metadata'],
        extraOutputFiles: ['metadata'],
        bytecodeHash: 'none',
        cborMetadata: true,
        gasReports: [],
        gasReportsIgnore: [],
        verbosity: 2,
        ffi: true,
        buildInfo: true
      },
      production: {
        solc: '0.8.19',
        optimizer: true,
        optimizerRuns: 200,
        viaIR: false,
        evmVersion: 'london',
        extraOutput: ['metadata'],
        extraOutputFiles: ['metadata'],
        bytecodeHash: 'none',
        cborMetadata: true,
        gasReports: ['*'],
        gasReportsIgnore: [],
        verbosity: 0,
        ffi: false,
        buildInfo: false
      },
      gasOptimized: {
        solc: '0.8.19',
        optimizer: true,
        optimizerRuns: 1000000,
        viaIR: true,
        evmVersion: 'london',
        extraOutput: ['metadata'],
        extraOutputFiles: ['metadata'],
        bytecodeHash: 'none',
        cborMetadata: true,
        gasReports: ['*'],
        gasReportsIgnore: [],
        verbosity: 0,
        ffi: false,
        buildInfo: false
      },
      sizeOptimized: {
        solc: '0.8.19',
        optimizer: true,
        optimizerRuns: 1,
        viaIR: false,
        evmVersion: 'london',
        extraOutput: ['metadata'],
        extraOutputFiles: ['metadata'],
        bytecodeHash: 'none',
        cborMetadata: true,
        gasReports: [],
        gasReportsIgnore: [],
        verbosity: 0,
        ffi: false,
        buildInfo: false
      }
    }
  }

  /**
   * Install library
   */
  async installLibrary(courseId: string, library: LibraryConfig): Promise<boolean> {
    try {
      const result = await this.client.installDependencies({
        courseId,
        projectPath: `/courses/${courseId}`,
        dependencies: [library]
      })

      return result.success
    } catch (error) {
      return false
    }
  }

  /**
   * Remove library
   */
  async removeLibrary(courseId: string, libraryName: string): Promise<boolean> {
    // This method is deprecated - use backend API directly
    // Keeping for backward compatibility but it won't update database
    return false
  }

  /**
   * Get library status
   */
  async getLibraryStatus(courseId: string): Promise<{ installed: LibraryConfig[]; available: LibraryConfig[] }> {
    // This method is deprecated - use backend API directly
    // Keeping for backward compatibility but it won't query database
    const available = this.getAvailableLibraries()
    return {
      installed: [],
      available
    }
  }
}

export const foundryConfigService = new FoundryConfigService()
