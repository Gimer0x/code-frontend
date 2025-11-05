import { NextRequest, NextResponse } from 'next/server'

// Mock dependencies data - in a real app, this would come from a database or external API
const mockDependencies = [
  {
    name: 'forge-std',
    description: 'Standard library for Foundry development',
    versions: ['latest', '1.0.0', '0.1.0'],
    source: 'github',
    category: 'core',
    url: 'https://github.com/foundry-rs/forge-std'
  },
  {
    name: 'openzeppelin-contracts',
    description: 'OpenZeppelin Contracts is a library for secure smart contract development',
    versions: ['latest', '4.8.0', '4.7.0', '4.6.0'],
    source: 'github',
    category: 'security',
    url: 'https://github.com/OpenZeppelin/openzeppelin-contracts'
  },
  {
    name: 'solmate',
    description: 'Modern, opinionated, and gas optimized building blocks for smart contract development',
    versions: ['latest', '6.0.0', '5.0.0'],
    source: 'github',
    category: 'gas-optimized',
    url: 'https://github.com/transmissions11/solmate'
  },
  {
    name: 'ds-test',
    description: 'Testing utilities for DappSys',
    versions: ['latest', '1.0.0'],
    source: 'github',
    category: 'testing',
    url: 'https://github.com/dapphub/ds-test'
  },
  {
    name: 'forge-std-std',
    description: 'Standard library extensions for Foundry',
    versions: ['latest', '1.0.0'],
    source: 'github',
    category: 'extensions',
    url: 'https://github.com/foundry-rs/forge-std'
  },
  {
    name: 'prb-math',
    description: 'Solidity library for advanced fixed-point math',
    versions: ['latest', '2.0.0', '1.0.0'],
    source: 'github',
    category: 'math',
    url: 'https://github.com/PaulRBerg/prb-math'
  },
  {
    name: 'prb-proxy',
    description: 'Proxy pattern implementation',
    versions: ['latest', '1.0.0'],
    source: 'github',
    category: 'patterns',
    url: 'https://github.com/PaulRBerg/prb-proxy'
  },
  {
    name: 'prb-test',
    description: 'Testing utilities for PRB projects',
    versions: ['latest', '1.0.0'],
    source: 'github',
    category: 'testing',
    url: 'https://github.com/PaulRBerg/prb-test'
  }
]

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category')
    const search = searchParams.get('search')

    let filteredDependencies = mockDependencies

    // Filter by category
    if (category && category !== 'all') {
      filteredDependencies = filteredDependencies.filter(dep => dep.category === category)
    }

    // Filter by search term
    if (search) {
      const searchLower = search.toLowerCase()
      filteredDependencies = filteredDependencies.filter(dep => 
        dep.name.toLowerCase().includes(searchLower) ||
        dep.description.toLowerCase().includes(searchLower)
      )
    }

    return NextResponse.json({
      success: true,
      dependencies: filteredDependencies,
      total: filteredDependencies.length,
      categories: [...new Set(mockDependencies.map(dep => dep.category))]
    })
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch dependencies'
    }, { status: 500 })
  }
}
