'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import DependencyManager from './DependencyManager'
import FoundryConfigEditor from './FoundryConfigEditor'
import TemplateSelector from './TemplateSelector'

interface CourseConfigurationFormProps {
  courseId: string
  initialData?: any
  onSuccess?: () => void
  onCancel?: () => void
}

interface ConfigurationData {
  foundryConfig: any
  dependencies: Array<{ name: string; version: string; source: string }>
  templates: Array<{ name: string; options: any }>
  remappings: Record<string, string>
}

export default function CourseConfigurationForm({ 
  courseId, 
  initialData, 
  onSuccess, 
  onCancel 
}: CourseConfigurationFormProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'config' | 'dependencies' | 'templates'>('config')
  
  const [configData, setConfigData] = useState<ConfigurationData>({
    foundryConfig: {
      solc: '0.8.30',
      optimizer: true,
      optimizer_runs: 200,
      via_ir: false,
      evm_version: 'london'
    },
    dependencies: [],
    templates: [],
    remappings: {}
  })

  useEffect(() => {
    if (initialData) {
      setConfigData({
        foundryConfig: initialData.foundryConfig || configData.foundryConfig,
        dependencies: initialData.dependencies || [],
        templates: initialData.templates || [],
        remappings: initialData.remappings || {}
      })
    }
    setIsLoading(false)
  }, [initialData])

  const handleConfigChange = (newConfig: any) => {
    setConfigData(prev => ({ ...prev, foundryConfig: newConfig }))
  }

  const handleDependenciesChange = (dependencies: Array<{ name: string; version: string; source: string }>) => {
    setConfigData(prev => ({ ...prev, dependencies }))
  }

  const handleRemappingsChange = (remappings: Record<string, string>) => {
    setConfigData(prev => ({ ...prev, remappings }))
  }

  const handleTemplateSelect = (template: any) => {
    if (template) {
      setConfigData(prev => {
        // Merge dependencies and remove duplicates based on name
        const existingDeps = prev.dependencies || []
        const templateDeps = template.dependencies || []
        const mergedDeps = [...existingDeps]
        
        templateDeps.forEach(templateDep => {
          const exists = mergedDeps.some(dep => dep.name === templateDep.name)
          if (!exists) {
            mergedDeps.push(templateDep)
          }
        })
        
        return {
          ...prev,
          templates: [{ name: template.id, options: {} }],
          foundryConfig: { ...prev.foundryConfig, ...template.foundryConfig },
          dependencies: mergedDeps
        }
      })
    }
  }

  const handleSave = async () => {
    setIsSaving(true)
    setError(null)

    try {
      const response = await fetch(`/api/courses/${courseId}/config`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(configData)
      })

      const data = await response.json()

      if (data.success) {
        if (onSuccess) {
          onSuccess()
        } else {
          router.push(`/admin/courses/${courseId}/edit`)
        }
      } else {
        setError(data.error || 'Failed to save configuration')
      }
    } catch (err) {
      setError('Failed to save configuration')
    } finally {
      setIsSaving(false)
    }
  }

  const tabs = [
    { id: 'config', label: 'Foundry Config', description: 'Compiler and build settings' },
    { id: 'dependencies', label: 'Dependencies', description: 'External libraries and packages' },
    { id: 'templates', label: 'Templates', description: 'Course templates and presets' }
  ]

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2">Loading configuration...</span>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Course Configuration</h2>
        <p className="text-gray-600 mt-1">
          Configure Foundry settings, dependencies, and templates for this course.
        </p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
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

      {/* Content */}
      <div className="bg-white rounded-lg shadow p-6">
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {activeTab === 'config' && (
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Foundry Configuration
            </h3>
            <FoundryConfigEditor
              config={configData.foundryConfig}
              onChange={handleConfigChange}
            />
          </div>
        )}

        {activeTab === 'dependencies' && (
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Dependencies & Remappings
            </h3>
            <DependencyManager
              dependencies={configData.dependencies}
              onChange={handleDependenciesChange}
              remappings={configData.remappings}
              onRemappingsChange={handleRemappingsChange}
            />
          </div>
        )}

        {activeTab === 'templates' && (
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Course Templates
            </h3>
            <TemplateSelector
              onTemplateSelect={handleTemplateSelect}
              selectedTemplate={configData.templates[0] ? { id: configData.templates[0].name } : null}
              courseId={courseId}
            />
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end space-x-3 mt-8 pt-6 border-t border-gray-200">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {isSaving ? 'Saving...' : 'Save Configuration'}
          </button>
        </div>
      </div>
    </div>
  )
}
