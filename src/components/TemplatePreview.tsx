'use client'

import React, { useState } from 'react'

interface TemplateFile {
  path: string
  content: string
  description?: string
}

interface TemplatePreviewProps {
  template: {
    id: string
    name: string
    description: string
    category: string
    difficulty: string
    language: string
    files: TemplateFile[]
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
    metadata: {
      author?: string
      version: string
      tags: string[]
      estimatedTime?: string
      prerequisites?: string[]
    }
  }
  onClose: () => void
  onApply: (templateId: string) => void
}

export default function TemplatePreview({ template, onClose, onApply }: TemplatePreviewProps) {
  const [selectedFile, setSelectedFile] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'files' | 'config' | 'dependencies'>('files')

  const getFileIcon = (path: string) => {
    const extension = path.split('.').pop()?.toLowerCase()
    switch (extension) {
      case 'sol': return '🔷'
      case 'js': return '📜'
      case 'ts': return '📘'
      case 'md': return '📝'
      case 'json': return '📋'
      case 'toml': return '⚙️'
      default: return '📄'
    }
  }

  const getLanguageColor = (language: string) => {
    switch (language) {
      case 'solidity': return 'bg-blue-100 text-blue-800'
      case 'javascript': return 'bg-yellow-100 text-yellow-800'
      case 'typescript': return 'bg-blue-100 text-blue-800'
      default: return 'bg-gray-100 text-gray-800'
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

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{template.name}</h2>
            <p className="text-gray-600 mt-1">{template.description}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl"
          >
            ×
          </button>
        </div>

        {/* Template Info */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium text-gray-700">Language:</span>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getLanguageColor(template.language)}`}>
                {template.language}
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium text-gray-700">Difficulty:</span>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getDifficultyColor(template.difficulty)}`}>
                {template.difficulty}
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium text-gray-700">Category:</span>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getCategoryColor(template.category)}`}>
                {template.category}
              </span>
            </div>
            {template.metadata.estimatedTime && (
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium text-gray-700">Time:</span>
                <span className="text-sm text-gray-600">{template.metadata.estimatedTime}</span>
              </div>
            )}
          </div>

          {template.metadata.tags && template.metadata.tags.length > 0 && (
            <div className="mt-4">
              <span className="text-sm font-medium text-gray-700">Tags:</span>
              <div className="flex flex-wrap gap-1 mt-1">
                {template.metadata.tags.map((tag, index) => (
                  <span key={index} className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            <button
              onClick={() => setActiveTab('files')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'files'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Files ({template.files.length})
            </button>
            <button
              onClick={() => setActiveTab('config')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'config'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Configuration
            </button>
            <button
              onClick={() => setActiveTab('dependencies')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'dependencies'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Dependencies ({template.dependencies.length})
            </button>
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          {activeTab === 'files' && (
            <div className="flex h-96">
              {/* File List */}
              <div className="w-1/3 border-r border-gray-200 overflow-y-auto">
                <div className="p-4">
                  <h3 className="text-sm font-medium text-gray-700 mb-3">Files</h3>
                  <div className="space-y-1">
                    {template.files.map((file, index) => (
                      <button
                        key={index}
                        onClick={() => setSelectedFile(file.path)}
                        className={`w-full text-left px-3 py-2 rounded text-sm ${
                          selectedFile === file.path
                            ? 'bg-blue-100 text-blue-800'
                            : 'hover:bg-gray-100'
                        }`}
                      >
                        <div className="flex items-center space-x-2">
                          <span>{getFileIcon(file.path)}</span>
                          <span className="truncate">{file.path}</span>
                        </div>
                        {file.description && (
                          <div className="text-xs text-gray-500 mt-1 truncate">
                            {file.description}
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* File Content */}
              <div className="flex-1 overflow-y-auto">
                {selectedFile ? (
                  <div className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-medium text-gray-700">
                        {selectedFile}
                      </h3>
                      <span className="text-xs text-gray-500">
                        {template.files.find(f => f.path === selectedFile)?.content.split('\n').length} lines
                      </span>
                    </div>
                    <pre className="bg-gray-50 p-4 rounded text-sm overflow-x-auto">
                      <code>{template.files.find(f => f.path === selectedFile)?.content}</code>
                    </pre>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-500">
                    Select a file to view its content
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'config' && (
            <div className="p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Foundry Configuration</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Compiler Settings</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Solidity Version:</span>
                      <span className="text-sm font-medium">{template.foundryConfig.solc}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">EVM Version:</span>
                      <span className="text-sm font-medium">{template.foundryConfig.evmVersion || 'london'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Via IR:</span>
                      <span className="text-sm font-medium">{template.foundryConfig.viaIR ? 'Yes' : 'No'}</span>
                    </div>
                  </div>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Optimizer Settings</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Optimizer:</span>
                      <span className="text-sm font-medium">{template.foundryConfig.optimizer ? 'Enabled' : 'Disabled'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Optimizer Runs:</span>
                      <span className="text-sm font-medium">{template.foundryConfig.optimizerRuns}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'dependencies' && (
            <div className="p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Dependencies</h3>
              <div className="space-y-3">
                {template.dependencies.map((dep, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                    <div>
                      <div className="font-medium text-gray-900">{dep.name}</div>
                      <div className="text-sm text-gray-600">v{dep.version}</div>
                    </div>
                    <div className="text-sm text-gray-500">{dep.source}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200">
          <div className="text-sm text-gray-500">
            {template.metadata.author && `By ${template.metadata.author}`}
            {template.metadata.version && ` • Version ${template.metadata.version}`}
          </div>
          <div className="flex space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={() => onApply(template.id)}
              className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700"
            >
              Apply Template
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
