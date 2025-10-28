'use client'

import { useState, useEffect } from 'react'

interface Dependency {
  name: string
  version: string
  source: string
}

interface DependencyManagerProps {
  dependencies: Dependency[]
  onChange: (dependencies: Dependency[]) => void
  remappings: Record<string, string>
  onRemappingsChange: (remappings: Record<string, string>) => void
}

interface AvailableDependency {
  name: string
  description: string
  versions: string[]
  source: string
  category: string
}

export default function DependencyManager({ 
  dependencies, 
  onChange, 
  remappings,
  onRemappingsChange 
}: DependencyManagerProps) {
  const [availableDependencies, setAvailableDependencies] = useState<AvailableDependency[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [newDependency, setNewDependency] = useState<Dependency>({
    name: '',
    version: 'latest',
    source: 'github'
  })
  const [newRemapping, setNewRemapping] = useState({ key: '', value: '' })

  useEffect(() => {
    fetchAvailableDependencies()
  }, [])

  const fetchAvailableDependencies = async () => {
    try {
      setIsLoading(true)
      setError(null)

      const response = await fetch('/api/templates/dependencies')
      const data = await response.json()

      if (data.success) {
        setAvailableDependencies(data.dependencies)
      } else {
        setError(data.error || 'Failed to fetch dependencies')
      }
    } catch (err) {
      setError('Failed to fetch dependencies')
    } finally {
      setIsLoading(false)
    }
  }

  const handleAddDependency = () => {
    if (newDependency.name.trim()) {
      const exists = dependencies.some(dep => dep.name === newDependency.name)
      if (!exists) {
        onChange([...dependencies, { ...newDependency }])
        setNewDependency({ name: '', version: 'latest', source: 'github' })
        setShowAddForm(false)
      } else {
        alert('Dependency already exists')
      }
    }
  }

  const handleRemoveDependency = (index: number) => {
    const updated = dependencies.filter((_, i) => i !== index)
    onChange(updated)
  }

  const handleUpdateDependency = (index: number, field: keyof Dependency, value: string) => {
    const updated = dependencies.map((dep, i) => 
      i === index ? { ...dep, [field]: value } : dep
    )
    onChange(updated)
  }

  const handleAddRemapping = () => {
    if (newRemapping.key.trim() && newRemapping.value.trim()) {
      const updated = { ...remappings, [newRemapping.key]: newRemapping.value }
      onRemappingsChange(updated)
      setNewRemapping({ key: '', value: '' })
    }
  }

  const handleRemoveRemapping = (key: string) => {
    const updated = { ...remappings }
    delete updated[key]
    onRemappingsChange(updated)
  }

  const handleUpdateRemapping = (oldKey: string, newKey: string, value: string) => {
    const updated = { ...remappings }
    delete updated[oldKey]
    updated[newKey] = value
    onRemappingsChange(updated)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2">Loading dependencies...</span>
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
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Dependencies Section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900">Dependencies</h3>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
          >
            {showAddForm ? 'Cancel' : 'Add Dependency'}
          </button>
        </div>

        {/* Add Dependency Form */}
        {showAddForm && (
          <div className="bg-gray-50 rounded-lg p-4 mb-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Name
                </label>
                <input
                  type="text"
                  value={newDependency.name}
                  onChange={(e) => setNewDependency(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  placeholder="e.g., openzeppelin-contracts"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Version
                </label>
                <input
                  type="text"
                  value={newDependency.version}
                  onChange={(e) => setNewDependency(prev => ({ ...prev, version: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  placeholder="e.g., latest, 4.8.0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Source
                </label>
                <select
                  value={newDependency.source}
                  onChange={(e) => setNewDependency(prev => ({ ...prev, source: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="github">GitHub</option>
                  <option value="npm">NPM</option>
                  <option value="git">Git</option>
                </select>
              </div>
              <div className="flex items-end">
                <button
                  onClick={handleAddDependency}
                  className="w-full px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                >
                  Add
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Dependencies List */}
        <div className="space-y-3">
          {dependencies.map((dep, index) => (
            <div key={index} className="flex items-center space-x-4 p-3 border border-gray-200 rounded-lg">
              <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Name
                  </label>
                  <input
                    type="text"
                    value={dep.name}
                    onChange={(e) => handleUpdateDependency(index, 'name', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Version
                  </label>
                  <input
                    type="text"
                    value={dep.version}
                    onChange={(e) => handleUpdateDependency(index, 'version', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Source
                  </label>
                  <select
                    value={dep.source}
                    onChange={(e) => handleUpdateDependency(index, 'source', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="github">GitHub</option>
                    <option value="npm">NPM</option>
                    <option value="git">Git</option>
                  </select>
                </div>
              </div>
              <button
                onClick={() => handleRemoveDependency(index)}
                className="px-3 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
              >
                Remove
              </button>
            </div>
          ))}

          {dependencies.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No dependencies added yet.
            </div>
          )}
        </div>
      </div>

      {/* Remappings Section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900">Remappings</h3>
          <button
            onClick={() => setNewRemapping({ key: '', value: '' })}
            className="px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
          >
            Add Remapping
          </button>
        </div>

        <div className="space-y-3">
          {Object.entries(remappings).map(([key, value]) => (
            <div key={key} className="flex items-center space-x-4 p-3 border border-gray-200 rounded-lg">
              <div className="flex-1 grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Key
                  </label>
                  <input
                    type="text"
                    value={key}
                    onChange={(e) => {
                      const newKey = e.target.value
                      handleUpdateRemapping(key, newKey, value)
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Value
                  </label>
                  <input
                    type="text"
                    value={value}
                    onChange={(e) => handleUpdateRemapping(key, key, e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
              <button
                onClick={() => handleRemoveRemapping(key)}
                className="px-3 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
              >
                Remove
              </button>
            </div>
          ))}

          {Object.keys(remappings).length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No remappings configured yet.
            </div>
          )}
        </div>
      </div>

      {/* Available Dependencies */}
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Available Dependencies</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {availableDependencies.map((dep) => (
            <div key={dep.name} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-start justify-between mb-2">
                <h4 className="font-medium text-gray-900">{dep.name}</h4>
                <span className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded">
                  {dep.category}
                </span>
              </div>
              <p className="text-sm text-gray-600 mb-3">{dep.description}</p>
              <div className="space-y-2">
                <div className="text-xs text-gray-500">
                  <strong>Source:</strong> {dep.source}
                </div>
                <div className="text-xs text-gray-500">
                  <strong>Versions:</strong> {dep.versions.slice(0, 3).join(', ')}
                  {dep.versions.length > 3 && '...'}
                </div>
                <button
                  onClick={() => {
                    const exists = dependencies.some(d => d.name === dep.name)
                    if (!exists) {
                      onChange([...dependencies, {
                        name: dep.name,
                        version: dep.versions[0] || 'latest',
                        source: dep.source
                      }])
                    }
                  }}
                  className="w-full px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
                  disabled={dependencies.some(d => d.name === dep.name)}
                >
                  {dependencies.some(d => d.name === dep.name) ? 'Added' : 'Add'}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
