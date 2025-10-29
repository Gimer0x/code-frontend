import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getCompilationClient, compilationUtils, CompilationError } from '@/lib/compilationClient'
import { databaseService } from '@/lib/database-service'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    const { code, courseId, lessonId } = await request.json()

    // For anonymous users, we can't save to database, so just return success
    // The foundry service will handle the code compilation and testing
    if (!session?.user?.id) {
      // Use the foundry service directly for anonymous users
      const client = getCompilationClient()
      
      try {
        // Extract contract name from student's code
        let contractName = 'TempContract'
        const contractMatch = code.match(/contract\s+(\w+)/)
        if (contractMatch) {
          contractName = contractMatch[1]
        }

        // Get lesson data to extract test code
        const lesson = await prisma.lesson.findUnique({
          where: { id: lessonId }
        })

        if (!lesson) {
          return NextResponse.json({ error: 'Lesson not found' }, { status: 404 })
        }

        // Use lesson's test code if available, otherwise generate basic test
        let testCode = lesson.tests
        
        // Clean the test code to remove any trailing whitespace or non-printable characters
        if (testCode) {
          testCode = testCode.trim().replace(/[\u200B-\u200D\uFEFF]/g, '')
        }
        
        if (!testCode) {
          // Generate proper test for Counter contract
          testCode = `pragma solidity ^0.8.30;
import "forge-std/Test.sol";
import "../src/${contractName}.sol";

contract ${contractName}Test is Test {
    ${contractName} public contractInstance;
    
    function setUp() public {
        contractInstance = new ${contractName}();
    }
    
    function testInitialCount() public {
        // Test that initial count is 0
        assertEq(contractInstance.get(), 0, "Initial count should be 0");
    }
    
    function testIncrement() public {
        // Test increment functionality
        uint256 initialCount = contractInstance.get();
        contractInstance.inc();
        assertEq(contractInstance.get(), initialCount + 1, "Count should increment by 1");
    }
    
    function testDecrement() public {
        // Test decrement functionality
        contractInstance.inc(); // First increment to have something to decrement
        uint256 countAfterInc = contractInstance.get();
        contractInstance.dec();
        assertEq(contractInstance.get(), countAfterInc - 1, "Count should decrement by 1");
    }
    
    function testMultipleOperations() public {
        // Test multiple operations
        assertEq(contractInstance.get(), 0, "Should start at 0");
        
        contractInstance.inc();
        assertEq(contractInstance.get(), 1, "Should be 1 after first increment");
        
        contractInstance.inc();
        assertEq(contractInstance.get(), 2, "Should be 2 after second increment");
        
        contractInstance.dec();
        assertEq(contractInstance.get(), 1, "Should be 1 after decrement");
    }
}`
        }

        // Run tests using the foundry service
        const result = await client.test({
          userId: 'anonymous',
          courseId,
          lessonId,
          code,
          testCode,
          contractName,
          testName: `${contractName}Test`,
          options: {}
        })

        // Parse the foundry service response properly
        const isSuccess = result.success && result.result?.success
        const output = result.result?.output || result.output || ''
        const errors = result.result?.errors || result.errors || []
        const warnings = result.result?.warnings || result.warnings || []

        // Extract test results from output if available
        let testResults = []
        let testCount = 0
        let passedCount = 0
        let failedCount = 0

        if (output) {
          // Parse test results from output
          const passMatches = output.match(/\[PASS\]/g)
          const failMatches = output.match(/\[FAIL\]/g)
          
          if (passMatches) passedCount = passMatches.length
          if (failMatches) failedCount = failMatches.length
          testCount = passedCount + failedCount

          // Create test results array
          if (testCount > 0) {
            testResults = output.split('\n')
              .filter(line => line.includes('[PASS]') || line.includes('[FAIL]'))
              .map(line => {
                const isPass = line.includes('[PASS]')
                // Extract test name and gas usage from format: [PASS] testName() (gas: 12345)
                const testMatch = line.match(/\[(PASS|FAIL)\] (\w+)\(\) \(gas: (\d+)\)/)
                const testName = testMatch?.[2] || 'Unknown'
                const gasUsed = testMatch?.[3] ? parseInt(testMatch[3]) : 0
                return {
                  name: testName,
                  status: isPass ? 'pass' : 'fail',
                  success: isPass,
                  message: isPass ? 'Test passed' : 'Test failed',
                  gasUsed: gasUsed,
                  gas: gasUsed,
                  duration: 0
                }
              })
          }
        }

        return NextResponse.json({
          success: isSuccess,
          message: isSuccess ? 'Tests completed successfully' : 'Test execution failed',
          contractName,
          testFileName: `${contractName}Test.t.sol`,
          result: {
            testResults,
            totalTests: testCount,
            passedTests: passedCount,
            failedTests: failedCount,
            testTime: 0,
            output,
            errors,
            warnings
          },
          timestamp: new Date().toISOString()
        })
      } catch (error) {
        return NextResponse.json({
          success: false,
          message: 'Failed to run tests via foundry service',
          contractName: 'Unknown',
          testFileName: 'UnknownTest.t.sol',
          errors: [{ type: 'service_error', message: error.message }],
          timestamp: new Date().toISOString()
        })
      }
    }

    if (!code || !courseId || !lessonId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Get lesson data to extract contract name from original code
    const lesson = await prisma.lesson.findUnique({
      where: { id: lessonId }
    })

    if (!lesson) {
      return NextResponse.json({ error: 'Lesson not found' }, { status: 404 })
    }

    // Extract contract name from student's current code
    let contractName = 'TempContract' // default fallback
    const contractMatch = code.match(/contract\s+(\w+)/)
    if (contractMatch) {
      contractName = contractMatch[1]
    } else if (lesson.initialCode) {
      // Fallback to lesson's original code if student code doesn't have contract
      const initialContractMatch = lesson.initialCode.match(/contract\s+(\w+)/)
      if (initialContractMatch) {
        contractName = initialContractMatch[1]
      }
    }

    // Use Fly.io compilation client for testing
    const client = getCompilationClient()
    
    try {
      // Generate test code if not provided
      const testCode = lesson.tests || `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import "forge-std/Test.sol";
import "../src/${contractName}.sol";

contract ${contractName}Test is Test {
    ${contractName} contractInstance;
    
    function setUp() public {
        contractInstance = new ${contractName}();
    }
    
    function testBasicFunctionality() public {
        // Add your test cases here
        assertTrue(true, "Basic test should pass");
    }
}`

      // Clean the test code to remove invisible characters
      const cleanTestCode = testCode.trim().replace(/[\u200B-\u200D\uFEFF]/g, '')

      // Validate request
      const validationErrors = compilationUtils.validateTestRequest({
        userId: session.user.id,
        courseId,
        lessonId,
        code,
        testCode: cleanTestCode,
        contractName
      })
      
      if (validationErrors.length > 0) {
        return NextResponse.json({
          success: false,
          message: `Validation failed: ${validationErrors.join(', ')}`,
          contractName,
          testFileName: `${contractName}Test.t.sol`,
          errors: validationErrors.map(error => ({ message: error, type: 'validation_error' }))
        }, { status: 400 })
      }

      // Run tests using the client
      const result = await client.test({
        userId: session.user.id,
        courseId,
        lessonId,
        code,
        testCode: cleanTestCode,
        contractName,
        testName: `${contractName}Test`,
        options: {}
      })
      
      if (!result.success) {
        return NextResponse.json({
          success: false,
          message: result.message || 'Test execution failed',
          contractName,
          testFileName: `${contractName}Test.t.sol`,
          errors: result.errors || []
        })
      }

      // Save the code to database after successful test
      try {
        await databaseService.saveStudentCode(session.user.id, courseId, lessonId, code)
        
      } catch (saveError) {
      }

      // Save test result to database
      try {
        const progress = await databaseService.getOrCreateStudentProgress({
          userId: session.user.id,
          courseId,
          lessonId
        })

        await databaseService.saveTestResult({
          studentProgressId: progress.id,
          success: result.success,
          output: result.testResults,
          errors: result.errors,
          testCount: result.testCount,
          passedCount: result.passedCount,
          failedCount: result.failedCount,
          testTime: result.testTime
        })
      } catch (dbError) {
      }

      // Return the test results from Fly.io service
      return NextResponse.json({
        success: result.success,
        message: result.message || 'Tests completed',
        contractName,
        testFileName: `${contractName}Test.t.sol`,
        result: {
          testResults: result.testResults || [],
          totalTests: result.testCount || 0,
          passedTests: result.passedCount || 0,
          failedTests: result.failedCount || 0,
          testTime: result.testTime || 0,
          output: result.output || '',
          errors: result.errors || [],
          warnings: result.warnings || []
        }
      })

    } catch (testError) {
      
      // Handle CompilationError specifically
      if (testError instanceof CompilationError) {
        return NextResponse.json({
          success: false,
          message: testError.message,
          contractName,
          testFileName: `${contractName}Test.t.sol`,
          errors: [{
            message: testError.message,
            type: 'test_error'
          }]
        }, { status: testError.statusCode || 500 })
      }
      
      return NextResponse.json({
        success: false,
        message: testError instanceof Error ? testError.message : 'Test execution failed',
        contractName,
        testFileName: `${contractName}Test.t.sol`,
        errors: []
      }, { status: 500 })
    }

  } catch (error) {
    return NextResponse.json({
      success: false,
      message: 'Test execution failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}