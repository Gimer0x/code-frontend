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
      const result = await new Promise<{ success: boolean; output: string; errors: string[] }>((resolve) => {
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
          
          // Parse errors from output
          const errors: string[] = []
          if (!success) {
            const errorLines = output.split('\n').filter(line => 
              line.includes('Error') || 
              line.includes('error') || 
              line.includes('Warning') ||
              line.includes('warning')
            )
            errors.push(...errorLines)
          }
          
          resolve({
            success,
            output,
            errors
          })
        })
        
        forge.on('error', (error) => {
          resolve({
            success: false,
            output: error.message,
            errors: [error.message]
          })
        })
      })
      
      // Clean up temp directory
      await fs.rm(tempDir, { recursive: true, force: true })
      
      return NextResponse.json({
        success: result.success,
        output: result.output,
        errors: result.errors,
        contractName,
        compilationTime: null,
        message: result.success ? 'Compilation successful' : 'Compilation failed'
      })
      
    } catch (error: any) {
      // Clean up temp directory on error
      await fs.rm(tempDir, { recursive: true, force: true })
      
      return NextResponse.json({
        success: false,
        output: '',
        errors: [error.message || 'Compilation failed'],
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
      contractName: 'Unknown',
      compilationTime: null,
      message: 'Compilation failed'
    }, { status: 400 })
  }
}
