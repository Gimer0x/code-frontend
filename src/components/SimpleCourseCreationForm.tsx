'use client'

import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { authService } from '@/lib/auth-service'
import CourseThumbnailUpload from './CourseThumbnailUpload'

interface CourseCreationFormProps {
  onSuccess?: (courseId: string) => void
  onCancel?: () => void
}

interface FormData {
  courseId: string
  title: string
  language: string
  goals: string
  level: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED'
  access: 'FREE' | 'PAID'
  thumbnail: string | null
  foundryConfig: {
    solc: string
    optimizer: boolean
    optimizer_runs: number
    via_ir: boolean
    evm_version: string
  }
  dependencies: Array<{ name: string; version: string }>
}

export default function SimpleCourseCreationForm({ 
  onSuccess, 
  onCancel 
}: CourseCreationFormProps) {
  const { user } = useAuth()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const [formData, setFormData] = useState<FormData>({
    courseId: '',
    title: '',
    language: 'Solidity',
    goals: '',
    level: 'BEGINNER',
    access: 'FREE',
    thumbnail: null,
    foundryConfig: {
      solc: '0.8.30',
      optimizer: true,
      optimizer_runs: 200,
      via_ir: false,
      evm_version: 'london'
    },
    dependencies: [
      { name: 'forge-std', version: 'latest' },
      { name: 'openzeppelin-contracts', version: 'latest' }
    ]
  })

  // Generate courseId from title
  const generateCourseId = (title: string) => {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim()
  }

  const handleInputChange = (field: keyof FormData, value: any) => {
    setFormData(prev => {
      const updated = { ...prev, [field]: value }
      
      // Auto-generate courseId when title changes
      if (field === 'title' && value) {
        updated.courseId = generateCourseId(value)
      }
      
      return updated
    })
  }

  const handleFoundryConfigChange = (field: keyof FormData['foundryConfig'], value: any) => {
    setFormData(prev => ({
      ...prev,
      foundryConfig: {
        ...prev.foundryConfig,
        [field]: value
      }
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!user || user.role !== 'ADMIN') {
      setError('Only administrators can create courses')
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      const authHeader = authService.getAuthHeader()
      
      const response = await fetch('/api/courses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(authHeader && { 'Authorization': authHeader })
        },
        body: JSON.stringify({
          ...formData,
          // Send imagePath to backend if using proxy URL
          thumbnail: formData.thumbnail && formData.thumbnail.startsWith('/api/images/')
            ? formData.thumbnail.replace('/api/images/', '')
            : formData.thumbnail,
          creatorId: user.id
        })
      })

      const data = await response.json()

      if (data.success) {
        onSuccess?.(data.course.id)
      } else {
        setError(data.error || 'Failed to create course')
      }
    } catch (err) {
      setError('An error occurred while creating the course')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto">
      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Basic Course Information */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
            Course Information
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Course Title *
              </label>
              <input
                type="text"
                id="title"
                value={formData.title}
                onChange={(e) => handleInputChange('title', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-yellow-500 focus:border-yellow-500 dark:bg-gray-700 dark:text-white"
                placeholder="e.g., Solidity Security"
                required
              />
            </div>

            <div>
              <label htmlFor="courseId" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Course ID *
              </label>
              <input
                type="text"
                id="courseId"
                value={formData.courseId}
                onChange={(e) => handleInputChange('courseId', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-yellow-500 focus:border-yellow-500 dark:bg-gray-700 dark:text-white"
                placeholder="e.g., solidity-security"
                required
              />
              <p className="text-xs text-gray-500 mt-1">Auto-generated from title, but you can edit it</p>
            </div>

            <div>
              <label htmlFor="language" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Language
              </label>
              <select
                id="language"
                value={formData.language}
                onChange={(e) => handleInputChange('language', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-yellow-500 focus:border-yellow-500 dark:bg-gray-700 dark:text-white"
              >
                <option value="Solidity">Solidity</option>
                <option value="Vyper">Vyper</option>
              </select>
            </div>

            <div>
              <label htmlFor="level" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Level
              </label>
              <select
                id="level"
                value={formData.level}
                onChange={(e) => handleInputChange('level', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-yellow-500 focus:border-yellow-500 dark:bg-gray-700 dark:text-white"
              >
                <option value="BEGINNER">Beginner</option>
                <option value="INTERMEDIATE">Intermediate</option>
                <option value="ADVANCED">Advanced</option>
              </select>
            </div>

            <div>
              <label htmlFor="access" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Access
              </label>
              <select
                id="access"
                value={formData.access}
                onChange={(e) => handleInputChange('access', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-yellow-500 focus:border-yellow-500 dark:bg-gray-700 dark:text-white"
              >
                <option value="FREE">Free</option>
                <option value="PAID">Paid</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <label htmlFor="goals" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Learning Goals
              </label>
              <textarea
                id="goals"
                value={formData.goals}
                onChange={(e) => handleInputChange('goals', e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-yellow-500 focus:border-yellow-500 dark:bg-gray-700 dark:text-white"
                placeholder="Describe what students will learn in this course..."
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Course Thumbnail
              </label>
              <CourseThumbnailUpload
                onImageUpload={(url) => handleInputChange('thumbnail', url)}
                currentImage={formData.thumbnail}
              />
            </div>
          </div>
        </div>

        {/* Foundry Configuration */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
            Foundry Configuration
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="solc" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Solidity Version
              </label>
              <input
                type="text"
                id="solc"
                value={formData.foundryConfig.solc}
                onChange={(e) => handleFoundryConfigChange('solc', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-yellow-500 focus:border-yellow-500 dark:bg-gray-700 dark:text-white"
                placeholder="0.8.30"
              />
            </div>

            <div>
              <label htmlFor="evm_version" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                EVM Version
              </label>
              <select
                id="evm_version"
                value={formData.foundryConfig.evm_version}
                onChange={(e) => handleFoundryConfigChange('evm_version', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-yellow-500 focus:border-yellow-500 dark:bg-gray-700 dark:text-white"
              >
                <option value="london">London</option>
                <option value="berlin">Berlin</option>
                <option value="istanbul">Istanbul</option>
                <option value="petersburg">Petersburg</option>
              </select>
            </div>

            <div>
              <label htmlFor="optimizer_runs" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Optimizer Runs
              </label>
              <input
                type="number"
                id="optimizer_runs"
                value={formData.foundryConfig.optimizer_runs}
                onChange={(e) => handleFoundryConfigChange('optimizer_runs', parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-yellow-500 focus:border-yellow-500 dark:bg-gray-700 dark:text-white"
                min="0"
              />
            </div>

            <div className="flex items-center space-x-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.foundryConfig.optimizer}
                  onChange={(e) => handleFoundryConfigChange('optimizer', e.target.checked)}
                  className="h-4 w-4 text-yellow-600 focus:ring-yellow-500 border-gray-300 rounded"
                />
                <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">Enable Optimizer</span>
              </label>

              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.foundryConfig.via_ir}
                  onChange={(e) => handleFoundryConfigChange('via_ir', e.target.checked)}
                  className="h-4 w-4 text-yellow-600 focus:ring-yellow-500 border-gray-300 rounded"
                />
                <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">Via IR</span>
              </label>
            </div>
          </div>
        </div>

        {/* Dependencies */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
            Dependencies
          </h2>
          
          <div className="space-y-4">
            <div className="text-sm text-gray-600 dark:text-gray-400">
              <p className="font-medium mb-2">Included by default:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>forge-std (latest) - Foundry standard library</li>
                <li>openzeppelin-contracts (latest) - OpenZeppelin contracts library</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md">
            {error}
          </div>
        )}

        {/* Form Actions */}
        <div className="flex justify-end space-x-4">
          <button
            type="button"
            onClick={onCancel}
            className="px-6 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting || !formData.title || !formData.courseId}
            className="px-6 py-2 bg-yellow-500 text-black rounded-md hover:bg-yellow-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isSubmitting ? 'Creating Course...' : 'Create Course'}
          </button>
        </div>
      </form>
    </div>
  )
}
