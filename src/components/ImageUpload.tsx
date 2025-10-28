'use client'

import { useState, useRef } from 'react'
import { validateImage } from '@/lib/imageUtils'

interface ImageUploadProps {
  onImageSelect: (file: File | null) => void
  currentImage?: string | null
  error?: string
  disabled?: boolean
}

export default function ImageUpload({ 
  onImageSelect, 
  currentImage, 
  error, 
  disabled = false 
}: ImageUploadProps) {
  const [dragActive, setDragActive] = useState(false)
  const [validationError, setValidationError] = useState<string | null>(null)
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

    if (disabled) return

    const files = e.dataTransfer.files
    if (files && files[0]) {
      handleFile(files[0])
    }
  }

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (disabled) return

    const files = e.target.files
    if (files && files[0]) {
      handleFile(files[0])
    }
  }

  const handleFile = (file: File) => {
    setValidationError(null)
    
    const validation = validateImage(file)
    if (!validation.isValid) {
      setValidationError(validation.error || 'Invalid image file')
      return
    }

    onImageSelect(file)
  }

  const handleClick = () => {
    if (!disabled) {
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
        } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={handleClick}
      >
        <input
          ref={fileInputRef}
          id="image-upload"
          name="image-upload"
          type="file"
          accept="image/jpeg,image/jpg,image/png"
          onChange={handleFileInput}
          className="hidden"
          disabled={disabled}
        />

        {currentImage ? (
          <div className="space-y-4">
            <div className="relative inline-block">
              <img
                src={currentImage}
                alt="Course thumbnail"
                className="w-32 h-20 object-cover rounded-lg mx-auto"
              />
              {!disabled && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    onImageSelect(null)
                  }}
                  className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm hover:bg-red-600"
                >
                  ×
                </button>
              )}
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Click to change thumbnail
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="mx-auto w-12 h-12 text-gray-400">
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
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                <span className="font-medium text-yellow-600 dark:text-yellow-400">
                  Click to upload
                </span>{' '}
                or drag and drop
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

