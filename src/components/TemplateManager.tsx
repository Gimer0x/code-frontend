'use client'

import React, { useState, useEffect } from 'react'

interface Template {
  id: string
  name: string
  description: string
  category: string
  difficulty: string
  language: string
  metadata: {
    author?: string
    version: string
    tags: string[]
    estimatedTime?: string
    prerequisites?: string[]
  }
  dependencies: Array<{
    name: string
    version: string
    source: string
  }>
  foundryConfig: {
    solc: string
    optimizer: boolean
    optimizerRuns: number
    viaIR?: boolean
    evmVersion?: string
  }
}

interface TemplateManagerProps {
  courseId: string
  onTemplateApplied?: (template: Template) => void
}

export default function TemplateManager({ courseId, onTemplateApplied }: TemplateManagerProps) {
  const [templates, setTemplates] = useState<Template[]>([])
  const [filteredTemplates, setFilteredTemplates] = useState<Template[]>([])
  const [loading, setLoading] = useState(true)
  const [applying, setApplying] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('')
  const [selectedDifficulty, setSelectedDifficulty] = useState('')
  const [selectedLanguage, setSelectedLanguage] = useState('')

  // Load templates on mount
  useEffect(() => {
    loadTemplates()
  }, [])

  // Filter templates when filters change
  useEffect(() => {
    filterTemplates()
  }, [templates, searchQuery, selectedCategory, selectedDifficulty, selectedLanguage])

  const loadTemplates = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/templates')
      const data = await response.json()

      if (data.success) {
        setTemplates(data.templates)
      } else {
        setError(data.error || 'Failed to load templates')
      }
    } catch (err) {
      setError('Failed to load templates')
    } finally {
      setLoading(false)
    }
  }

  const filterTemplates = () => {
    let filtered = templates

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(template =>
        template.name.toLowerCase().includes(query) ||
        template.description.toLowerCase().includes(query) ||
        template.metadata.tags.some(tag => tag.toLowerCase().includes(query))
      )
    }

    // Category filter
    if (selectedCategory) {
      filtered = filtered.filter(template => template.category === selectedCategory)
    }

    // Difficulty filter
    if (selectedDifficulty) {
      filtered = filtered.filter(template => template.difficulty === selectedDifficulty)
    }

    // Language filter
    if (selectedLanguage) {
      filtered = filtered.filter(template => template.language === selectedLanguage)
    }

    setFilteredTemplates(filtered)
  }

  const applyTemplate = async (templateId: string) => {
    try {
      setApplying(templateId)
      const response = await fetch('/api/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templateId,
          courseId
        })
      })

      const data = await response.json()
      if (data.success) {
        onTemplateApplied?.(data.template)
        // Show success message
        alert(`Template "${data.template.name}" applied successfully!`)
      } else {
        setError(data.error || 'Failed to apply template')
      }
    } catch (err) {
      setError('Failed to apply template')
    } finally {
      setApplying(null)
    }
  }

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner': return 'bg-green-100 text-green-800'
      case 'intermediate': return 'bg-yellow-100 text-yellow-800'
      case 'advanced': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'basic': return 'bg-blue-100 text-blue-800'
      case 'advanced': return 'bg-purple-100 text-purple-800'
      case 'defi': return 'bg-green-100 text-green-800'
      case 'nft': return 'bg-pink-100 text-pink-800'
      case 'dao': return 'bg-orange-100 text-orange-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2">Loading templates...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4">
        <div className="flex">
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">Error</h3>
            <div className="mt-2 text-sm text-red-700">{error}</div>
            <div className="mt-4">
              <button
                onClick={loadTemplates}
                className="bg-red-100 hover:bg-red-200 text-red-800 px-3 py-1 rounded text-sm"
              >
                Retry
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Search and Filters */}
      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Template Filters</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Search
            </label>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search templates..."
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Category
            </label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Categories</option>
              <option value="basic">Basic</option>
              <option value="advanced">Advanced</option>
              <option value="defi">DeFi</option>
              <option value="nft">NFT</option>
              <option value="dao">DAO</option>
              <option value="custom">Custom</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Difficulty
            </label>
            <select
              value={selectedDifficulty}
              onChange={(e) => setSelectedDifficulty(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Difficulties</option>
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Language
            </label>
            <select
              value={selectedLanguage}
              onChange={(e) => setSelectedLanguage(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Languages</option>
              <option value="solidity">Solidity</option>
              <option value="javascript">JavaScript</option>
              <option value="typescript">TypeScript</option>
            </select>
          </div>
        </div>
      </div>

      {/* Templates Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredTemplates.map((template) => (
          <div key={template.id} className="bg-white shadow rounded-lg p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg font-medium text-gray-900">{template.name}</h3>
                <p className="text-sm text-gray-500 mt-1">{template.description}</p>
              </div>
              <div className="flex space-x-2">
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getDifficultyColor(template.difficulty)}`}>
                  {template.difficulty}
                </span>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getCategoryColor(template.category)}`}>
                  {template.category}
                </span>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <h4 className="text-sm font-medium text-gray-700">Language</h4>
                <p className="text-sm text-gray-600">{template.language}</p>
              </div>

              {template.metadata.estimatedTime && (
                <div>
                  <h4 className="text-sm font-medium text-gray-700">Estimated Time</h4>
                  <p className="text-sm text-gray-600">{template.metadata.estimatedTime}</p>
                </div>
              )}

              <div>
                <h4 className="text-sm font-medium text-gray-700">Dependencies</h4>
                <div className="flex flex-wrap gap-1 mt-1">
                  {template.dependencies.map((dep, index) => (
                    <span key={index} className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">
                      {dep.name}
                    </span>
                  ))}
                </div>
              </div>

              {template.metadata.tags && template.metadata.tags.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-gray-700">Tags</h4>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {template.metadata.tags.map((tag, index) => (
                      <span key={index} className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {template.metadata.prerequisites && template.metadata.prerequisites.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-gray-700">Prerequisites</h4>
                  <ul className="text-sm text-gray-600 mt-1">
                    {template.metadata.prerequisites.map((prereq, index) => (
                      <li key={index} className="list-disc list-inside">{prereq}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <div className="mt-6">
              <button
                onClick={() => applyTemplate(template.id)}
                disabled={applying === template.id}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {applying === template.id ? 'Applying...' : 'Apply Template'}
              </button>
            </div>
          </div>
        ))}
      </div>

      {filteredTemplates.length === 0 && (
        <div className="text-center py-8">
          <p className="text-gray-500">No templates found matching your criteria.</p>
          <button
            onClick={() => {
              setSearchQuery('')
              setSelectedCategory('')
              setSelectedDifficulty('')
              setSelectedLanguage('')
            }}
            className="mt-2 text-blue-600 hover:text-blue-800 text-sm"
          >
            Clear filters
          </button>
        </div>
      )}
    </div>
  )
}
