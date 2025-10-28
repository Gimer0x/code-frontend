'use client'

import React, { useState, useEffect } from 'react'

interface FoundryConfig {
  solc: string
  viaIR?: boolean
  evmVersion?: string
  optimizer: boolean
  optimizerRuns: number
  extraOutput?: string[]
  extraOutputFiles?: string[]
  bytecodeHash?: string
  cborMetadata?: boolean
  gasReports?: string[]
  gasReportsIgnore?: string[]
  verbosity?: number
  ffi?: boolean
  buildInfo?: boolean
}

interface LibraryConfig {
  name: string
  version: string
  source: 'github' | 'npm' | 'git'
  url?: string
  branch?: string
  commit?: string
  installPath?: string
}

interface FoundryConfigManagerProps {
  courseId: string
  onConfigUpdate?: (config: FoundryConfig) => void
}

export default function FoundryConfigManager({ courseId, onConfigUpdate }: FoundryConfigManagerProps) {
  const [config, setConfig] = useState<FoundryConfig | null>(null)
  const [libraries, setLibraries] = useState<LibraryConfig[]>([])
  const [availableLibraries, setAvailableLibraries] = useState<LibraryConfig[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Load configuration on mount
  useEffect(() => {
    loadConfiguration()
  }, [courseId])

  const loadConfiguration = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/courses/foundry-config?courseId=${courseId}`)
      const data = await response.json()

      if (data.success) {
        setConfig(data.foundryConfig)
        setLibraries(data.libraries || [])
        setAvailableLibraries(data.availableLibraries || [])
      } else {
        setError(data.error || 'Failed to load configuration')
      }
    } catch (err) {
      setError('Failed to load configuration')
    } finally {
      setLoading(false)
    }
  }

  const updateConfig = async (newConfig: Partial<FoundryConfig>) => {
    try {
      setSaving(true)
      const response = await fetch('/api/courses/foundry-config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          courseId,
          foundryConfig: { ...config, ...newConfig }
        })
      })

      const data = await response.json()
      if (data.success) {
        setConfig(data.configuration.foundryConfig)
        onConfigUpdate?.(data.configuration.foundryConfig)
      } else {
        setError(data.error || 'Failed to update configuration')
      }
    } catch (err) {
      setError('Failed to update configuration')
    } finally {
      setSaving(false)
    }
  }

  const installLibrary = async (library: LibraryConfig) => {
    try {
      setSaving(true)
      const response = await fetch('/api/courses/libraries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          courseId,
          library
        })
      })

      const data = await response.json()
      if (data.success) {
        setLibraries(data.libraryStatus.installed)
        setAvailableLibraries(data.libraryStatus.available)
      } else {
        setError(data.error || 'Failed to install library')
      }
    } catch (err) {
      setError('Failed to install library')
    } finally {
      setSaving(false)
    }
  }

  const removeLibrary = async (libraryName: string) => {
    try {
      setSaving(true)
      const response = await fetch('/api/courses/libraries', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          courseId,
          libraryName
        })
      })

      const data = await response.json()
      if (data.success) {
        setLibraries(data.libraryStatus.installed)
        setAvailableLibraries(data.libraryStatus.available)
      } else {
        setError(data.error || 'Failed to remove library')
      }
    } catch (err) {
      setError('Failed to remove library')
    } finally {
      setSaving(false)
    }
  }

  const applyPreset = async (preset: string) => {
    try {
      setSaving(true)
      const response = await fetch('/api/courses/compiler', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          courseId,
          preset
        })
      })

      const data = await response.json()
      if (data.success) {
        setConfig(data.compilerConfig)
        onConfigUpdate?.(data.compilerConfig)
      } else {
        setError(data.error || 'Failed to apply preset')
      }
    } catch (err) {
      setError('Failed to apply preset')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2">Loading configuration...</span>
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
                onClick={loadConfiguration}
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

  if (!config) {
    return (
      <div className="text-center p-8">
        <p className="text-gray-500">No configuration found</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Compiler Configuration */}
      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Compiler Configuration</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Solidity Version
            </label>
            <select
              value={config.solc}
              onChange={(e) => updateConfig({ solc: e.target.value })}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="0.8.30">0.8.30</option>
              <option value="0.8.29">0.8.29</option>
              <option value="0.8.28">0.8.28</option>
              <option value="0.8.27">0.8.27</option>
              <option value="0.8.26">0.8.26</option>
              <option value="0.8.25">0.8.25</option>
              <option value="0.8.24">0.8.24</option>
              <option value="0.8.23">0.8.23</option>
              <option value="0.8.22">0.8.22</option>
              <option value="0.8.21">0.8.21</option>
              <option value="0.8.20">0.8.20</option>
              <option value="0.8.19">0.8.19</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              EVM Version
            </label>
            <select
              value={config.evmVersion || 'london'}
              onChange={(e) => updateConfig({ evmVersion: e.target.value })}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="shanghai">Shanghai</option>
              <option value="london">London</option>
              <option value="berlin">Berlin</option>
              <option value="istanbul">Istanbul</option>
            </select>
          </div>
        </div>
      </div>

      {/* Optimizer Configuration */}
      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Optimizer Configuration</h3>
        
        <div className="space-y-4">
          <div className="flex items-center">
            <input
              type="checkbox"
              id="optimizer"
              checked={config.optimizer}
              onChange={(e) => updateConfig({ optimizer: e.target.checked })}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="optimizer" className="ml-2 text-sm font-medium text-gray-700">
              Enable Optimizer
            </label>
          </div>

          {config.optimizer && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Optimizer Runs
              </label>
              <input
                type="number"
                value={config.optimizerRuns}
                onChange={(e) => updateConfig({ optimizerRuns: parseInt(e.target.value) })}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                min="0"
              />
            </div>
          )}

          <div className="flex items-center">
            <input
              type="checkbox"
              id="viaIR"
              checked={config.viaIR || false}
              onChange={(e) => updateConfig({ viaIR: e.target.checked })}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="viaIR" className="ml-2 text-sm font-medium text-gray-700">
              Enable Via IR (Advanced)
            </label>
          </div>
        </div>

        {/* Preset Buttons */}
        <div className="mt-4 flex space-x-2">
          <button
            onClick={() => applyPreset('development')}
            className="px-3 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded text-sm"
          >
            Development
          </button>
          <button
            onClick={() => applyPreset('production')}
            className="px-3 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded text-sm"
          >
            Production
          </button>
          <button
            onClick={() => applyPreset('gasOptimized')}
            className="px-3 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded text-sm"
          >
            Gas Optimized
          </button>
          <button
            onClick={() => applyPreset('sizeOptimized')}
            className="px-3 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded text-sm"
          >
            Size Optimized
          </button>
        </div>
      </div>

      {/* Library Management */}
      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Library Management</h3>
        
        {/* Installed Libraries */}
        <div className="mb-6">
          <h4 className="text-md font-medium text-gray-800 mb-2">Installed Libraries</h4>
          {libraries.length === 0 ? (
            <p className="text-gray-500 text-sm">No libraries installed</p>
          ) : (
            <div className="space-y-2">
              {libraries.map((library, index) => (
                <div key={index} className="flex items-center justify-between bg-gray-50 p-3 rounded">
                  <div>
                    <span className="font-medium text-gray-900">{library.name}</span>
                    <span className="text-gray-500 text-sm ml-2">v{library.version}</span>
                  </div>
                  <button
                    onClick={() => removeLibrary(library.name)}
                    className="text-red-600 hover:text-red-800 text-sm"
                    disabled={saving}
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Available Libraries */}
        <div>
          <h4 className="text-md font-medium text-gray-800 mb-2">Available Libraries</h4>
          {availableLibraries.length === 0 ? (
            <p className="text-gray-500 text-sm">All libraries are installed</p>
          ) : (
            <div className="space-y-2">
              {availableLibraries.map((library, index) => (
                <div key={index} className="flex items-center justify-between bg-gray-50 p-3 rounded">
                  <div>
                    <span className="font-medium text-gray-900">{library.name}</span>
                    <span className="text-gray-500 text-sm ml-2">v{library.version}</span>
                    {library.description && (
                      <p className="text-gray-500 text-xs mt-1">{library.description}</p>
                    )}
                  </div>
                  <button
                    onClick={() => installLibrary(library)}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm"
                    disabled={saving}
                  >
                    Install
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Advanced Settings */}
      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Advanced Settings</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-center">
            <input
              type="checkbox"
              id="cborMetadata"
              checked={config.cborMetadata || false}
              onChange={(e) => updateConfig({ cborMetadata: e.target.checked })}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="cborMetadata" className="ml-2 text-sm font-medium text-gray-700">
              CBOR Metadata
            </label>
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="ffi"
              checked={config.ffi || false}
              onChange={(e) => updateConfig({ ffi: e.target.checked })}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="ffi" className="ml-2 text-sm font-medium text-gray-700">
              Enable FFI
            </label>
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="buildInfo"
              checked={config.buildInfo || false}
              onChange={(e) => updateConfig({ buildInfo: e.target.checked })}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="buildInfo" className="ml-2 text-sm font-medium text-gray-700">
              Build Info
            </label>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Verbosity Level
            </label>
            <select
              value={config.verbosity || 1}
              onChange={(e) => updateConfig({ verbosity: parseInt(e.target.value) })}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value={0}>0 - Silent</option>
              <option value={1}>1 - Error</option>
              <option value={2}>2 - Warning</option>
              <option value={3}>3 - Info</option>
            </select>
          </div>
        </div>
      </div>

      {saving && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6">
            <div className="flex items-center">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
              <span className="ml-3">Saving configuration...</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
