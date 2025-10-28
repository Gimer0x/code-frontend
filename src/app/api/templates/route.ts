import { NextRequest, NextResponse } from 'next/server'
import { withAuth, createErrorResponse, createSuccessResponse } from '@/lib/auth-utils'

// Mock templates data - in a real app, this would come from a database
const mockTemplates = [
  {
    id: 'solidity-basic',
    name: 'Solidity Basics',
    description: 'A beginner-friendly template for learning Solidity fundamentals',
    category: 'basic',
    difficulty: 'beginner',
    language: 'solidity',
    metadata: {
      author: 'DappDojo Team',
      version: '1.0.0',
      tags: ['solidity', 'beginner', 'fundamentals'],
      estimatedTime: '2-3 hours',
      prerequisites: ['Basic programming knowledge']
    },
    dependencies: [
      { name: 'forge-std', version: 'latest', source: 'github' }
    ],
    foundryConfig: {
      solc: '0.8.30',
      optimizer: true,
      optimizerRuns: 200,
      viaIR: false,
      evmVersion: 'london'
    }
  },
  {
    id: 'solidity-advanced',
    name: 'Advanced Solidity',
    description: 'Advanced Solidity patterns and best practices',
    category: 'advanced',
    difficulty: 'advanced',
    language: 'solidity',
    metadata: {
      author: 'DappDojo Team',
      version: '1.0.0',
      tags: ['solidity', 'advanced', 'patterns'],
      estimatedTime: '4-6 hours',
      prerequisites: ['Solidity basics', 'Smart contract development']
    },
    dependencies: [
      { name: 'forge-std', version: 'latest', source: 'github' },
      { name: 'openzeppelin-contracts', version: 'latest', source: 'github' }
    ],
    foundryConfig: {
      solc: '0.8.30',
      optimizer: true,
      optimizerRuns: 1000,
      viaIR: true,
      evmVersion: 'london'
    }
  },
  {
    id: 'solidity-defi',
    name: 'DeFi Protocol',
    description: 'Template for building DeFi protocols and DEXs',
    category: 'defi',
    difficulty: 'intermediate',
    language: 'solidity',
    metadata: {
      author: 'DappDojo Team',
      version: '1.0.0',
      tags: ['solidity', 'defi', 'dex', 'protocol'],
      estimatedTime: '6-8 hours',
      prerequisites: ['Solidity basics', 'DeFi concepts']
    },
    dependencies: [
      { name: 'forge-std', version: 'latest', source: 'github' },
      { name: 'openzeppelin-contracts', version: 'latest', source: 'github' },
      { name: 'solmate', version: 'latest', source: 'github' }
    ],
    foundryConfig: {
      solc: '0.8.30',
      optimizer: true,
      optimizerRuns: 200,
      viaIR: false,
      evmVersion: 'london'
    }
  },
  {
    id: 'solidity-nft',
    name: 'NFT Collection',
    description: 'Template for creating NFT collections and marketplaces',
    category: 'nft',
    difficulty: 'intermediate',
    language: 'solidity',
    metadata: {
      author: 'DappDojo Team',
      version: '1.0.0',
      tags: ['solidity', 'nft', 'erc721', 'marketplace'],
      estimatedTime: '4-5 hours',
      prerequisites: ['Solidity basics', 'ERC standards']
    },
    dependencies: [
      { name: 'forge-std', version: 'latest', source: 'github' },
      { name: 'openzeppelin-contracts', version: 'latest', source: 'github' }
    ],
    foundryConfig: {
      solc: '0.8.30',
      optimizer: true,
      optimizerRuns: 200,
      viaIR: false,
      evmVersion: 'london'
    }
  }
]

export async function GET(request: NextRequest) {
  try {
    // In a real app, you would fetch templates from a database
    // For now, we'll return mock data
    return NextResponse.json({
      success: true,
      templates: mockTemplates,
      total: mockTemplates.length
    })
  } catch (error) {
    console.error('Error fetching templates:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch templates'
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  return withAuth(request, async (session) => {
    try {
      const body = await request.json()
      const { name, description, category, difficulty, language, metadata, dependencies, foundryConfig } = body

      // In a real app, you would save the template to a database
      const newTemplate = {
        id: `template-${Date.now()}`,
        name,
        description,
        category,
        difficulty,
        language,
        metadata: {
          author: session.user.name || 'Unknown',
          version: '1.0.0',
          ...metadata
        },
        dependencies: dependencies || [],
        foundryConfig: foundryConfig || {
          solc: '0.8.30',
          optimizer: true,
          optimizerRuns: 200,
          viaIR: false,
          evmVersion: 'london'
        }
      }

      // Add to mock templates (in real app, save to database)
      mockTemplates.push(newTemplate)

      return createSuccessResponse({
        template: newTemplate,
        message: 'Template created successfully'
      })
    } catch (error) {
      console.error('Error creating template:', error)
      return createErrorResponse('Failed to create template', 500)
    }
  }, ['ADMIN']) // Only admins can create templates
}