'use client'

import { useState } from 'react'

interface FoundryConfig {
  solc: string
  optimizer: boolean
  optimizer_runs: number
  via_ir?: boolean
  evm_version?: string
  gas_reports?: string[]
  src?: string
  test?: string
  script?: string
  libs?: string[]
  cache_path?: string
  broadcast?: string
  ffi?: boolean
  fuzz_runs?: number
  invariant_runs?: number
  invariant_depth?: number
  invariant_fail_on_revert?: boolean
  verbosity?: number
  build_info?: boolean
  extra_output?: string[]
  extra_output_files?: string[]
  allow_paths?: string[]
  deny_paths?: string[]
  sparse_chisel_tests?: boolean
  bytecode_hash?: string
  force_evm_version?: boolean
  ignored_error_codes?: string[]
  revert_strings?: string
  metadata_hash?: string
  metadata?: Record<string, string>
}

interface FoundryConfigEditorProps {
  config: FoundryConfig
  onChange: (config: FoundryConfig) => void
}

export default function FoundryConfigEditor({ config, onChange }: FoundryConfigEditorProps) {
  const [activeTab, setActiveTab] = useState<'basic' | 'advanced' | 'output' | 'gas' | 'fuzz'>('basic')

  const handleConfigChange = (key: keyof FoundryConfig, value: any) => {
    onChange({ ...config, [key]: value })
  }

  const handleArrayChange = (key: keyof FoundryConfig, value: string[]) => {
    onChange({ ...config, [key]: value })
  }

  const addArrayItem = (key: keyof FoundryConfig, item: string) => {
    const current = (config[key] as string[]) || []
    if (item.trim() && !current.includes(item.trim())) {
      handleArrayChange(key, [...current, item.trim()])
    }
  }

  const removeArrayItem = (key: keyof FoundryConfig, item: string) => {
    const current = (config[key] as string[]) || []
    handleArrayChange(key, current.filter(i => i !== item))
  }

  const tabs = [
    { id: 'basic', label: 'Basic', description: 'Compiler and optimizer settings' },
    { id: 'advanced', label: 'Advanced', description: 'Advanced compiler options' },
    { id: 'output', label: 'Output', description: 'Output and metadata settings' },
    { id: 'gas', label: 'Gas', description: 'Gas reporting and optimization' },
    { id: 'fuzz', label: 'Fuzz', description: 'Fuzzing and testing settings' }
  ]

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="space-y-6">
        {activeTab === 'basic' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Solidity Compiler Version
                </label>
                <input
                  type="text"
                  value={config.solc}
                  onChange={(e) => handleConfigChange('solc', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  placeholder="e.g., 0.8.30"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  EVM Version
                </label>
                <select
                  value={config.evm_version || 'london'}
                  onChange={(e) => handleConfigChange('evm_version', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="london">London</option>
                  <option value="berlin">Berlin</option>
                  <option value="istanbul">Istanbul</option>
                  <option value="petersburg">Petersburg</option>
                  <option value="constantinople">Constantinople</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={config.optimizer}
                    onChange={(e) => handleConfigChange('optimizer', e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">Enable Optimizer</span>
                </label>
              </div>

              <div>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={config.via_ir || false}
                    onChange={(e) => handleConfigChange('via_ir', e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">Via IR</span>
                </label>
              </div>
            </div>

            {config.optimizer && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Optimizer Runs
                </label>
                <input
                  type="number"
                  value={config.optimizer_runs}
                  onChange={(e) => handleConfigChange('optimizer_runs', parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  min="0"
                />
              </div>
            )}
          </div>
        )}

        {activeTab === 'advanced' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Source Directory
                </label>
                <input
                  type="text"
                  value={config.src || 'src'}
                  onChange={(e) => handleConfigChange('src', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Test Directory
                </label>
                <input
                  type="text"
                  value={config.test || 'test'}
                  onChange={(e) => handleConfigChange('test', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Script Directory
                </label>
                <input
                  type="text"
                  value={config.script || 'script'}
                  onChange={(e) => handleConfigChange('script', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Cache Path
                </label>
                <input
                  type="text"
                  value={config.cache_path || 'cache'}
                  onChange={(e) => handleConfigChange('cache_path', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Verbosity
                </label>
                <select
                  value={config.verbosity || 1}
                  onChange={(e) => handleConfigChange('verbosity', parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value={0}>0 - Silent</option>
                  <option value={1}>1 - Default</option>
                  <option value={2}>2 - Verbose</option>
                  <option value={3}>3 - Very Verbose</option>
                  <option value={4}>4 - Debug</option>
                  <option value={5}>5 - Trace</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Fuzz Runs
                </label>
                <input
                  type="number"
                  value={config.fuzz_runs || 256}
                  onChange={(e) => handleConfigChange('fuzz_runs', parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  min="1"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={config.ffi || false}
                    onChange={(e) => handleConfigChange('ffi', e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">Enable FFI</span>
                </label>
              </div>

              <div>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={config.build_info || true}
                    onChange={(e) => handleConfigChange('build_info', e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">Build Info</span>
                </label>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'output' && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Extra Output
              </label>
              <div className="space-y-2">
                {(config.extra_output || []).map((item, index) => (
                  <div key={index} className="flex items-center space-x-2">
                    <input
                      type="text"
                      value={item}
                      onChange={(e) => {
                        const newItems = [...(config.extra_output || [])]
                        newItems[index] = e.target.value
                        handleArrayChange('extra_output', newItems)
                      }}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    />
                    <button
                      onClick={() => removeArrayItem('extra_output', item)}
                      className="px-3 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                    >
                      Remove
                    </button>
                  </div>
                ))}
                <div className="flex space-x-2">
                  <input
                    type="text"
                    placeholder="Add output type (e.g., metadata, abi)"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        addArrayItem('extra_output', e.currentTarget.value)
                        e.currentTarget.value = ''
                      }
                    }}
                  />
                  <button
                    onClick={(e) => {
                      const input = e.currentTarget.previousElementSibling as HTMLInputElement
                      addArrayItem('extra_output', input.value)
                      input.value = ''
                    }}
                    className="px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    Add
                  </button>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Bytecode Hash
              </label>
              <select
                value={config.bytecode_hash || 'none'}
                onChange={(e) => handleConfigChange('bytecode_hash', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="none">None</option>
                <option value="ipfs">IPFS</option>
                <option value="bzzr1">Bzzr1</option>
                <option value="bzzr0">Bzzr0</option>
              </select>
            </div>
          </div>
        )}

        {activeTab === 'gas' && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Gas Reports
              </label>
              <div className="space-y-2">
                {(config.gas_reports || []).map((item, index) => (
                  <div key={index} className="flex items-center space-x-2">
                    <input
                      type="text"
                      value={item}
                      onChange={(e) => {
                        const newItems = [...(config.gas_reports || [])]
                        newItems[index] = e.target.value
                        handleArrayChange('gas_reports', newItems)
                      }}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    />
                    <button
                      onClick={() => removeArrayItem('gas_reports', item)}
                      className="px-3 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                    >
                      Remove
                    </button>
                  </div>
                ))}
                <div className="flex space-x-2">
                  <input
                    type="text"
                    placeholder="Add gas report target (e.g., *, src/Contract.sol)"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        addArrayItem('gas_reports', e.currentTarget.value)
                        e.currentTarget.value = ''
                      }
                    }}
                  />
                  <button
                    onClick={(e) => {
                      const input = e.currentTarget.previousElementSibling as HTMLInputElement
                      addArrayItem('gas_reports', input.value)
                      input.value = ''
                    }}
                    className="px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    Add
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'fuzz' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Fuzz Runs
                </label>
                <input
                  type="number"
                  value={config.fuzz_runs || 256}
                  onChange={(e) => handleConfigChange('fuzz_runs', parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  min="1"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Invariant Runs
                </label>
                <input
                  type="number"
                  value={config.invariant_runs || 256}
                  onChange={(e) => handleConfigChange('invariant_runs', parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  min="1"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Invariant Depth
                </label>
                <input
                  type="number"
                  value={config.invariant_depth || 15}
                  onChange={(e) => handleConfigChange('invariant_depth', parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  min="1"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Invariant Fail on Revert
                </label>
                <select
                  value={config.invariant_fail_on_revert ? 'true' : 'false'}
                  onChange={(e) => handleConfigChange('invariant_fail_on_revert', e.target.value === 'true')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="true">True</option>
                  <option value="false">False</option>
                </select>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
