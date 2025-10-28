'use client'

import React, { useState } from 'react'

interface TemplateFile {
  path: string
  content: string
  description?: string
}

interface TemplateCreatorProps {
  onTemplateCreated?: (template: any) => void
  onCancel?: () => void
}

export default function TemplateCreator({ onTemplateCreated, onCancel }: TemplateCreatorProps) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: 'basic',
    difficulty: 'beginner',
    language: 'solidity',
    files: [] as TemplateFile[],
    dependencies: [] as Array<{ name: string; version: string; source: string }>,
    foundryConfig: {
      solc: '0.8.30',
      optimizer: true,
      optimizerRuns: 200,
      viaIR: false,
      evmVersion: 'london'
    },
    remappings: {} as Record<string, string>,
    metadata: {
      author: '',
      version: '1.0.0',
      tags: [] as string[],
      estimatedTime: '',
      prerequisites: [] as string[]
    }
  })

  const [newFile, setNewFile] = useState({ path: '', content: '', description: '' })
  const [newDependency, setNewDependency] = useState({ name: '', version: '', source: 'github' })
  const [newTag, setNewTag] = useState('')
  const [newPrerequisite, setNewPrerequisite] = useState('')
  const [newRemapping, setNewRemapping] = useState({ key: '', value: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const addFile = () => {
    if (newFile.path && newFile.content) {
      setFormData(prev => ({
        ...prev,
        files: [...prev.files, { ...newFile }]
      }))
      setNewFile({ path: '', content: '', description: '' })
    }
  }

  const removeFile = (index: number) => {
    setFormData(prev => ({
      ...prev,
      files: prev.files.filter((_, i) => i !== index)
    }))
  }

  const addDependency = () => {
    if (newDependency.name && newDependency.version) {
      setFormData(prev => ({
        ...prev,
        dependencies: [...prev.dependencies, { ...newDependency }]
      }))
      setNewDependency({ name: '', version: '', source: 'github' })
    }
  }

  const removeDependency = (index: number) => {
    setFormData(prev => ({
      ...prev,
      dependencies: prev.dependencies.filter((_, i) => i !== index)
    }))
  }

  const addTag = () => {
    if (newTag.trim()) {
      setFormData(prev => ({
        ...prev,
        metadata: {
          ...prev.metadata,
          tags: [...prev.metadata.tags, newTag.trim()]
        }
      }))
      setNewTag('')
    }
  }

  const removeTag = (index: number) => {
    setFormData(prev => ({
      ...prev,
      metadata: {
        ...prev.metadata,
        tags: prev.metadata.tags.filter((_, i) => i !== index)
      }
    }))
  }

  const addPrerequisite = () => {
    if (newPrerequisite.trim()) {
      setFormData(prev => ({
        ...prev,
        metadata: {
          ...prev.metadata,
          prerequisites: [...prev.metadata.prerequisites, newPrerequisite.trim()]
        }
      }))
      setNewPrerequisite('')
    }
  }

  const removePrerequisite = (index: number) => {
    setFormData(prev => ({
      ...prev,
      metadata: {
        ...prev.metadata,
        prerequisites: prev.metadata.prerequisites.filter((_, i) => i !== index)
      }
    }))
  }

  const addRemapping = () => {
    if (newRemapping.key && newRemapping.value) {
      setFormData(prev => ({
        ...prev,
        remappings: {
          ...prev.remappings,
          [newRemapping.key]: newRemapping.value
        }
      }))
      setNewRemapping({ key: '', value: '' })
    }
  }

  const removeRemapping = (key: string) => {
    setFormData(prev => {
      const newRemappings = { ...prev.remappings }
      delete newRemappings[key]
      return {
        ...prev,
        remappings: newRemappings
      }
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)

    try {
      const response = await fetch('/api/templates/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      const data = await response.json()
      if (data.success) {
        onTemplateCreated?.(data.template)
      } else {
        setError(data.error || 'Failed to create template')
      }
    } catch (err) {
      setError('Failed to create template')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Create New Template</h2>
          <p className="text-gray-600 mt-1">Create a custom course template</p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-4">
              <div className="text-sm text-red-700">{error}</div>
            </div>
          )}

          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Template Name *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Category *
              </label>
              <select
                value={formData.category}
                onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value as any }))}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
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
                Difficulty *
              </label>
              <select
                value={formData.difficulty}
                onChange={(e) => setFormData(prev => ({ ...prev, difficulty: e.target.value as any }))}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Language *
              </label>
              <select
                value={formData.language}
                onChange={(e) => setFormData(prev => ({ ...prev, language: e.target.value as any }))}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="solidity">Solidity</option>
                <option value="javascript">JavaScript</option>
                <option value="typescript">TypeScript</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description *
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              rows={3}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          {/* Files */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Template Files *
            </label>
            <div className="space-y-3">
              {formData.files.map((file, index) => (
                <div key={index} className="flex items-center space-x-2 p-3 bg-gray-50 rounded">
                  <div className="flex-1">
                    <div className="font-medium text-sm">{file.path}</div>
                    {file.description && (
                      <div className="text-xs text-gray-500">{file.description}</div>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => removeFile(index)}
                    className="text-red-600 hover:text-red-800 text-sm"
                  >
                    Remove
                  </button>
                </div>
              ))}
              
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      File Path
                    </label>
                    <input
                      type="text"
                      value={newFile.path}
                      onChange={(e) => setNewFile(prev => ({ ...prev, path: e.target.value }))}
                      placeholder="src/Contract.sol"
                      className="w-full border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Description
                    </label>
                    <input
                      type="text"
                      value={newFile.description}
                      onChange={(e) => setNewFile(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Optional description"
                      className="w-full border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  <div className="flex items-end">
                    <button
                      type="button"
                      onClick={addFile}
                      className="w-full bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700"
                    >
                      Add File
                    </button>
                  </div>
                </div>
                <div className="mt-3">
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    File Content
                  </label>
                  <textarea
                    value={newFile.content}
                    onChange={(e) => setNewFile(prev => ({ ...prev, content: e.target.value }))}
                    placeholder="// SPDX-License-Identifier: MIT&#10;pragma solidity ^0.8.30;&#10;&#10;contract MyContract {&#10;    // Contract code here&#10;}"
                    rows={6}
                    className="w-full border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Dependencies */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Dependencies
            </label>
            <div className="space-y-2">
              {formData.dependencies.map((dep, index) => (
                <div key={index} className="flex items-center space-x-2 p-2 bg-gray-50 rounded">
                  <span className="text-sm font-medium">{dep.name}</span>
                  <span className="text-sm text-gray-500">v{dep.version}</span>
                  <span className="text-sm text-gray-500">({dep.source})</span>
                  <button
                    type="button"
                    onClick={() => removeDependency(index)}
                    className="text-red-600 hover:text-red-800 text-sm"
                  >
                    Remove
                  </button>
                </div>
              ))}
              
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={newDependency.name}
                  onChange={(e) => setNewDependency(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Dependency name"
                  className="flex-1 border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <input
                  type="text"
                  value={newDependency.version}
                  onChange={(e) => setNewDependency(prev => ({ ...prev, version: e.target.value }))}
                  placeholder="Version"
                  className="flex-1 border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <select
                  value={newDependency.source}
                  onChange={(e) => setNewDependency(prev => ({ ...prev, source: e.target.value as any }))}
                  className="border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="github">GitHub</option>
                  <option value="npm">NPM</option>
                  <option value="git">Git</option>
                </select>
                <button
                  type="button"
                  onClick={addDependency}
                  className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700"
                >
                  Add
                </button>
              </div>
            </div>
          </div>

          {/* Metadata */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Author
              </label>
              <input
                type="text"
                value={formData.metadata.author}
                onChange={(e) => setFormData(prev => ({ 
                  ...prev, 
                  metadata: { ...prev.metadata, author: e.target.value }
                }))}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Version *
              </label>
              <input
                type="text"
                value={formData.metadata.version}
                onChange={(e) => setFormData(prev => ({ 
                  ...prev, 
                  metadata: { ...prev.metadata, version: e.target.value }
                }))}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Estimated Time
              </label>
              <input
                type="text"
                value={formData.metadata.estimatedTime}
                onChange={(e) => setFormData(prev => ({ 
                  ...prev, 
                  metadata: { ...prev.metadata, estimatedTime: e.target.value }
                }))}
                placeholder="2-3 hours"
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Tags */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tags
            </label>
            <div className="flex flex-wrap gap-2 mb-2">
              {formData.metadata.tags.map((tag, index) => (
                <span key={index} className="inline-flex items-center px-2 py-1 bg-blue-100 text-blue-800 rounded text-sm">
                  {tag}
                  <button
                    type="button"
                    onClick={() => removeTag(index)}
                    className="ml-1 text-blue-600 hover:text-blue-800"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
            <div className="flex space-x-2">
              <input
                type="text"
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                placeholder="Add tag"
                className="flex-1 border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <button
                type="button"
                onClick={addTag}
                className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700"
              >
                Add
              </button>
            </div>
          </div>

          {/* Prerequisites */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Prerequisites
            </label>
            <div className="space-y-1 mb-2">
              {formData.metadata.prerequisites.map((prereq, index) => (
                <div key={index} className="flex items-center space-x-2 p-2 bg-gray-50 rounded">
                  <span className="text-sm">{prereq}</span>
                  <button
                    type="button"
                    onClick={() => removePrerequisite(index)}
                    className="text-red-600 hover:text-red-800 text-sm"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
            <div className="flex space-x-2">
              <input
                type="text"
                value={newPrerequisite}
                onChange={(e) => setNewPrerequisite(e.target.value)}
                placeholder="Add prerequisite"
                className="flex-1 border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <button
                type="button"
                onClick={addPrerequisite}
                className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700"
              >
                Add
              </button>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end space-x-3 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || formData.files.length === 0}
              className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Creating...' : 'Create Template'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
