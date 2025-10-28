'use client'

import { useState, useEffect } from 'react'

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

interface TemplateSelectorProps {
  onTemplateSelect: (template: Template | null) => void
  selectedTemplate: Template | null
  courseId: string
  showPreview?: boolean
}

export default function TemplateSelector({ 
  onTemplateSelect, 
  selectedTemplate, 
  courseId,
  showPreview = true 
}: TemplateSelectorProps) {
  const [templates, setTemplates] = useState<Template[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('all')
  const [previewTemplate, setPreviewTemplate] = useState<Template | null>(null)

  useEffect(() => {
    fetchTemplates()
  }, [])

  const fetchTemplates = async () => {
    try {
      setIsLoading(true)
      setError(null)

      const response = await fetch('/api/templates')
      const data = await response.json()

      if (data.success) {
        setTemplates(data.templates)
      } else {
        setError(data.error || 'Failed to fetch templates')
      }
    } catch (err) {
      setError('Failed to fetch templates')
    } finally {
      setIsLoading(false)
    }
  }

  const filteredTemplates = templates.filter(template => {
    const matchesSearch = template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         template.description.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory = selectedCategory === 'all' || template.category === selectedCategory
    const matchesDifficulty = selectedDifficulty === 'all' || template.difficulty === selectedDifficulty

    return matchesSearch && matchesCategory && matchesDifficulty
  })

  const categories = ['all', ...Array.from(new Set(templates.map(t => t.category)))]
  const difficulties = ['all', ...Array.from(new Set(templates.map(t => t.difficulty)))]

  const handleTemplateClick = (template: Template) => {
    if (selectedTemplate?.id === template.id) {
      onTemplateSelect(null)
    } else {
      onTemplateSelect(template)
    }
  }

  const handlePreview = (template: Template) => {
    setPreviewTemplate(template)
  }

  const handleClosePreview = () => {
    setPreviewTemplate(null)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-500"></div>
        <span className="ml-2 text-gray-300">Loading templates...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-900 border border-red-700 rounded-md p-4">
        <div className="flex">
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-300">Error</h3>
            <div className="mt-2 text-sm text-red-200">{error}</div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Search and Filters */}
      <div className="space-y-4">
        <div>
          <input
            type="text"
            placeholder="Search templates..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-3 py-2 border border-gray-600 rounded-md focus:ring-yellow-500 focus:border-yellow-500 bg-gray-700 text-white placeholder-gray-400"
          />
        </div>

        <div className="flex space-x-4">
          <div>
            <label className="block text-sm font-medium text-gray-200 mb-1">
              Category
            </label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3 py-2 border border-gray-600 rounded-md focus:ring-yellow-500 focus:border-yellow-500 bg-gray-700 text-white"
            >
              {categories.map(category => (
                <option key={category} value={category}>
                  {category.charAt(0).toUpperCase() + category.slice(1)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-200 mb-1">
              Difficulty
            </label>
            <select
              value={selectedDifficulty}
              onChange={(e) => setSelectedDifficulty(e.target.value)}
              className="px-3 py-2 border border-gray-600 rounded-md focus:ring-yellow-500 focus:border-yellow-500 bg-gray-700 text-white"
            >
              {difficulties.map(difficulty => (
                <option key={difficulty} value={difficulty}>
                  {difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Templates Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredTemplates.map((template) => (
          <div
            key={template.id}
            className={`border rounded-lg p-4 cursor-pointer transition-all ${
              selectedTemplate?.id === template.id
                ? 'border-yellow-500 bg-yellow-900/20'
                : 'border-gray-600 hover:border-gray-500 hover:shadow-md bg-gray-700'
            }`}
            onClick={() => handleTemplateClick(template)}
          >
            <div className="flex items-start justify-between mb-2">
              <h3 className="font-medium text-white">{template.name}</h3>
              <div className="flex space-x-1">
                <span className={`px-2 py-1 text-xs rounded ${
                  template.category === 'basic' ? 'bg-green-100 text-green-800' :
                  template.category === 'advanced' ? 'bg-purple-100 text-purple-800' :
                  template.category === 'defi' ? 'bg-blue-100 text-blue-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {template.category}
                </span>
                <span className={`px-2 py-1 text-xs rounded ${
                  template.difficulty === 'beginner' ? 'bg-green-100 text-green-800' :
                  template.difficulty === 'intermediate' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-red-100 text-red-800'
                }`}>
                  {template.difficulty}
                </span>
              </div>
            </div>

            <p className="text-sm text-gray-300 mb-3">{template.description}</p>

            <div className="space-y-2">
              <div className="text-xs text-gray-400">
                <strong>Dependencies:</strong> {template.dependencies.length}
              </div>
              <div className="text-xs text-gray-400">
                <strong>Compiler:</strong> {template.foundryConfig.solc}
              </div>
              {template.metadata.estimatedTime && (
                <div className="text-xs text-gray-400">
                  <strong>Est. Time:</strong> {template.metadata.estimatedTime}
                </div>
              )}
            </div>

            <div className="mt-3 flex space-x-2">
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  handlePreview(template)
                }}
                className="text-xs text-yellow-400 hover:text-yellow-300"
              >
                Preview
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  handleTemplateClick(template)
                }}
                className={`text-xs px-2 py-1 rounded ${
                  selectedTemplate?.id === template.id
                    ? 'bg-yellow-500 text-black'
                    : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
                }`}
              >
                {selectedTemplate?.id === template.id ? 'Selected' : 'Select'}
              </button>
            </div>
          </div>
        ))}
      </div>

      {filteredTemplates.length === 0 && (
        <div className="text-center py-8">
          <p className="text-gray-500">No templates found matching your criteria.</p>
        </div>
      )}

      {/* Template Preview Modal */}
      {previewTemplate && showPreview && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">
                {previewTemplate.name}
              </h2>
              <button
                onClick={handleClosePreview}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                ×
              </button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[70vh]">
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Description</h3>
                  <p className="text-gray-600">{previewTemplate.description}</p>
                </div>

                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Metadata</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <strong>Category:</strong> {previewTemplate.category}
                    </div>
                    <div>
                      <strong>Difficulty:</strong> {previewTemplate.difficulty}
                    </div>
                    <div>
                      <strong>Language:</strong> {previewTemplate.language}
                    </div>
                    <div>
                      <strong>Version:</strong> {previewTemplate.metadata.version}
                    </div>
                    {previewTemplate.metadata.estimatedTime && (
                      <div>
                        <strong>Estimated Time:</strong> {previewTemplate.metadata.estimatedTime}
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Dependencies</h3>
                  <div className="space-y-2">
                    {previewTemplate.dependencies.map((dep, index) => (
                      <div key={index} className="text-sm text-gray-600">
                        {dep.name} ({dep.version}) - {dep.source}
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Foundry Configuration</h3>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <strong>Compiler:</strong> {previewTemplate.foundryConfig.solc}
                      </div>
                      <div>
                        <strong>Optimizer:</strong> {previewTemplate.foundryConfig.optimizer ? 'Enabled' : 'Disabled'}
                      </div>
                      <div>
                        <strong>Optimizer Runs:</strong> {previewTemplate.foundryConfig.optimizerRuns}
                      </div>
                      {previewTemplate.foundryConfig.viaIR && (
                        <div>
                          <strong>Via IR:</strong> {previewTemplate.foundryConfig.viaIR ? 'Yes' : 'No'}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {previewTemplate.metadata.tags.length > 0 && (
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Tags</h3>
                    <div className="flex flex-wrap gap-2">
                      {previewTemplate.metadata.tags.map((tag, index) => (
                        <span key={index} className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className="flex justify-end p-6 border-t border-gray-200">
              <button
                onClick={() => {
                  onTemplateSelect(previewTemplate)
                  handleClosePreview()
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Select Template
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
