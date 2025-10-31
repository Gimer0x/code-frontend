import { NextRequest, NextResponse } from 'next/server'
import { spawn } from 'child_process'
import { promises as fs } from 'fs'
import path from 'path'
import { z } from 'zod'

const adminCompileSchema = z.object({
  code: z.string(),
  contractName: z.string().optional()
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { code, contractName = 'TempContract' } = adminCompileSchema.parse(body)

    // Clean the code to remove invisible characters
    const cleanCode = code.trim().replace(/[\u200B-\u200D\uFEFF]/g, '')
    
    // Create a temporary directory for this compilation
    const tempDir = path.join(process.cwd(), 'temp-compilation', `admin-${Date.now()}-${Math.random().toString(36).substring(7)}`)
    await fs.mkdir(tempDir, { recursive: true })
    
    try {
      // Create a simple foundry.toml
      const foundryToml = `[profile.default]
src = "src"
out = "out"
libs = ["lib"]
solc = "0.8.30"
optimizer = true
optimizer_runs = 200
via_ir = false
evm_version = "london"
`
      await fs.writeFile(path.join(tempDir, 'foundry.toml'), foundryToml)
      
      // Create src directory and write the contract
      await fs.mkdir(path.join(tempDir, 'src'), { recursive: true })
      const contractFile = path.join(tempDir, 'src', `${contractName}.sol`)
      await fs.writeFile(contractFile, cleanCode)
      
      // Run forge build directly
      const result = await new Promise<{ success: boolean; output: string; errors: string[]; warnings: string[] }>((resolve) => {
        const forge = spawn('forge', ['build'], {
          cwd: tempDir,
          stdio: 'pipe'
        })
        
        let stdout = ''
        let stderr = ''
        
        forge.stdout.on('data', (data) => {
          stdout += data.toString()
        })
        
        forge.stderr.on('data', (data) => {
          stderr += data.toString()
        })
        
        forge.on('close', (code) => {
          const output = stdout + stderr
          const success = code === 0
          
          // Parse errors and warnings from output (warnings can appear even on success)
          const errors: string[] = []
          const warnings: string[] = []
          
          const lines = output.split('\n')
          for (const line of lines) {
            const trimmed = line.trim()
            if (!trimmed) continue
            
            // Check if it's an error (only add to errors array if compilation failed)
            if (trimmed.toLowerCase().includes('error') && !trimmed.toLowerCase().includes('warning')) {
              if (!success) {
                errors.push(trimmed)
              }
            }
            
            // Check if it's a warning (can appear on both success and failure)
            // Filter out generic/status messages that aren't actual warnings
            if (trimmed.toLowerCase().includes('warning')) {
              const genericWarnings = [
                'compiler run successful',
                'compilation successful',
                'compiler run failed',
                'compilation failed'
              ]
              
              const isGeneric = genericWarnings.some(gen => 
                trimmed.toLowerCase().includes(gen.toLowerCase())
              )
              
              // Only add if it's a real warning, not a status message
              if (!isGeneric) {
                warnings.push(trimmed)
              }
            }
          }
          
          // If compilation failed, include errors; otherwise just warnings
          const errorList = !success ? errors : []
          
          resolve({
            success,
            output,
            errors: errorList,
            warnings: warnings
          })
        })
        
        forge.on('error', (error) => {
          resolve({
            success: false,
            output: error.message,
            errors: [error.message],
            warnings: []
          })
        })
      })
      
      // Clean up temp directory
      await fs.rm(tempDir, { recursive: true, force: true })
      
      return NextResponse.json({
        success: result.success,
        output: result.output,
        errors: result.errors,
        warnings: result.warnings || [],
        contractName,
        compilationTime: null,
        message: result.success 
          ? (result.warnings && result.warnings.length > 0
              ? `Compilation completed with ${result.warnings.length} warning(s)`
              : 'Compilation successful')
          : 'Compilation failed'
      })
      
    } catch (error: any) {
      // Clean up temp directory on error
      await fs.rm(tempDir, { recursive: true, force: true })
      
      return NextResponse.json({
        success: false,
        output: '',
        errors: [error.message || 'Compilation failed'],
        warnings: [],
        contractName,
        compilationTime: null,
        message: 'Compilation failed'
      }, { status: 500 })
    }
    
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      output: '',
      errors: [error.message || 'Invalid request'],
      warnings: [],
      contractName: 'Unknown',
      compilationTime: null,
      message: 'Compilation failed'
    }, { status: 400 })
  }
}
