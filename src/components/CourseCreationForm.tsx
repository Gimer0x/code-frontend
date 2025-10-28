'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import ImageUpload from './ImageUpload'
import TemplateSelector from './TemplateSelector'
import DependencyManager from './DependencyManager'
import FoundryConfigEditor from './FoundryConfigEditor'

interface CourseCreationFormProps {
  onSuccess?: (courseId: string) => void
  onCancel?: () => void
  initialData?: any
}

interface FormData {
  title: string
  description: string
  language: string
  goals: string
  level: 'beginner' | 'intermediate' | 'advanced'
  access: 'free' | 'paid'
  status: 'active' | 'deactivated'
  thumbnail: string | null
  foundryConfig: any
  dependencies: Array<{ name: string; version: string; source: string }>
  templates: Array<{ name: string; options: any }>
  remappings: Record<string, string>
}

export default function CourseCreationForm({ 
  onSuccess, 
  onCancel, 
  initialData 
}: CourseCreationFormProps) {
  const { data: session } = useSession()
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [currentStep, setCurrentStep] = useState(1)
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null)
  
  const [formData, setFormData] = useState<FormData>({
    title: initialData?.title || '',
    description: initialData?.description || '',
    language: initialData?.language || 'solidity',
    goals: initialData?.goals || '',
    level: initialData?.level || 'beginner',
    access: initialData?.access || 'free',
    status: initialData?.status || 'active',
    thumbnail: initialData?.thumbnail || null,
    foundryConfig: initialData?.foundryConfig || {
      solc: '0.8.30',
      optimizer: true,
      optimizer_runs: 200,
      via_ir: false,
      evm_version: 'london'
    },
    dependencies: initialData?.dependencies || [
      { name: 'forge-std', version: 'latest', source: 'github' },
      { name: 'openzeppelin-contracts', version: 'latest', source: 'github' }
    ],
    templates: initialData?.templates || [],
    remappings: initialData?.remappings || {
      'forge-std/': 'lib/forge-std/src/',
      '@openzeppelin/': 'lib/openzeppelin-contracts/'
    }
  })

  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})

  const steps = [
    { id: 1, title: 'Basic Information', description: 'Course details and metadata' },
    { id: 2, title: 'Template Selection', description: 'Choose a starting template' },
    { id: 3, title: 'Configuration', description: 'Foundry and compiler settings' },
    { id: 4, title: 'Dependencies', description: 'Manage external libraries' },
    { id: 5, title: 'Review & Create', description: 'Final review and creation' }
  ]

  const validateStep = (step: number): boolean => {
    const errors: Record<string, string> = {}

    if (step === 1) {
      if (!formData.title.trim()) errors.title = 'Course title is required'
      if (!formData.goals.trim()) errors.goals = 'Course goals are required'
      if (formData.title.length > 200) errors.title = 'Title must be less than 200 characters'
    }

    if (step === 2 && formData.language === 'solidity' && !selectedTemplate) {
      errors.template = 'Please select a template for Solidity courses'
    }

    setValidationErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, steps.length))
    }
  }

  const handlePrevious = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1))
  }

  const handleTemplateSelect = (template: any) => {
    setSelectedTemplate(template)
    if (template) {
      setFormData(prev => {
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

  const handleDependencyChange = (dependencies: Array<{ name: string; version: string; source: string }>) => {
    setFormData(prev => ({ ...prev, dependencies }))
  }

  const handleConfigChange = (config: any) => {
    setFormData(prev => ({ ...prev, foundryConfig: config }))
  }

  const handleSubmit = async () => {
    if (!validateStep(currentStep)) return

    setIsSubmitting(true)
    setError(null)

    try {
      const apiEndpoint = formData.language === 'solidity' 
        ? '/api/courses/with-foundry' 
        : '/api/courses'

      const response = await fetch(apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...formData,
          modules: [] // Start with no modules
        })
      })

      const data = await response.json()
      console.log('Course creation response:', data)

      if (data.success) {
        if (onSuccess) {
          onSuccess(data.course.id)
        } else {
          router.push(`/admin/courses/${data.course.id}/edit`)
        }
      } else {
        console.error('Course creation failed:', data)
        setError(data.error || data.message || 'Failed to create course')
      }
    } catch (err) {
      console.error('Course creation error:', err)
      setError(`Failed to create course: ${err instanceof Error ? err.message : 'Unknown error'}`)
    } finally {
      setIsSubmitting(false)
    }
  }

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-200 mb-2">
                Course Title *
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                className={`w-full px-3 py-2 border rounded-md focus:ring-yellow-500 focus:border-yellow-500 bg-gray-700 text-white placeholder-gray-400 ${
                  validationErrors.title ? 'border-red-500' : 'border-gray-600'
                }`}
                placeholder="Enter course title"
              />
              {validationErrors.title && (
                <p className="text-red-500 text-sm mt-1">{validationErrors.title}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-200 mb-2">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-600 rounded-md focus:ring-yellow-500 focus:border-yellow-500 bg-gray-700 text-white placeholder-gray-400"
                rows={3}
                placeholder="Enter course description"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-200 mb-2">
                  Language *
                </label>
                <select
                  value={formData.language}
                  onChange={(e) => setFormData(prev => ({ ...prev, language: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-600 rounded-md focus:ring-yellow-500 focus:border-yellow-500 bg-gray-700 text-white"
                >
                  <option value="solidity">Solidity</option>
                  <option value="javascript">JavaScript</option>
                  <option value="typescript">TypeScript</option>
                  <option value="python">Python</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-200 mb-2">
                  Level *
                </label>
                <select
                  value={formData.level}
                  onChange={(e) => setFormData(prev => ({ ...prev, level: e.target.value as any }))}
                  className="w-full px-3 py-2 border border-gray-600 rounded-md focus:ring-yellow-500 focus:border-yellow-500 bg-gray-700 text-white"
                >
                  <option value="beginner">Beginner</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="advanced">Advanced</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-200 mb-2">
                Course Goals *
              </label>
              <textarea
                value={formData.goals}
                onChange={(e) => setFormData(prev => ({ ...prev, goals: e.target.value }))}
                className={`w-full px-3 py-2 border rounded-md focus:ring-yellow-500 focus:border-yellow-500 bg-gray-700 text-white placeholder-gray-400 ${
                  validationErrors.goals ? 'border-red-500' : 'border-gray-600'
                }`}
                rows={3}
                placeholder="What will students learn in this course?"
              />
              {validationErrors.goals && (
                <p className="text-red-500 text-sm mt-1">{validationErrors.goals}</p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-200 mb-2">
                  Access Level
                </label>
                <select
                  value={formData.access}
                  onChange={(e) => setFormData(prev => ({ ...prev, access: e.target.value as any }))}
                  className="w-full px-3 py-2 border border-gray-600 rounded-md focus:ring-yellow-500 focus:border-yellow-500 bg-gray-700 text-white"
                >
                  <option value="free">Free</option>
                  <option value="paid">Paid</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-200 mb-2">
                  Status
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value as any }))}
                  className="w-full px-3 py-2 border border-gray-600 rounded-md focus:ring-yellow-500 focus:border-yellow-500 bg-gray-700 text-white"
                >
                  <option value="active">Active</option>
                  <option value="deactivated">Deactivated</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-200 mb-2">
                Course Thumbnail
              </label>
              <ImageUpload
                onImageSelect={async (file) => {
                  if (file) {
                    try {
                      // Upload the file to the server
                      const formData = new FormData()
                      formData.append('file', file)
                      
                      const response = await fetch('/api/upload/thumbnail', {
                        method: 'POST',
                        body: formData
                      })
                      
                      if (response.ok) {
                        const result = await response.json()
                        setFormData(prev => ({ ...prev, thumbnail: result.url }))
                      } else {
                        const error = await response.json()
                        console.error('Upload failed:', error)
                        // Fallback to blob URL for preview
                        const url = URL.createObjectURL(file)
                        setFormData(prev => ({ ...prev, thumbnail: url }))
                      }
                    } catch (error) {
                      console.error('Upload error:', error)
                      // Fallback to blob URL for preview
                      const url = URL.createObjectURL(file)
                      setFormData(prev => ({ ...prev, thumbnail: url }))
                    }
                  } else {
                    setFormData(prev => ({ ...prev, thumbnail: null }))
                  }
                }}
                currentImage={formData.thumbnail}
              />
            </div>
          </div>
        )

      case 2:
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Select Template
              </h3>
              <p className="text-gray-600 mb-6">
                Choose a template to get started with pre-configured files and settings.
                {formData.language !== 'solidity' && ' Templates are only available for Solidity courses.'}
              </p>
              
              {formData.language === 'solidity' ? (
                <TemplateSelector
                  onTemplateSelect={handleTemplateSelect}
                  selectedTemplate={selectedTemplate}
                  courseId="template-selector"
                />
              ) : (
                <div className="text-center py-8 bg-gray-50 rounded-lg">
                  <p className="text-gray-500">
                    Templates are only available for Solidity courses.
                  </p>
                </div>
              )}
              
              {validationErrors.template && (
                <p className="text-red-500 text-sm mt-2">{validationErrors.template}</p>
              )}
            </div>
          </div>
        )

      case 3:
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Foundry Configuration
              </h3>
              <p className="text-gray-600 mb-6">
                Configure compiler settings, optimizer, and other Foundry-specific options.
              </p>
              
              <FoundryConfigEditor
                config={formData.foundryConfig}
                onChange={handleConfigChange}
              />
            </div>
          </div>
        )

      case 4:
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Dependencies
              </h3>
              <p className="text-gray-600 mb-6">
                Manage external libraries and dependencies for your course.
              </p>
              
              <DependencyManager
                dependencies={formData.dependencies}
                onChange={handleDependencyChange}
                remappings={formData.remappings}
                onRemappingsChange={(remappings) => setFormData(prev => ({ ...prev, remappings }))}
              />
            </div>
          </div>
        )

      case 5:
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Review Course Details
              </h3>
              <p className="text-gray-600 mb-6">
                Review all the information before creating your course.
              </p>
            </div>

            <div className="bg-gray-50 rounded-lg p-6 space-y-4">
              <div>
                <h4 className="font-medium text-gray-900">Basic Information</h4>
                <div className="mt-2 space-y-2 text-sm text-gray-600">
                  <p><strong>Title:</strong> {formData.title}</p>
                  <p><strong>Language:</strong> {formData.language}</p>
                  <p><strong>Level:</strong> {formData.level}</p>
                  <p><strong>Access:</strong> {formData.access}</p>
                  <p><strong>Status:</strong> {formData.status}</p>
                </div>
              </div>

              {selectedTemplate && (
                <div>
                  <h4 className="font-medium text-gray-900">Template</h4>
                  <div className="mt-2 text-sm text-gray-600">
                    <p><strong>Selected:</strong> {selectedTemplate.name}</p>
                    <p><strong>Description:</strong> {selectedTemplate.description}</p>
                  </div>
                </div>
              )}

              <div>
                <h4 className="font-medium text-gray-900">Dependencies</h4>
                <div className="mt-2">
                  {formData.dependencies.length > 0 ? (
                    <ul className="text-sm text-gray-600 space-y-1">
                      {formData.dependencies.map((dep, index) => (
                        <li key={index}>
                          {dep.name} ({dep.version}) - {dep.source}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-gray-500">No dependencies</p>
                  )}
                </div>
              </div>

              <div>
                <h4 className="font-medium text-gray-900">Foundry Configuration</h4>
                <div className="mt-2 text-sm text-gray-600">
                  <p><strong>Compiler:</strong> {formData.foundryConfig.solc}</p>
                  <p><strong>Optimizer:</strong> {formData.foundryConfig.optimizer ? 'Enabled' : 'Disabled'}</p>
                  <p><strong>Optimizer Runs:</strong> {formData.foundryConfig.optimizer_runs}</p>
                </div>
              </div>
            </div>
          </div>
        )

      default:
        return null
    }
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Progress Steps */}
      <div className="mb-8">
        <nav aria-label="Progress">
          <ol className="flex items-center justify-between">
            {steps.map((step, index) => (
              <li key={step.id} className="flex items-center">
                <div className="flex items-center">
                  <div className={`flex items-center justify-center w-8 h-8 rounded-full ${
                    currentStep >= step.id
                      ? 'bg-yellow-500 text-black'
                      : 'bg-gray-600 text-gray-300'
                  }`}>
                    {step.id}
                  </div>
                  <div className="ml-3">
                    <p className={`text-sm font-medium ${
                      currentStep >= step.id ? 'text-yellow-500' : 'text-gray-300'
                    }`}>
                      {step.title}
                    </p>
                    <p className="text-xs text-gray-400">{step.description}</p>
                  </div>
                </div>
                {index < steps.length - 1 && (
                  <div className="ml-8 w-8 h-0.5 bg-gray-600" />
                )}
              </li>
            ))}
          </ol>
        </nav>
      </div>

      {/* Form Content */}
      <div className="bg-gray-800 rounded-lg shadow-lg p-6 border border-gray-700">
        {error && (
          <div className="mb-6 p-4 bg-red-900 border border-red-700 rounded-md">
            <p className="text-red-200">{error}</p>
          </div>
        )}

        {renderStepContent()}

        {/* Navigation */}
        <div className="flex justify-between mt-8 pt-6 border-t border-gray-600">
          <button
            type="button"
            onClick={currentStep === 1 ? onCancel : handlePrevious}
            className="px-4 py-2 text-gray-300 bg-gray-700 rounded-md hover:bg-gray-600 transition-colors"
          >
            {currentStep === 1 ? 'Cancel' : 'Previous'}
          </button>

          <div className="flex space-x-3">
            {currentStep < steps.length ? (
              <button
                type="button"
                onClick={handleNext}
                className="px-4 py-2 bg-yellow-500 text-black rounded-md hover:bg-yellow-600 transition-colors font-medium"
              >
                Next
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors disabled:opacity-50 font-medium"
              >
                {isSubmitting ? 'Creating...' : 'Create Course'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
