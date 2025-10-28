'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import TemplateManager from '@/components/TemplateManager'
import TemplatePreview from '@/components/TemplatePreview'
import TemplateCreator from '@/components/TemplateCreator'

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

export default function CourseTemplates() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null)
  const [showPreview, setShowPreview] = useState(false)
  const [showCreator, setShowCreator] = useState(false)
  const [activeTab, setActiveTab] = useState<'browse' | 'create'>('browse')

  useEffect(() => {
    if (status === 'loading') return
    if (!session || session.user.role !== 'ADMIN') {
      router.push('/admin/login')
      return
    }
  }, [router, session, status])

  const handleTemplateSelect = (template: Template) => {
    setSelectedTemplate(template)
    setShowPreview(true)
  }

  const handleTemplateApply = (template: Template) => {
    // Navigate to course creation with template
    router.push(`/admin/courses/create?template=${template.id}`)
  }

  const handleTemplateCreated = (template: Template) => {
    setShowCreator(false)
    setActiveTab('browse')
    // Optionally show success message
    alert(`Template "${template.name}" created successfully!`)
  }

  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2">Loading...</span>
      </div>
    )
  }

  if (!session || session.user.role !== 'ADMIN') {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-gray-900">Course Templates</h1>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setActiveTab('browse')}
                className={`px-4 py-2 rounded-md text-sm font-medium ${
                  activeTab === 'browse'
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Browse Templates
              </button>
              <button
                onClick={() => setActiveTab('create')}
                className={`px-4 py-2 rounded-md text-sm font-medium ${
                  activeTab === 'create'
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Create Template
              </button>
              <Link
                href="/admin/courses"
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Back to Courses
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'browse' && (
          <div>
            <div className="mb-6">
              <h2 className="text-lg font-medium text-gray-900 mb-2">
                Available Templates
              </h2>
              <p className="text-gray-600">
                Choose from pre-built templates or create your own. Templates include starter code, 
                tests, and configuration for different Solidity skill levels.
              </p>
            </div>
            
            <TemplateManager
              courseId="template-browser"
              onTemplateApplied={handleTemplateApply}
            />
          </div>
        )}

        {activeTab === 'create' && (
          <div>
            <div className="mb-6">
              <h2 className="text-lg font-medium text-gray-900 mb-2">
                Create Custom Template
              </h2>
              <p className="text-gray-600">
                Create a custom template with your own files, dependencies, and configuration.
              </p>
            </div>
            
            <TemplateCreator
              onTemplateCreated={handleTemplateCreated}
              onCancel={() => setActiveTab('browse')}
            />
          </div>
        )}
      </div>

      {/* Template Preview Modal */}
      {showPreview && selectedTemplate && (
        <TemplatePreview
          template={selectedTemplate}
          onClose={() => setShowPreview(false)}
          onApply={(templateId) => {
            setShowPreview(false)
            handleTemplateApply(selectedTemplate)
          }}
        />
      )}
    </div>
  )
}
