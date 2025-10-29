import { NextRequest, NextResponse } from 'next/server'
import { spawn } from 'child_process'
import { promises as fs } from 'fs'
import path from 'path'
import { z } from 'zod'

const adminTestSchema = z.object({
  solutionCode: z.string(),
  testCode: z.string(),
  contractName: z.string().optional(),
  testName: z.string().optional()
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { 
      solutionCode, 
      testCode, 
      contractName = 'TempContract',
      testName = 'TempTest'
    } = adminTestSchema.parse(body)

    // Clean the code to remove invisible characters
    const cleanSolutionCode = solutionCode.trim().replace(/[\u200B-\u200D\uFEFF]/g, '')
    const cleanTestCode = testCode.trim().replace(/[\u200B-\u200D\uFEFF]/g, '')
    
    // Create a temporary directory for this test
    const tempDir = path.join(process.cwd(), 'temp-compilation', `admin-test-${Date.now()}-${Math.random().toString(36).substring(7)}`)
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
      
      // Extract the actual contract name from the solution code
      const contractNameMatch = cleanSolutionCode.match(/contract\s+(\w+)/)
      const actualContractName = contractNameMatch ? contractNameMatch[1] : contractName
      
      const contractFile = path.join(tempDir, 'src', `${actualContractName}.sol`)
      await fs.writeFile(contractFile, cleanSolutionCode)
      
      
      // Create test directory and write the test
      await fs.mkdir(path.join(tempDir, 'test'), { recursive: true })
      const testFile = path.join(tempDir, 'test', `${testName}.t.sol`)
      
      // Fix import paths in test code to work with our structure
      let fixedTestCode = cleanTestCode
        .replace(/import "forge-std\/Test\.sol";/g, 'import "forge-std/Test.sol";')
        .replace(/import "\.\.\/src\//g, 'import "../src/')
      
      // Don't add imports if they already exist - the test code should be self-contained
      
      // Fix the import path to use the correct relative path
      fixedTestCode = fixedTestCode.replace(/import {(\w+)} from "\.\.\/src\//g, 'import {$1} from "../src/')
      
      await fs.writeFile(testFile, fixedTestCode)
      
      
      // Initialize Git repository (required for forge install)
      await new Promise<void>((resolve) => {
        const git = spawn('git', ['init'], {
          cwd: tempDir,
          stdio: 'pipe'
        })
        
        git.on('close', (code) => {
          resolve()
        })
        
        git.on('error', () => {
          resolve()
        })
        
        // Timeout after 5 seconds
        setTimeout(() => resolve(), 5000)
      })
      
      // Install forge-std for testing
      await new Promise<void>((resolve) => {
        const forge = spawn('forge', ['install', 'foundry-rs/forge-std'], {
          cwd: tempDir,
          stdio: 'pipe'
        })
        
        forge.on('close', (code) => {
          // Continue regardless of install result
          resolve()
        })
        
        forge.on('error', () => {
          // Continue even if forge-std install fails
          resolve()
        })
        
        // Timeout after 15 seconds
        setTimeout(() => resolve(), 15000)
      })
      
      // Run forge test
      const result = await new Promise<{ success: boolean; output: string; testResults: any[] }>((resolve) => {
        const forge = spawn('forge', ['test', '--json'], {
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
          
          // Parse test results from JSON output
          let testResults: any[] = []
          let testCount = 0
          let passedCount = 0
          let failedCount = 0
          
          try {
            const lines = stdout.split('\n').filter(line => line.trim())
            for (const line of lines) {
              try {
                const testData = JSON.parse(line)
                if (testData.type === 'test') {
                  testResults.push({
                    name: testData.name,
                    status: testData.status === 'success' ? 'pass' : 'fail',
                    message: testData.status === 'success' ? 'Test passed' : 'Test failed',
                    gasUsed: testData.gas_used || 0
                  })
                  testCount++
                  if (testData.status === 'success') passedCount++
                  else failedCount++
                } else if (testData.test_results) {
                  // Handle forge test JSON format
                  for (const [testName, testInfo] of Object.entries(testData.test_results)) {
                    if (typeof testInfo === 'object' && testInfo !== null) {
                      const test = testInfo as any
                      if (test.status === 'Success') {
                        // Extract gas information from the test result
                        let gasUsed = 0
                        if (test.kind?.Unit?.gas) {
                          gasUsed = test.kind.Unit.gas
                        } else if (test.kind?.Fuzz?.mean_gas) {
                          gasUsed = test.kind.Fuzz.mean_gas
                        }
                        
                        testResults.push({
                          name: testName,
                          status: 'pass',
                          message: 'Test passed',
                          gasUsed: gasUsed
                        })
                        passedCount++
                      } else {
                        testResults.push({
                          name: testName,
                          status: 'fail',
                          message: 'Test failed',
                          gasUsed: 0
                        })
                        failedCount++
                      }
                      testCount++
                    }
                  }
                } else {
                  // Handle direct test results in the JSON
                  for (const [key, value] of Object.entries(testData)) {
                    if (typeof value === 'object' && value !== null && (value as any).test_results) {
                      const testResultsData = (value as any).test_results
                      for (const [testName, testInfo] of Object.entries(testResultsData)) {
                        if (typeof testInfo === 'object' && testInfo !== null) {
                          const test = testInfo as any
                          if (test.status === 'Success') {
                            // Extract gas information from the test result
                            let gasUsed = 0
                            if (test.kind?.Unit?.gas) {
                              gasUsed = test.kind.Unit.gas
                            } else if (test.kind?.Fuzz?.mean_gas) {
                              gasUsed = test.kind.Fuzz.mean_gas
                            }
                            
                            testResults.push({
                              name: testName,
                              status: 'pass',
                              message: 'Test passed',
                              gasUsed: gasUsed
                            })
                            passedCount++
                          } else {
                            testResults.push({
                              name: testName,
                              status: 'fail',
                              message: 'Test failed',
                              gasUsed: 0
                            })
                            failedCount++
                          }
                          testCount++
                        }
                      }
                    }
                  }
                }
              } catch (e) {
                // Skip invalid JSON lines
              }
            }
          } catch (e) {
            // Fallback parsing from text output
            const lines = output.split('\n')
            for (const line of lines) {
              if (line.includes('[PASS]')) {
                const match = line.match(/\[PASS\]\s+(\w+)\(\)\s+\(gas:\s+(\d+)\)/)
                if (match) {
                  testResults.push({
                    name: match[1],
                    status: 'pass',
                    message: 'Test passed',
                    gasUsed: parseInt(match[2])
                  })
                  testCount++
                  passedCount++
                }
              } else if (line.includes('[FAIL]')) {
                const match = line.match(/\[FAIL\]\s+(\w+)\(\)/)
                if (match) {
                  testResults.push({
                    name: match[1],
                    status: 'fail',
                    message: 'Test failed',
                    gasUsed: 0
                  })
                  testCount++
                  failedCount++
                }
              }
            }
          }
          
          resolve({
            success,
            output,
            testResults,
            testCount,
            passedCount,
            failedCount
          })
        })
        
        forge.on('error', (error) => {
          resolve({
            success: false,
            output: error.message,
            testResults: [],
            testCount: 0,
            passedCount: 0,
            failedCount: 0
          })
        })
      })
      
      // Clean up temp directory
      await fs.rm(tempDir, { recursive: true, force: true })
      
      return NextResponse.json({
        success: result.success,
        output: result.output,
        results: result.testResults,
        testCount: result.testCount || result.testResults.length,
        passedCount: result.passedCount || result.testResults.filter(r => r.status === 'pass').length,
        failedCount: result.failedCount || result.testResults.filter(r => r.status === 'fail').length,
        testTime: null,
        message: result.success ? 'Tests completed' : 'Test execution failed'
      })
      
    } catch (error: any) {
      // Clean up temp directory on error
      await fs.rm(tempDir, { recursive: true, force: true })
      
      return NextResponse.json({
        success: false,
        output: '',
        results: [],
        testCount: 0,
        passedCount: 0,
        failedCount: 0,
        testTime: null,
        message: 'Test execution failed'
      }, { status: 500 })
    }
    
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      output: '',
      results: [],
      testCount: 0,
      passedCount: 0,
      failedCount: 0,
      testTime: null,
      message: 'Test execution failed'
    }, { status: 400 })
  }
}
