'use client'

import { useState, useRef } from 'react'
import { validateImage } from '@/lib/imageUtils'

interface CourseThumbnailUploadProps {
  onImageUpload: (url: string) => void
  currentImage?: string | null
  error?: string
  disabled?: boolean
}

export default function CourseThumbnailUpload({ 
  onImageUpload, 
  currentImage, 
  error, 
  disabled = false 
}: CourseThumbnailUploadProps) {
  const [dragActive, setDragActive] = useState(false)
  const [validationError, setValidationError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (disabled || uploading) return

    const files = e.dataTransfer.files
    if (files && files[0]) {
      handleFile(files[0])
    }
  }

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (disabled || uploading) return

    const files = e.target.files
    if (files && files[0]) {
      handleFile(files[0])
    }
  }

  const uploadImage = async (file: File): Promise<string> => {
    console.log('Starting image upload for file:', file.name, file.size, file.type) // Debug log
    
    const formData = new FormData()
    formData.append('thumbnail', file)
    
    console.log('FormData created, sending to API...') // Debug log

    const response = await fetch('/api/upload/course-thumbnail', {
      method: 'POST',
      body: formData,
    })

    console.log('Upload response status:', response.status) // Debug log

    if (!response.ok) {
      const errorData = await response.json()
      console.error('Upload failed:', errorData) // Debug log
      throw new Error(errorData.error || 'Upload failed')
    }

    const data = await response.json()
    console.log('Upload successful, full response:', data) // Debug log
    
    // Handle different possible response structures
    let imageUrl = data.url || data.imagePath || data.thumbnail || data.imageUrl || data.path
    console.log('Extracted URL:', imageUrl) // Debug log
    
    if (!imageUrl) {
      throw new Error('No image URL returned from server')
    }
    
    // If it's a relative path, convert to frontend proxy URL
    if (imageUrl.startsWith('uploads/')) {
      imageUrl = `/api/images/${imageUrl}`
      console.log('Converted to proxy URL:', imageUrl) // Debug log
    }
    
    return imageUrl
  }

  const handleFile = async (file: File) => {
    console.log('handleFile called with:', file.name, file.size, file.type) // Debug log
    setValidationError(null)
    setUploading(true)
    
    const validation = validateImage(file)
    console.log('Image validation result:', validation) // Debug log
    
    if (!validation.isValid) {
      console.error('Image validation failed:', validation.error) // Debug log
      setValidationError(validation.error || 'Invalid image file')
      setUploading(false)
      return
    }

    try {
      console.log('Starting upload process...') // Debug log
      const imageUrl = await uploadImage(file)
      console.log('Upload completed, calling onImageUpload with URL:', imageUrl) // Debug log
      onImageUpload(imageUrl)
    } catch (error) {
      console.error('Upload error:', error) // Debug log
      setValidationError(error instanceof Error ? error.message : 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  const handleClick = () => {
    if (!disabled && !uploading) {
      fileInputRef.current?.click()
    }
  }

  const displayError = error || validationError

  return (
    <div className="w-full">
      <div
        className={`relative border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
          dragActive
            ? 'border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20'
            : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
        } ${disabled || uploading ? 'opacity-50 cursor-not-allowed' : ''}`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={handleClick}
      >
        <input
          ref={fileInputRef}
          id="thumbnail-upload"
          name="thumbnail-upload"
          type="file"
          accept="image/jpeg,image/jpg,image/png"
          onChange={handleFileInput}
          className="hidden"
          disabled={disabled || uploading}
        />

        {currentImage ? (
          <div className="space-y-4">
            <div className="relative inline-block">
              <img
                src={currentImage}
                alt="Course thumbnail"
                className="w-32 h-20 object-cover rounded-lg mx-auto"
              />
              {!disabled && !uploading && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    onImageUpload('')
                  }}
                  className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm hover:bg-red-600"
                >
                  ×
                </button>
              )}
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {uploading ? 'Uploading...' : 'Click to change thumbnail'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="mx-auto w-12 h-12 text-gray-400">
              {uploading ? (
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-500"></div>
              ) : (
                <svg
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  className="w-full h-full"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
              )}
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {uploading ? (
                  <span className="text-yellow-600 dark:text-yellow-400">Uploading...</span>
                ) : (
                  <>
                    <span className="font-medium text-yellow-600 dark:text-yellow-400">
                      Click to upload
                    </span>{' '}
                    or drag and drop
                  </>
                )}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                PNG, JPG up to 5MB
              </p>
            </div>
          </div>
        )}
      </div>

      {displayError && (
        <p className="mt-2 text-sm text-red-600 dark:text-red-400">
          {displayError}
        </p>
      )}
    </div>
  )
}
