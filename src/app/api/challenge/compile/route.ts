import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { getCompilationClient, compilationUtils, CompilationError } from '@/lib/compilationClient'
import { databaseService } from '@/lib/database-service'

const compileSchema = z.object({
  code: z.string(),
  courseId: z.string(),
  lessonId: z.string().optional(),
  skipSession: z.boolean().optional()
})

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    // For development, allow requests without session
    // if (!session?.user?.id) {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    // }

    const body = await request.json()
    const { code, courseId, lessonId, skipSession } = compileSchema.parse(body)

    // Clean the code to remove invisible characters and trailing whitespace
    const cleanCode = code.trim().replace(/[\u200B-\u200D\uFEFF]/g, '')
    
    // If skipSession is true, skip database operations and just compile
    if (skipSession) {
          
      // Extract contract name from cleaned code
      let contractName = 'TempContract'
      const contractMatch = cleanCode.match(/contract\s+(\w+)/)
      if (contractMatch) {
        contractName = contractMatch[1]
      }

      // Use Fly.io compilation client for compilation (no session)
      const client = getCompilationClient()
      
      try {
        // Validate request
        const validationErrors = compilationUtils.validateCompilationRequest({
          userId: session?.user?.id || 'admin',
          courseId,
          lessonId: 'preview',
          code: cleanCode,
          contractName
        })
        
        if (validationErrors.length > 0) {
          return NextResponse.json({
            success: false,
            errors: [{
              type: 'validation_error',
              message: validationErrors.map(e => e.message).join(', ')
            }],
            output: 'Validation failed',
            contractName,
            compilationTime: null
          }, { status: 400 })
        }

        // Compile using the client (no database operations)
        const result = await client.compile({
          userId: 'admin-preview',
          courseId,
          lessonId: 'preview',
          code: cleanCode,
          contractName,
          options: {
            verbose: true,
            gasReport: false
          }
        })

        // Return compilation result without database operations
        return NextResponse.json({
          success: result.success,
          errors: result.errors || [],
          warnings: result.warnings || [],
          output: result.result?.output || '',
          contractName,
          compilationTime: result.result?.compilationTime || null,
          artifacts: result.artifacts,
          contracts: result.contracts,
          message: result.success ? 'Compilation successful' : 'Compilation failed'
        })
      } catch (compilationError: any) {
        return NextResponse.json({
          success: false,
          errors: [{
            type: 'compilation_error',
            message: compilationError.message || 'Compilation failed'
          }],
          output: '',
          contractName,
          compilationTime: null
        }, { status: 500 })
      }
    }

    // Resolve the correct lesson ID if it's a temporary ID
    let actualLessonId = lessonId || 'default'
    if (lessonId && lessonId.startsWith('lesson-')) {
      // This is a temporary lesson ID, find the actual lesson in the database
      const lesson = await prisma.lesson.findFirst({
        where: {
          module: {
            courseId: courseId
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      })
      
      if (lesson) {
        actualLessonId = lesson.id
        
      } else {
      }
    }

    // Extract contract name from cleaned code
    let contractName = 'TempContract' // default fallback
    const contractMatch = cleanCode.match(/contract\s+(\w+)/)
    if (contractMatch) {
      contractName = contractMatch[1]
    }

    // Save to database first (before compilation) - only if user is authenticated
    if (session?.user?.id) {
      try {
        await databaseService.saveStudentCode(session.user.id, courseId, actualLessonId, code)
      } catch (saveError) {
      }
    } else {
    }

    // Use Fly.io compilation client for compilation
    const client = getCompilationClient()
    
    try {
      // Validate request
      const validationErrors = compilationUtils.validateCompilationRequest({
        userId: session?.user?.id || 'anonymous',
        courseId,
        lessonId: actualLessonId,
        code: cleanCode,
        contractName
      })
      
      if (validationErrors.length > 0) {
        return NextResponse.json({
          success: false,
          errors: [{
            message: `Validation failed: ${validationErrors.join(', ')}`,
            line: null,
            column: null,
            suggestions: []
          }],
          warnings: [],
          contractName,
          compilationTime: null
        }, { status: 400 })
      }

      // Compile using the client
      const result = await client.compile({
        userId: session?.user?.id || 'anonymous',
        courseId,
        lessonId: actualLessonId,
        code: cleanCode,
        contractName,
        options: {
          verbose: true,
          gasReport: true
        }
      })

      // Enhance error messages with suggestions
      const enhancedErrors = (result.errors || []).map((error: any) => ({
        ...error,
        suggestions: getErrorSuggestions(error)
      }))

      // Save compilation result to database if user is authenticated
      if (session?.user?.id) {
        try {
          const progress = await databaseService.getOrCreateStudentProgress({
            userId: session.user.id,
            courseId,
            lessonId: actualLessonId
          })

          await databaseService.saveCompilationResult({
            studentProgressId: progress.id,
            success: result.success,
            output: result.result?.output,
            errors: enhancedErrors,
            warnings: result.warnings || [],
            compilationTime: result.result?.compilationTime
          })
        } catch (dbError) {
        }
      }

      return NextResponse.json({
        success: result.success,
        message: result.message || 'Compilation completed',
        output: result.result?.output,
        errors: enhancedErrors,
        warnings: result.warnings || [],
        contractName,
        compilationTime: result.result?.compilationTime,
        // Enhanced compilation details
        artifacts: result.result?.artifacts || [],
        contracts: result.result?.contracts || [],
        sessionId: result.sessionId || null,
        timestamp: result.timestamp || new Date().toISOString()
      })

    } catch (compilationError) {
      
      // Handle CompilationError specifically
      if (compilationError instanceof CompilationError) {
        return NextResponse.json({
          success: false,
          output: null,
          errors: [{
            message: compilationError.message,
            line: null,
            column: null,
            suggestions: getErrorSuggestions({ message: compilationError.message })
          }],
          warnings: [],
          contractName,
          compilationTime: null
        }, { status: compilationError.statusCode || 500 })
      }
      
      // Fallback to basic error response
      return NextResponse.json({
        success: false,
        output: null,
        errors: [{
          message: compilationError instanceof Error ? compilationError.message : 'Compilation failed',
          line: null,
          column: null,
          suggestions: []
        }],
        warnings: [],
        contractName,
        compilationTime: null
      }, { status: 500 })
    }
  } catch (error) {
    return NextResponse.json({
      success: false,
      errors: [{
        severity: 'error',
        message: error instanceof Error ? error.message : 'Compilation failed',
        type: 'CompilationError',
        line: 0,
        column: 0,
        suggestions: ['Check your Solidity syntax and try again']
      }],
      warnings: []
    })
  }
}

// Helper function to provide suggestions for common errors
function getErrorSuggestions(error: any): string[] {
  const message = error.message?.toLowerCase() || ''
  const suggestions: string[] = []

  if (message.includes('pragma')) {
    suggestions.push('Make sure you have a valid pragma statement at the top of your contract')
    suggestions.push('Example: pragma solidity ^0.8.30;')
  }

  if (message.includes('contract')) {
    suggestions.push('Check that your contract declaration is correct')
    suggestions.push('Example: contract MyContract { ... }')
  }

  if (message.includes('function')) {
    suggestions.push('Verify your function syntax and visibility modifiers')
    suggestions.push('Example: function myFunction() public { ... }')
  }

  if (message.includes('variable')) {
    suggestions.push('Check variable declarations and types')
    suggestions.push('Example: uint256 public myVariable;')
  }

  if (message.includes('semicolon')) {
    suggestions.push('Add missing semicolons at the end of statements')
  }

  if (message.includes('bracket') || message.includes('brace')) {
    suggestions.push('Check for missing or mismatched brackets { } or parentheses ( )')
  }

  if (message.includes('import')) {
    suggestions.push('Verify import statements are correct')
    suggestions.push('Example: import "@openzeppelin/contracts/token/ERC20/ERC20.sol";')
  }

  if (message.includes('visibility')) {
    suggestions.push('Add visibility modifiers: public, private, internal, or external')
  }

  if (message.includes('override')) {
    suggestions.push('Add override keyword when overriding functions from parent contracts')
  }

  if (message.includes('payable')) {
    suggestions.push('Add payable modifier to functions that should receive Ether')
  }

  if (message.includes('view') || message.includes('pure')) {
    suggestions.push('Add view or pure modifiers to functions that don\'t modify state')
  }

  if (message.includes('return')) {
    suggestions.push('Check return statements match function return types')
  }

  if (message.includes('memory') || message.includes('storage') || message.includes('calldata')) {
    suggestions.push('Specify data location for complex types: memory, storage, or calldata')
  }

  if (message.includes('constructor')) {
    suggestions.push('Check constructor syntax and parameters')
    suggestions.push('Example: constructor(uint256 _param) { ... }')
  }

  if (message.includes('modifier')) {
    suggestions.push('Verify modifier syntax and usage')
    suggestions.push('Example: modifier onlyOwner() { require(msg.sender == owner); _; }')
  }

  if (message.includes('event')) {
    suggestions.push('Check event declarations and emissions')
    suggestions.push('Example: event MyEvent(uint256 value); emit MyEvent(123);')
  }

  if (message.includes('error')) {
    suggestions.push('Check custom error declarations and usage')
    suggestions.push('Example: error MyError(string message); revert MyError("message");')
  }

  if (message.includes('require') || message.includes('assert')) {
    suggestions.push('Verify require and assert statements')
    suggestions.push('Example: require(condition, "error message");')
  }

  if (message.includes('revert')) {
    suggestions.push('Check revert statements and custom errors')
    suggestions.push('Example: revert("error message"); or revert MyError("message");')
  }

  if (message.includes('msg.sender') || message.includes('msg.value')) {
    suggestions.push('Verify usage of msg.sender and msg.value')
    suggestions.push('msg.sender is the address calling the function')
    suggestions.push('msg.value is the amount of Ether sent with the call')
  }

  if (message.includes('block.timestamp') || message.includes('block.number')) {
    suggestions.push('Check usage of block properties')
    suggestions.push('block.timestamp is the current block timestamp')
    suggestions.push('block.number is the current block number')
  }

  if (message.includes('address')) {
    suggestions.push('Verify address types and conversions')
    suggestions.push('Example: address payable owner = payable(msg.sender);')
  }

  if (message.includes('uint') || message.includes('int')) {
    suggestions.push('Check integer types and sizes')
    suggestions.push('Examples: uint256, uint8, int256, int8')
  }

  if (message.includes('string') || message.includes('bytes')) {
    suggestions.push('Verify string and bytes usage')
    suggestions.push('Examples: string memory text, bytes32 hash')
  }

  if (message.includes('mapping')) {
    suggestions.push('Check mapping syntax and key-value types')
    suggestions.push('Example: mapping(address => uint256) public balances;')
  }

  if (message.includes('struct')) {
    suggestions.push('Verify struct declarations and usage')
    suggestions.push('Example: struct Person { string name; uint256 age; }')
  }

  if (message.includes('enum')) {
    suggestions.push('Check enum declarations and usage')
    suggestions.push('Example: enum Status { Active, Inactive }')
  }

  if (message.includes('array')) {
    suggestions.push('Verify array declarations and operations')
    suggestions.push('Examples: uint256[] public numbers, uint256[5] public fixedArray')
  }

  if (message.includes('inheritance')) {
    suggestions.push('Check contract inheritance syntax')
    suggestions.push('Example: contract Child is Parent { ... }')
  }

  if (message.includes('interface')) {
    suggestions.push('Verify interface declarations and implementations')
    suggestions.push('Example: interface IERC20 { function transfer(address to, uint256 amount) external; }')
  }

  if (message.includes('library')) {
    suggestions.push('Check library declarations and usage')
    suggestions.push('Example: library Math { function add(uint256 a, uint256 b) internal pure returns (uint256) { ... } }')
  }

  if (message.includes('assembly')) {
    suggestions.push('Verify inline assembly syntax')
    suggestions.push('Example: assembly { let result := add(a, b) }')
  }

  if (message.includes('gas')) {
    suggestions.push('Check gas optimization and usage')
    suggestions.push('Consider using view/pure functions, storage vs memory, and efficient data types')
  }

  if (message.includes('security')) {
    suggestions.push('Review security best practices')
    suggestions.push('Check for reentrancy, overflow, and access control issues')
  }

  // Default suggestions if no specific error is found
  if (suggestions.length === 0) {
    suggestions.push('Review the error message carefully')
    suggestions.push('Check Solidity documentation for syntax requirements')
    suggestions.push('Verify all brackets, parentheses, and semicolons are properly placed')
    suggestions.push('Ensure all variables and functions are properly declared')
  }

  return suggestions
}
