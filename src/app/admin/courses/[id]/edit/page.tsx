'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { authService } from '@/lib/auth-service'
import AdminRoute from '@/components/AdminRoute'
import Link from 'next/link'
import ImageUpload from '@/components/ImageUpload'
import { normalizeImageUrl } from '@/lib/imageUtils'
import CodeEditor from '@/components/CodeEditor'
import CompileButton, { CompilationResultDisplay } from '@/components/CompileButton'
import AdminTestButton from '@/components/AdminTestButton'
import TestResultDisplay from '@/components/TestResultDisplay'
import { renderMarkdown, openMarkdownPreviewInNewWindow } from '@/lib/markdownUtils'

interface User {
  id: string
  email: string
  name: string
  role: 'ADMIN' | 'STUDENT'
}

interface Lesson {
  id: string
  type: 'intro' | 'quiz' | 'challenge'
  title: string
  contentMarkdown?: string
  youtubeUrl?: string
  initialCode?: string
  solutionCode?: string
  tests?: string
  order: number
}

interface Module {
  id: string
  title: string
  description: string
  order: number
  lessons: Lesson[]
}

interface Course {
  id: string
  title: string
  language: string
  goals: string
  level: string
  access: string
  status: string
  thumbnail: string | null
  modules: Module[]
}

export default function EditCourse() {
  const { user, loading } = useAuth()
  const [course, setCourse] = useState<Course | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState<'success' | 'error'>('success')
  const [collapsedModules, setCollapsedModules] = useState<Set<string>>(new Set())

  // Auto-dismiss toast notifications
  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => {
        setMessage('')
      }, 3000) // Auto-dismiss after 3 seconds

      return () => clearTimeout(timer)
    }
  }, [message])
  const [selectedLesson, setSelectedLesson] = useState<{moduleId: string, lessonId: string} | null>(null)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [isSavingModule, setIsSavingModule] = useState<string | null>(null)
  const [isSavingLesson, setIsSavingLesson] = useState<string | null>(null)
  const [isHeaderCollapsed, setIsHeaderCollapsed] = useState(true)
  const [activeTab, setActiveTab] = useState<'instructions' | 'initialCode' | 'solutionCode' | 'tests'>('instructions')
  const [introTab, setIntroTab] = useState<'edit' | 'preview'>('edit')
  
  // Compilation states
  const [initialCodeCompilation, setInitialCodeCompilation] = useState<any>(null)
  const [solutionCodeCompilation, setSolutionCodeCompilation] = useState<any>(null)
  
  // Test execution state
  const [testExecutionResult, setTestExecutionResult] = useState<any>(null)
  
  // Drag and drop state
  const [draggedLesson, setDraggedLesson] = useState<{moduleId: string, lessonId: string} | null>(null)
  const [dragOverModule, setDragOverModule] = useState<string | null>(null)
  const [dragOverPosition, setDragOverPosition] = useState<'before' | 'after' | null>(null)
  const [dragOverLessonId, setDragOverLessonId] = useState<string | null>(null)
  
  // Module drag and drop state
  const [draggedModule, setDraggedModule] = useState<string | null>(null)
  const [dragOverModulePosition, setDragOverModulePosition] = useState<'before' | 'after' | null>(null)
  const [dragOverTargetModule, setDragOverTargetModule] = useState<string | null>(null)
  
  // Course metadata
  const [courseTitle, setCourseTitle] = useState('')
  const [courseLanguage, setCourseLanguage] = useState('solidity')
  const [courseGoals, setCourseGoals] = useState('')
  const [courseLevel, setCourseLevel] = useState<'beginner' | 'intermediate' | 'advanced'>('beginner')
  const [courseAccess, setCourseAccess] = useState<'free' | 'paid'>('free')
  const [courseStatus, setCourseStatus] = useState<'active' | 'deactivated'>('active')
  const [courseThumbnail, setCourseThumbnail] = useState<string | null>(null)
  const [thumbnailError, setThumbnailError] = useState<string | null>(null)
  
  // Modules
  const [modules, setModules] = useState<Module[]>([])
  
  // Tree interface helper functions
  const toggleModuleCollapse = (moduleId: string) => {
    const newCollapsed = new Set(collapsedModules)
    if (newCollapsed.has(moduleId)) {
      newCollapsed.delete(moduleId)
    } else {
      newCollapsed.add(moduleId)
    }
    setCollapsedModules(newCollapsed)
  }

  const toggleHeaderCollapse = () => {
    setIsHeaderCollapsed(!isHeaderCollapsed)
  }

  const selectLesson = (moduleId: string, lessonId: string) => {
    setSelectedLesson({ moduleId, lessonId })
  }

  const getSelectedLesson = () => {
    if (!selectedLesson) return null
    const moduleData = modules.find(m => m.id === selectedLesson.moduleId)
    if (!moduleData) return null
    return moduleData.lessons.find(l => l.id === selectedLesson.lessonId) || null
  }

  const getSelectedModule = () => {
    if (!selectedLesson) return null
    return modules.find(m => m.id === selectedLesson.moduleId) || null
  }

  // Helper function to get lesson number within a module (starts from 1 per module)
  const getModuleLessonNumber = (targetModuleId: string, targetLessonId: string) => {
    const moduleData = modules.find(m => m.id === targetModuleId)
    if (!moduleData) return 0
    
    const lessonIndex = moduleData.lessons.findIndex(l => l.id === targetLessonId)
    return lessonIndex + 1
  }


  // Drag and drop helper functions
  const handleLessonDragStart = (e: React.DragEvent, moduleId: string, lessonId: string) => {
    setDraggedLesson({ moduleId, lessonId })
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', '') // Required for Firefox
  }

  const handleLessonDragEnd = () => {
    // Clean up drag state when drag operation ends
    clearDragState()
  }

  const handleLessonDragOver = (e: React.DragEvent, moduleId: string, lessonId: string, position: 'before' | 'after') => {
    e.preventDefault()
    e.stopPropagation()
    e.dataTransfer.dropEffect = 'move'
    setDragOverModule(moduleId)
    setDragOverLessonId(lessonId)
    setDragOverPosition(position)
  }

  const handleLessonDragLeave = (e: React.DragEvent) => {
    // Simple drag leave - clear the drop zone state
    setDragOverModule(null)
    setDragOverLessonId(null)
    setDragOverPosition(null)
  }

  const handleLessonDrop = (e: React.DragEvent, targetModuleId: string, targetLessonId: string, position: 'before' | 'after') => {
    e.preventDefault()
    e.stopPropagation()
    
    if (!draggedLesson) return
    
    const sourceModuleId = draggedLesson.moduleId
    const sourceLessonId = draggedLesson.lessonId
    
    // Don't allow dropping on itself
    if (sourceModuleId === targetModuleId && sourceLessonId === targetLessonId) {
      clearDragState()
      return
    }
    
    // Reorder lessons
    reorderLessons(sourceModuleId, sourceLessonId, targetModuleId, targetLessonId, position)
    clearDragState()
  }

  const clearDragState = () => {
    setDraggedLesson(null)
    setDragOverModule(null)
    setDragOverLessonId(null)
    setDragOverPosition(null)
  }

  const clearModuleDragState = () => {
    setDraggedModule(null)
    setDragOverModulePosition(null)
    setDragOverTargetModule(null)
  }

  // Module drag and drop helper functions
  const handleModuleDragStart = (e: React.DragEvent, moduleId: string) => {
    setDraggedModule(moduleId)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', '') // Required for Firefox
  }

  const handleModuleDragEnd = () => {
    clearModuleDragState()
  }

  const handleModuleDragOver = (e: React.DragEvent, targetModuleId: string, position: 'before' | 'after') => {
    e.preventDefault()
    e.stopPropagation()
    e.dataTransfer.dropEffect = 'move'
    setDragOverTargetModule(targetModuleId)
    setDragOverModulePosition(position)
  }

  const handleModuleDragLeave = (e: React.DragEvent) => {
    setDragOverTargetModule(null)
    setDragOverModulePosition(null)
  }

  const handleModuleDrop = (e: React.DragEvent, targetModuleId: string, position: 'before' | 'after') => {
    e.preventDefault()
    e.stopPropagation()
    
    if (!draggedModule) return
    
    // Don't allow dropping on itself
    if (draggedModule === targetModuleId) {
      clearModuleDragState()
      return
    }
    
    // Reorder modules
    reorderModules(draggedModule, targetModuleId, position)
    clearModuleDragState()
  }

  const reorderModules = (sourceModuleId: string, targetModuleId: string, position: 'before' | 'after') => {
    setModules(prevModules => {
      const newModules = [...prevModules]
      
      // Find source module
      const sourceModule = newModules.find(m => m.id === sourceModuleId)
      if (!sourceModule) return prevModules
      
      // Remove source module
      const modulesWithoutSource = newModules.filter(m => m.id !== sourceModuleId)
      
      // Find target module index
      const targetIndex = modulesWithoutSource.findIndex(m => m.id === targetModuleId)
      if (targetIndex === -1) return prevModules
      
      // Calculate insert index
      const insertIndex = position === 'before' ? targetIndex : targetIndex + 1
      
      // Insert source module at new position
      const reorderedModules = [
        ...modulesWithoutSource.slice(0, insertIndex),
        sourceModule,
        ...modulesWithoutSource.slice(insertIndex)
      ]
      
      // Update order numbers
      return reorderedModules.map((module, index) => ({
        ...module,
        order: index + 1
      }))
    })
    
    setHasUnsavedChanges(true)
  }

  const reorderLessons = (sourceModuleId: string, sourceLessonId: string, targetModuleId: string, targetLessonId: string, position: 'before' | 'after') => {
    setModules(prevModules => {
      const newModules = [...prevModules]
      
      // Find source module and lesson
      const sourceModule = newModules.find(m => m.id === sourceModuleId)
      if (!sourceModule) return prevModules
      
      const sourceLesson = sourceModule.lessons.find(l => l.id === sourceLessonId)
      if (!sourceLesson) return prevModules
      
      // Find target module
      const targetModule = newModules.find(m => m.id === targetModuleId)
      if (!targetModule) return prevModules
      
      // If moving within the same module
      if (sourceModuleId === targetModuleId) {
        const lessons = [...sourceModule.lessons]
        const sourceIndex = lessons.findIndex(l => l.id === sourceLessonId)
        const targetIndex = lessons.findIndex(l => l.id === targetLessonId)
        
        // Remove source lesson
        lessons.splice(sourceIndex, 1)
        
        // Calculate new insert index (accounting for removal)
        let insertIndex = lessons.findIndex(l => l.id === targetLessonId)
        if (position === 'after') insertIndex += 1
        
        // Insert at new position
        lessons.splice(insertIndex, 0, sourceLesson)
        
        // Update the module
        const updatedModule = {
          ...sourceModule,
          lessons: lessons.map((lesson, index) => ({
            ...lesson,
            order: index + 1
          }))
        }
        
        return newModules.map(module => 
          module.id === sourceModuleId ? updatedModule : module
        )
      } else {
        // Moving between different modules
        const updatedSourceModule = {
          ...sourceModule,
          lessons: sourceModule.lessons.filter(l => l.id !== sourceLessonId)
        }
        
        // Insert lesson at new position in target module
        const targetIndex = targetModule.lessons.findIndex(l => l.id === targetLessonId)
        const insertIndex = position === 'before' ? targetIndex : targetIndex + 1
        
        const updatedTargetModule = {
          ...targetModule,
          lessons: [
            ...targetModule.lessons.slice(0, insertIndex),
            sourceLesson,
            ...targetModule.lessons.slice(insertIndex)
          ]
        }
        
        // Update modules array
        const result = newModules.map(module => {
          if (module.id === sourceModuleId) return updatedSourceModule
          if (module.id === targetModuleId) return updatedTargetModule
          return module
        })
        
        // Update order numbers
        return result.map(module => ({
          ...module,
          lessons: module.lessons.map((lesson, index) => ({
            ...lesson,
            order: index + 1
          }))
        }))
      }
    })
    
    setHasUnsavedChanges(true)
  }

  // Save individual module
  const saveModule = async (moduleId: string) => {
    const moduleData = modules.find(m => m.id === moduleId)
    if (!moduleData) return

    setIsSavingModule(moduleId)
    try {
      const authHeader = authService.getAuthHeader()
      
      // Convert modules to Prisma nested update format
      const modulesUpdate = {
        deleteMany: {},
        create: modules.map((module, moduleIndex) => ({
          title: module.title,
          description: module.description || '',
          order: moduleIndex + 1,
          lessons: {
            create: module.lessons.map((lesson, lessonIndex) => ({
              type: lesson.type.toUpperCase() as 'INTRO' | 'QUIZ' | 'CHALLENGE',
              title: lesson.title,
              contentMarkdown: lesson.contentMarkdown || '',
              initialCode: lesson.initialCode || '',
              solutionCode: lesson.solutionCode || '',
              tests: lesson.tests || '',
              order: lessonIndex + 1,
            }))
          }
        }))
      }
      
      const response = await fetch(`/api/courses/${courseId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(authHeader && { 'Authorization': authHeader })
        },
        body: JSON.stringify({
          title: courseTitle,
          language: courseLanguage,
          goals: courseGoals,
          level: courseLevel.toUpperCase(),
          access: courseAccess.toUpperCase(),
          status: courseStatus.toUpperCase(),
          thumbnail: courseThumbnail && courseThumbnail.startsWith('/api/images/')
            ? courseThumbnail.replace('/api/images/', '')
            : courseThumbnail,
          modules: modulesUpdate
        }),
      })

      if (response.ok) {
        setMessage('Module saved successfully!')
        setMessageType('success')
        setHasUnsavedChanges(false)
        setTimeout(() => setMessage(''), 2000)
      } else {
        const data = await response.json()
        setMessage(data.error || 'Failed to save module')
        setMessageType('error')
      }
    } catch (error) {
      setMessage('Error saving module')
      setMessageType('error')
    } finally {
      setIsSavingModule(null)
    }
  }

  // Save individual lesson
  const saveLesson = async (moduleId: string, lessonId: string) => {
    setIsSavingLesson(lessonId)
    try {
      const authHeader = authService.getAuthHeader()
      
      // Convert modules to Prisma nested update format
      const modulesUpdate = {
        deleteMany: {},
        create: modules.map((module, moduleIndex) => ({
          title: module.title,
          description: module.description || '',
          order: moduleIndex + 1,
          lessons: {
            create: module.lessons.map((lesson, lessonIndex) => ({
              type: lesson.type.toUpperCase() as 'INTRO' | 'QUIZ' | 'CHALLENGE',
              title: lesson.title,
              contentMarkdown: lesson.contentMarkdown || '',
              initialCode: lesson.initialCode || '',
              solutionCode: lesson.solutionCode || '',
              tests: lesson.tests || '',
              order: lessonIndex + 1,
            }))
          }
        }))
      }
      
      const response = await fetch(`/api/courses/${courseId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(authHeader && { 'Authorization': authHeader })
        },
        body: JSON.stringify({
          title: courseTitle,
          language: courseLanguage,
          goals: courseGoals,
          level: courseLevel.toUpperCase(),
          access: courseAccess.toUpperCase(),
          status: courseStatus.toUpperCase(),
          thumbnail: courseThumbnail && courseThumbnail.startsWith('/api/images/')
            ? courseThumbnail.replace('/api/images/', '')
            : courseThumbnail,
          modules: modulesUpdate
        }),
      })

      if (response.ok) {
        setMessage('Lesson saved successfully!')
        setMessageType('success')
        setHasUnsavedChanges(false)
        setTimeout(() => setMessage(''), 1000)
      } else {
        const data = await response.json()
        setMessage(data.error || `Failed to save lesson (${response.status})`)
        setMessageType('error')
      }
    } catch (error) {
      setMessage('Error saving lesson')
      setMessageType('error')
    } finally {
      setIsSavingLesson(null)
    }
  }
  
  const router = useRouter()
  const params = useParams()
  const courseId = params.id as string
  

  useEffect(() => {
    // Check if user is authenticated
    if (loading) return // Still loading
    
    if (!user || user.role !== 'ADMIN') {
      router.push('/admin/login')
      return
    }

    // User data is now available through user context

    // Fetch course data
    fetchCourse()
  }, [router, courseId, user, loading])

  const fetchCourse = async () => {
    try {
      const response = await fetch(`/api/courses/${courseId}`)

      if (response.ok) {
        const data = await response.json()
        const courseData = data.course
        
        setCourse(courseData)
        setCourseTitle(courseData.title)
        setCourseLanguage(courseData.language)
        setCourseGoals(courseData.goals || '')
        setCourseLevel(courseData.level.toLowerCase())
        setCourseAccess(courseData.access.toLowerCase())
        setCourseStatus(courseData.status.toLowerCase())
        // Normalize thumbnail to same-origin proxy so it doesn't resolve relative to the route
        const thumb = courseData.thumbnail || null
        setCourseThumbnail(thumb ? normalizeImageUrl(thumb) : null)
        
        // Process modules and lessons to ensure proper format
        const processedModules = (courseData.modules || []).map((module: any) => ({
          ...module,
          lessons: module.lessons.map((lesson: any) => ({
            ...lesson,
            type: lesson.type.toLowerCase() as 'intro' | 'quiz' | 'challenge'
          }))
        }))
        setModules(processedModules)
        
        // Collapse all modules by default
        const allModuleIds = new Set<string>(processedModules.map((module: any) => module.id))
        setCollapsedModules(allModuleIds)
      } else {
        setMessage('Failed to fetch course')
        setMessageType('error')
      }
    } catch (err) {
      setMessage('Error fetching course')
      setMessageType('error')
    } finally {
      setIsLoading(false)
    }
  }

  const addModule = () => {
    const newModule: Module = {
      id: `module-${Date.now()}`,
      title: `Module ${modules.length + 1}`,
      description: '',
      order: modules.length + 1,
      lessons: []
    }
    setModules([...modules, newModule])
  }

  const removeModule = (moduleId: string) => {
    const moduleData = modules.find(m => m.id === moduleId)
    if (!moduleData) return

    const moduleTitle = moduleData.title || `Module ${modules.indexOf(moduleData) + 1}`
    const lessonCount = moduleData.lessons.length
    
    const confirmMessage = lessonCount > 0 
      ? `Are you sure you want to delete "${moduleTitle}"? This will also delete ${lessonCount} lesson${lessonCount === 1 ? '' : 's'} in this module. This action cannot be undone.`
      : `Are you sure you want to delete "${moduleTitle}"? This action cannot be undone.`

    if (window.confirm(confirmMessage)) {
      setModules(modules.filter(m => m.id !== moduleId))
      // Clear selection if selected lesson was in this module
      if (selectedLesson?.moduleId === moduleId) {
        setSelectedLesson(null)
      }
      setHasUnsavedChanges(true)
    }
  }

  const updateModule = (moduleId: string, field: keyof Module, value: string) => {
    setModules(modules.map(module => 
      module.id === moduleId 
        ? { ...module, [field]: value }
        : module
    ))
    setHasUnsavedChanges(true)
  }

  const addLesson = (moduleId: string, type: 'intro' | 'quiz' | 'challenge') => {
    const moduleData = modules.find(m => m.id === moduleId)
    if (!moduleData) return

    const lessonTypeNames = {
      intro: 'Introduction',
      quiz: 'Quiz',
      challenge: 'Challenge'
    }

    const newLesson: Lesson = {
      id: `lesson-${Date.now()}`,
      type,
      title: `${lessonTypeNames[type]} ${moduleData.lessons.length + 1}`,
      contentMarkdown: '',
      initialCode: '',
      solutionCode: '',
      tests: '',
      order: moduleData.lessons.length + 1
    }

    setModules(modules.map(m => 
      m.id === moduleId 
        ? { ...m, lessons: [...m.lessons, newLesson] }
        : m
    ))

    // Auto-select the new lesson
    selectLesson(moduleId, newLesson.id)
  }

  const removeLesson = (moduleId: string, lessonId: string) => {
    const moduleData = modules.find(m => m.id === moduleId)
    if (!moduleData) return

    const lesson = moduleData.lessons.find(l => l.id === lessonId)
    if (!lesson) return

    const lessonTitle = lesson.title || 'Untitled Lesson'
    const lessonType = lesson.type.charAt(0).toUpperCase() + lesson.type.slice(1)
    
    const confirmMessage = `Are you sure you want to delete the ${lessonType} lesson "${lessonTitle}"? This action cannot be undone.`

    if (window.confirm(confirmMessage)) {
      setModules(modules.map(module => 
        module.id === moduleId 
          ? { ...module, lessons: module.lessons.filter(l => l.id !== lessonId) }
          : module
      ))
      
      // Clear selection if this lesson was selected
      if (selectedLesson?.moduleId === moduleId && selectedLesson?.lessonId === lessonId) {
        setSelectedLesson(null)
      }
      setHasUnsavedChanges(true)
    }
  }

  const updateLesson = (moduleId: string, lessonId: string, field: keyof Lesson, value: string) => {
    setModules(modules.map(module => 
      module.id === moduleId 
        ? {
            ...module,
            lessons: module.lessons.map(lesson =>
              lesson.id === lessonId 
                ? { ...lesson, [field]: value }
                : lesson
            )
          }
        : module
    ))
    setHasUnsavedChanges(true)
  }

  const handleThumbnailSelect = async (file: File | null) => {
    setThumbnailError(null)
    
    if (!file) {
      setCourseThumbnail(null)
      setHasUnsavedChanges(true)
      return
    }
    
    // Check file size before processing (5MB limit)
    const maxSize = 5 * 1024 * 1024 // 5MB
    if (file.size > maxSize) {
      setThumbnailError('File size must be less than 5MB')
      return
    }
    
    // Check if file is empty
    if (file.size === 0) {
      setThumbnailError('File is empty')
      return
    }
    
    // Validate file type more strictly
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png']
    if (!allowedTypes.includes(file.type)) {
      setThumbnailError('Only JPG and PNG images are allowed')
      return
    }
    
    // Check if file is accessible
    if (!file.name || file.name.trim() === '') {
      setThumbnailError('Invalid file name')
      return
    }
    
    try {
      // Upload using public endpoint with key 'thumbnail'
      const formData = new FormData()
      formData.append('thumbnail', file)

      const response = await fetch('/api/upload/course-thumbnail', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const errorText = await response.text()
        setThumbnailError(`Upload failed: ${response.status} ${errorText}`)
        return
      }

      const data = await response.json()

      if (data.success) {
        // Normalize the image URL to use the frontend proxy
        const imageUrl = data.imagePath || data.url || data.thumbnail || data.imageUrl || data.path || ''
        const previewUrl = imageUrl ? normalizeImageUrl(imageUrl) : ''
        setCourseThumbnail(previewUrl)
        setHasUnsavedChanges(true)
        setThumbnailError(null)
      } else {
        setThumbnailError(data.error || 'Failed to upload thumbnail')
      }
    } catch (error) {
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          setThumbnailError('Upload timed out. Please try again.')
        } else {
          setThumbnailError(`Upload failed: ${error.message}`)
        }
      } else {
        setThumbnailError('Upload failed. Please try again.')
      }
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!courseTitle.trim()) {
      setMessage('Course title is required')
      setMessageType('error')
      return
    }

    if (modules.length === 0) {
      setMessage('At least one module is required')
      setMessageType('error')
      return
    }

    // Validate modules
    for (const moduleData of modules) {
      if (!moduleData.title.trim()) {
        setMessage(`Module ${modules.indexOf(moduleData) + 1} title is required`)
        setMessageType('error')
        return
      }
      
      // Validate lessons within each module
      for (const lesson of moduleData.lessons) {
        if (!lesson.title.trim()) {
          setMessage(`Lesson title is required in Module ${modules.indexOf(moduleData) + 1}`)
          setMessageType('error')
          return
        }
      }
    }

    setIsSaving(true)
    setMessage('')

    try {
      // Convert modules to Prisma nested update format
      const modulesUpdate = {
        deleteMany: {},
        create: modules.map((module, moduleIndex) => ({
          title: module.title,
          description: module.description || '',
          order: moduleIndex + 1,
          lessons: {
            create: module.lessons.map((lesson, lessonIndex) => ({
              type: lesson.type.toUpperCase() as 'INTRO' | 'QUIZ' | 'CHALLENGE',
              title: lesson.title,
              contentMarkdown: lesson.contentMarkdown || '',
              initialCode: lesson.initialCode || '',
              solutionCode: lesson.solutionCode || '',
              tests: lesson.tests || '',
              order: lessonIndex + 1,
            }))
          }
        }))
      }
      
      // Debug: Log the data being sent
      const requestData = {
        title: courseTitle,
        language: courseLanguage,
        goals: courseGoals,
        level: courseLevel.toUpperCase(),
        access: courseAccess.toUpperCase(),
        status: courseStatus.toUpperCase(),
        thumbnail: courseThumbnail && courseThumbnail.startsWith('/api/images/')
          ? courseThumbnail.replace('/api/images/', '')
          : courseThumbnail,
        modules: modulesUpdate
      }
      
      const authHeader = authService.getAuthHeader()
      const response = await fetch(`/api/courses/${courseId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(authHeader && { 'Authorization': authHeader })
        },
        body: JSON.stringify(requestData),
      })

      const data = await response.json()

      if (response.ok) {
        setMessage('Course updated successfully!')
        setMessageType('success')
        setTimeout(() => {
          router.push('/admin/courses')
        }, 1500)
      } else {
        setMessage(data.error || 'Failed to update course')
        setMessageType('error')
      }
    } catch (error) {
      setMessage('Error updating course')
      setMessageType('error')
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading course...</p>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-500 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <AdminRoute>
    <div className="h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
      <main className="flex-1 flex flex-col">
        <div className="bg-white dark:bg-gray-900 shadow flex-1 flex flex-col">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                  Edit Course
                </h1>
              </div>
              <div className="flex items-center space-x-4">
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {user?.email}
                </span>
                <Link
                  href="/admin/dashboard"
                  className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                >
                  ← Back to Dashboard
                </Link>
              </div>
            </div>
          </div>


          <div className="p-4 flex-1 flex flex-col">
            {message && (
              <div className={`fixed top-4 right-4 z-50 px-4 py-2 rounded-md shadow-lg transition-all duration-300 ${
                messageType === 'success' 
                  ? 'bg-green-500 text-white' 
                  : 'bg-red-500 text-white'
              }`}>
                <div className="flex items-center gap-2">
                  {messageType === 'success' ? (
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  )}
                  <span className="text-sm font-medium">{message}</span>
                </div>
              </div>
            )}

            <form id="course-form" onSubmit={handleSubmit} className="flex-1 flex flex-col">
              <div className="flex flex-1">
                {/* Left Sidebar - Tree Navigation */}
                <div className="w-1/3 border-r border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 flex flex-col">
                  <div className="border-b border-gray-300 dark:border-gray-600 flex-shrink-0">
                    {/* Header Toggle */}
                    <div className="p-3 border-b border-gray-200 dark:border-gray-600">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                          Course Structure
                        </h3>
                        <button
                          type="button"
                          onClick={toggleHeaderCollapse}
                          className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 text-sm"
                        >
                          {isHeaderCollapsed ? '▼' : '▲'} {isHeaderCollapsed ? 'Show' : 'Hide'} Details
                        </button>
                      </div>
                    </div>
                    
                    {/* Course Metadata - Collapsible */}
                    {!isHeaderCollapsed && (
                      <div className="p-3">
                        <div className="space-y-2 mb-4">
                      <div>
                        <label htmlFor="edit-course-title" className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Course Title
                        </label>
                        <input
                          id="edit-course-title"
                          name="edit-course-title"
                          type="text"
                          value={courseTitle}
                          onChange={(e) => {
                            setCourseTitle(e.target.value)
                            setHasUnsavedChanges(true)
                          }}
                          className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded focus:ring-amber-500 focus:border-amber-500 dark:bg-gray-700 dark:text-white"
                          placeholder="Course title"
                          required
                        />
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Level
                          </label>
                          <select
                            value={courseLevel}
                            onChange={(e) => {
                              setCourseLevel(e.target.value as 'beginner' | 'intermediate' | 'advanced')
                              setHasUnsavedChanges(true)
                            }}
                            className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded focus:ring-amber-500 focus:border-amber-500 dark:bg-gray-700 dark:text-white"
                          >
                            <option value="beginner">Beginner</option>
                            <option value="intermediate">Intermediate</option>
                            <option value="advanced">Advanced</option>
                          </select>
                        </div>
                        
                        <div>
                          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Access
                          </label>
                          <select
                            value={courseAccess}
                            onChange={(e) => {
                              setCourseAccess(e.target.value as 'free' | 'paid')
                              setHasUnsavedChanges(true)
                            }}
                            className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded focus:ring-amber-500 focus:border-amber-500 dark:bg-gray-700 dark:text-white"
                          >
                            <option value="free">Free</option>
                            <option value="paid">Paid</option>
                          </select>
                        </div>
                      </div>
                      
                      <div>
                        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Status
                        </label>
                        <select
                          value={courseStatus}
                          onChange={(e) => {
                            setCourseStatus(e.target.value as 'active' | 'deactivated')
                            setHasUnsavedChanges(true)
                          }}
                          className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded focus:ring-amber-500 focus:border-amber-500 dark:bg-gray-700 dark:text-white"
                        >
                          <option value="active">Active</option>
                          <option value="deactivated">Deactivated</option>
                        </select>
                      </div>
                    </div>

                    {/* Thumbnail Upload */}
                    <div className="mb-4">
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Course Thumbnail
                      </label>
                      <ImageUpload
                        onImageSelect={handleThumbnailSelect}
                        currentImage={courseThumbnail}
                        error={thumbnailError || undefined}
                        disabled={isSaving}
                      />
                    </div>

                    {/* Action Buttons */}
                    <div className="flex space-x-2 mb-3">
                      <Link
                        href="/admin/dashboard"
                        className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-sm text-center"
                      >
                        Cancel
                      </Link>
                      <button
                        type="submit"
                        form="course-form"
                        disabled={isSaving}
                        className={`flex-1 px-3 py-2 rounded-md font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm ${
                          hasUnsavedChanges 
                            ? 'bg-yellow-700 text-white hover:bg-yellow-800' 
                            : 'bg-yellow-600 text-white hover:bg-yellow-700'
                        }`}
                      >
                        {isSaving ? 'Saving...' : hasUnsavedChanges ? '⚠️ Save' : 'Save'}
                      </button>
                    </div>

                      </div>
                    )}
                  </div>

                  {/* Add Module Button - Always Visible */}
                  <div className="p-3 border-b border-gray-300 dark:border-gray-600 flex-shrink-0">
                    <button
                      type="button"
                      onClick={addModule}
                      className="w-full px-3 py-2 bg-yellow-600 text-white rounded-md font-medium hover:bg-yellow-700 transition-colors text-sm"
                    >
                      + Add New Module
                    </button>
                  </div>

                  {/* Tree Navigation */}
                  <div className="p-3 overflow-y-auto flex-1 min-h-0">
                    {modules.length === 0 ? (
                      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                        <div className="mb-4">
                          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                          </svg>
                        </div>
                        <p className="text-sm mb-2">No modules yet.</p>
                        <p className="text-xs">Add your first module to start building your course content.</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {modules.map((module, moduleIndex) => (
                          <div key={module.id}>
                            {/* Drop zone before module */}
                            <div
                              className={`h-1 transition-colors ${
                                dragOverTargetModule === module.id && 
                                dragOverModulePosition === 'before'
                                  ? 'bg-blue-500' 
                                  : 'bg-transparent'
                              }`}
                              onDragOver={(e) => handleModuleDragOver(e, module.id, 'before')}
                              onDragLeave={handleModuleDragLeave}
                              onDrop={(e) => handleModuleDrop(e, module.id, 'before')}
                            />
                            
                            {/* Module Container */}
                            <div className={`border border-gray-200 dark:border-gray-600 rounded transition-colors ${
                              draggedModule === module.id ? 'opacity-50 bg-gray-200 dark:bg-gray-600' : ''
                            }`}>
                              {/* Module Header */}
                              <div 
                                draggable
                                onDragStart={(e) => handleModuleDragStart(e, module.id)}
                                onDragEnd={handleModuleDragEnd}
                                className="flex items-center justify-between p-3 bg-white dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600 cursor-move"
                              >
                                <div className="flex items-center space-x-2">
                                  <span className="text-gray-400 dark:text-gray-500 cursor-move mr-1">⋮⋮</span>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      toggleModuleCollapse(module.id)
                                    }}
                                    className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                                  >
                                    {collapsedModules.has(module.id) ? '▶' : '▼'}
                                  </button>
                                  <span className="font-medium text-sm text-gray-900 dark:text-white">
                                    Module {moduleIndex + 1}
                                  </span>
                                </div>
                              <div className="flex space-x-1">
                                <button
                                  type="button"
                                  onClick={() => addLesson(module.id, 'intro')}
                                  className="text-xs px-2 py-1 bg-sky-600 text-white rounded hover:bg-sky-700"
                                  title="Add Intro Lesson"
                                >
                                  +I
                                </button>
                                <button
                                  type="button"
                                  onClick={() => addLesson(module.id, 'challenge')}
                                  className="text-xs px-2 py-1 bg-emerald-600 text-white rounded hover:bg-emerald-700"
                                  title="Add Challenge Lesson"
                                >
                                  +C
                                </button>
                                <button
                                  type="button"
                                  onClick={() => addLesson(module.id, 'quiz')}
                                  className="text-xs px-2 py-1 bg-violet-600 text-white rounded hover:bg-violet-700"
                                  title="Add Quiz Lesson"
                                >
                                  +Q
                                </button>
                                <button
                                  type="button"
                                  onClick={() => saveModule(module.id)}
                                  disabled={isSavingModule === module.id}
                                  className="text-xs px-2 py-1 bg-amber-500 text-white rounded hover:bg-amber-600 disabled:opacity-50"
                                  title="Save Module"
                                >
                                  {isSavingModule === module.id ? '...' : '💾'}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => removeModule(module.id)}
                                  className="text-xs px-2 py-1 bg-red-500 text-white rounded hover:bg-red-600"
                                  title="Remove Module"
                                >
                                  ×
                                </button>
                              </div>
                            </div>

                            {/* Module Content */}
                            {!collapsedModules.has(module.id) && (
                              <div className="bg-gray-50 dark:bg-gray-800">
                                {/* Module Info */}
                                <div className="p-2 border-b border-gray-200 dark:border-gray-600">
                                  <div className="space-y-1">
                                    <input
                                      id={`module-title-${module.id}`}
                                      name={`module-title-${module.id}`}
                                      type="text"
                                      value={module.title}
                                      onChange={(e) => updateModule(module.id, 'title', e.target.value)}
                                      className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded focus:ring-amber-500 focus:border-amber-500 dark:bg-gray-700 dark:text-white"
                                      placeholder="Module title"
                                    />
                                    <input
                                      id={`module-description-${module.id}`}
                                      name={`module-description-${module.id}`}
                                      type="text"
                                      value={module.description}
                                      onChange={(e) => updateModule(module.id, 'description', e.target.value)}
                                      className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded focus:ring-amber-500 focus:border-amber-500 dark:bg-gray-700 dark:text-white"
                                      placeholder="Module description"
                                    />
                                  </div>
                                </div>

                                {/* Lessons */}
                                <div className="p-1">
                                  {module.lessons.length === 0 ? (
                                    <div className="text-center py-4 text-gray-500 dark:text-gray-400 text-sm">
                                      No lessons yet
                                    </div>
                                  ) : (
                                    <div className="space-y-1">
                                      {module.lessons.map((lesson, lessonIndex) => (
                                        <div key={lesson.id}>
                                          {/* Drop zone before lesson */}
                                          <div
                                            className={`h-1 transition-colors ${
                                              dragOverModule === module.id && 
                                              dragOverLessonId === lesson.id && 
                                              dragOverPosition === 'before'
                                                ? 'bg-blue-500' 
                                                : 'bg-transparent'
                                            }`}
                                            onDragOver={(e) => handleLessonDragOver(e, module.id, lesson.id, 'before')}
                                            onDragLeave={handleLessonDragLeave}
                                            onDrop={(e) => handleLessonDrop(e, module.id, lesson.id, 'before')}
                                          />
                                          
                                          {/* Lesson item */}
                                          <div
                                            draggable
                                            onDragStart={(e) => handleLessonDragStart(e, module.id, lesson.id)}
                                            onDragEnd={handleLessonDragEnd}
                                            className={`flex items-center justify-between p-2 rounded cursor-pointer transition-colors ${
                                              selectedLesson?.moduleId === module.id && selectedLesson?.lessonId === lesson.id
                                                ? 'bg-yellow-100 dark:bg-yellow-900/30 border border-yellow-300 dark:border-yellow-600'
                                                : draggedLesson?.moduleId === module.id && draggedLesson?.lessonId === lesson.id
                                                ? 'opacity-50 bg-gray-200 dark:bg-gray-600'
                                                : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                                            }`}
                                            onClick={() => selectLesson(module.id, lesson.id)}
                                          >
                                            <div className="flex items-center space-x-2">
                                              <span className="text-xs font-medium text-gray-500 dark:text-gray-400 min-w-[20px]">
                                                {getModuleLessonNumber(module.id, lesson.id)}.
                                              </span>
                                              <span className="text-gray-400 dark:text-gray-500 cursor-move mr-1">⋮⋮</span>
                                              <span className={`text-xs font-medium px-2 py-1 rounded text-white ${
                                                lesson.type === 'intro' ? 'bg-sky-600' :
                                                lesson.type === 'quiz' ? 'bg-violet-600' :
                                                'bg-emerald-600'
                                              }`}>
                                                {lesson.type === 'intro' ? 'I' : lesson.type === 'quiz' ? 'Q' : 'C'}
                                              </span>
                                              <span className="text-sm text-gray-700 dark:text-gray-300">
                                                {lesson.title || `${lesson.type.charAt(0).toUpperCase() + lesson.type.slice(1)} ${lessonIndex + 1}`}
                                              </span>
                                            </div>
                                            <button
                                              type="button"
                                              onClick={(e) => {
                                                e.stopPropagation()
                                                removeLesson(module.id, lesson.id)
                                              }}
                                              className="text-red-500 hover:text-red-700 text-xs px-1"
                                            >
                                              ×
                                            </button>
                                          </div>
                                          
                                          {/* Drop zone after lesson (only for last lesson) */}
                                          {lessonIndex === module.lessons.length - 1 && (
                                            <div
                                              className={`h-1 transition-colors ${
                                                dragOverModule === module.id && 
                                                dragOverLessonId === lesson.id && 
                                                dragOverPosition === 'after'
                                                  ? 'bg-blue-500' 
                                                  : 'bg-transparent'
                                              }`}
                                              onDragOver={(e) => handleLessonDragOver(e, module.id, lesson.id, 'after')}
                                              onDragLeave={handleLessonDragLeave}
                                              onDrop={(e) => handleLessonDrop(e, module.id, lesson.id, 'after')}
                                            />
                                          )}
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                            </div>
                            
                            {/* Drop zone after module (only for last module) */}
                            {moduleIndex === modules.length - 1 && (
                              <div
                                className={`h-1 transition-colors ${
                                  dragOverTargetModule === module.id && 
                                  dragOverModulePosition === 'after'
                                    ? 'bg-blue-500' 
                                    : 'bg-transparent'
                                }`}
                                onDragOver={(e) => handleModuleDragOver(e, module.id, 'after')}
                                onDragLeave={handleModuleDragLeave}
                                onDrop={(e) => handleModuleDrop(e, module.id, 'after')}
                              />
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Right Content Area - Lesson Editor */}
                <div className="flex-1 bg-white dark:bg-gray-900">
                  {selectedLesson && getSelectedLesson() ? (
                    <div className="h-full flex flex-col">
                      {/* Lesson Header */}
                      <div className="px-4 py-2 border-b border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800">
                        <div className="flex items-center justify-between space-x-4">
                          <div className="flex items-center space-x-3 flex-1">
                            <label htmlFor="lesson-title" className="text-sm font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap">
                              Lesson Title:
                            </label>
                            <input
                              id="lesson-title"
                              name="lesson-title"
                              type="text"
                              value={getSelectedLesson()?.title || ''}
                              onChange={(e) => {
                                if (selectedLesson) {
                                  updateLesson(selectedLesson.moduleId, selectedLesson.lessonId, 'title', e.target.value)
                                }
                              }}
                              className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-amber-500 focus:border-amber-500 dark:bg-gray-700 dark:text-white text-sm"
                              placeholder="Enter lesson title"
                              required
                            />
                          </div>
                          <div className="flex space-x-2">
                            <button
                              type="button"
                              onClick={() => {
                                if (selectedLesson) {
                                  saveLesson(selectedLesson.moduleId, selectedLesson.lessonId)
                                }
                              }}
                              disabled={isSavingLesson === selectedLesson?.lessonId}
                              className="px-3 py-1 bg-emerald-600 text-white rounded text-sm font-medium hover:bg-emerald-700 disabled:opacity-50"
                            >
                              {isSavingLesson === selectedLesson?.lessonId ? 'Saving...' : '💾 Save'}
                            </button>
                            {getSelectedLesson()?.type === 'intro' && (
                              <button
                                type="button"
                                onClick={() => {
                                  const content = getSelectedLesson()?.contentMarkdown || ''
                                  const lessonTitle = getSelectedLesson()?.title || 'Lesson Preview'
                                  const moduleNumber = selectedLesson ? modules.findIndex(m => m.id === selectedLesson.moduleId) + 1 : 0
                                  const lessonNumber = selectedLesson ? getModuleLessonNumber(selectedLesson.moduleId, selectedLesson.lessonId) : 0
                                  openMarkdownPreviewInNewWindow(content, lessonTitle, moduleNumber, lessonNumber)
                                }}
                                className="px-3 py-1 bg-amber-600 text-white rounded text-sm font-medium hover:bg-amber-700"
                              >
                                🚀 Preview
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => {
                                if (selectedLesson) {
                                  removeLesson(selectedLesson.moduleId, selectedLesson.lessonId)
                                  setSelectedLesson(null)
                                }
                              }}
                              className="px-3 py-1 bg-red-500 text-white rounded text-sm font-medium hover:bg-red-600"
                            >
                              🗑️ Delete
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Lesson Content */}
                      <div className="flex-1 p-6 overflow-y-auto flex flex-col">
                        {getSelectedLesson() && (
                          <div className="flex-1 flex flex-col">

                            {/* Lesson Type Specific Content */}
                            {getSelectedLesson()?.type === 'intro' && (
                              <div className="flex-1 flex flex-col">
                                {/* Tab Navigation */}
                                <div className="border-b border-gray-200 dark:border-gray-600 mb-4">
                                  <nav className="-mb-px flex space-x-8">
                                    {[
                                      { id: 'edit', label: 'Edit', icon: '✏️' },
                                      { id: 'preview', label: 'Preview', icon: '👀' }
                                    ].map((tab) => (
                                      <button
                                        key={tab.id}
                                        type="button"
                                        onClick={() => setIntroTab(tab.id as 'edit' | 'preview')}
                                        className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                                          introTab === tab.id
                                            ? 'border-amber-500 text-amber-600 dark:text-amber-400'
                                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                                        }`}
                                      >
                                        <span className="mr-2">{tab.icon}</span>
                                        {tab.label}
                                      </button>
                                    ))}
                                  </nav>
                                </div>

                                {/* Tab Content */}
                                {introTab === 'edit' && (
                                  <div className="flex-1 flex flex-col">
                                    <textarea
                                      value={getSelectedLesson()?.contentMarkdown || ''}
                                      onChange={(e) => {
                                        if (selectedLesson) {
                                          // Prevent automatic conversion of != to ≠
                                          let value = e.target.value
                                          value = value.replace(/≠/g, '!=')
                                          updateLesson(selectedLesson.moduleId, selectedLesson.lessonId, 'contentMarkdown', value)
                                        }
                                      }}
                                      maxLength={10000}
                                      className="flex-1 w-full px-3 py-2 border border-gray-300 dark:border-gray-500 rounded-md focus:ring-amber-500 focus:border-amber-500 dark:bg-gray-700 dark:text-white text-sm font-mono resize-none"
                                      placeholder="Write your introduction content in Markdown format..."
                                      autoComplete="off"
                                      autoCorrect="off"
                                      autoCapitalize="off"
                                      spellCheck="false"
                                      data-gramm="false"
                                      data-gramm_editor="false"
                                      data-enable-grammarly="false"
                                      style={{ 
                                        fontVariantLigatures: 'none',
                                        textRendering: 'optimizeSpeed',
                                        WebkitFontFeatureSettings: '"liga" 0',
                                        fontFeatureSettings: '"liga" 0'
                                      }}
                                    />
                                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                      {(getSelectedLesson()?.contentMarkdown?.length || 0)}/10000 characters
                                    </div>
                                  </div>
                                )}

                                {introTab === 'preview' && (
                                  <div className="flex-1 flex flex-col">
                                    <div className="flex-1 border border-gray-300 dark:border-gray-600 rounded-md p-4 bg-white dark:bg-gray-800 overflow-y-auto">
                                      {getSelectedLesson()?.contentMarkdown ? (
                                        <div className="prose prose-sm max-w-none dark:prose-invert">
                                          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-6 border-b border-gray-200 dark:border-gray-600 pb-4">
                                            Lesson {selectedLesson ? modules.findIndex(m => m.id === selectedLesson.moduleId) + 1 : 0}.{selectedLesson ? getModuleLessonNumber(selectedLesson.moduleId, selectedLesson.lessonId) : 0} {getSelectedLesson()?.title || 'Untitled Lesson'}
                                          </h1>
                                          <div 
                                            dangerouslySetInnerHTML={{ 
                                              __html: renderMarkdown(getSelectedLesson()?.contentMarkdown || '') 
                                            }}
                                          />
                                        </div>
                                      ) : (
                                        <div className="text-gray-500 dark:text-gray-400 italic text-center py-8">
                                          No content to preview. Switch to Edit tab to add markdown content.
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}

                            {getSelectedLesson()?.type === 'quiz' && (
                              <div className="flex-1 flex flex-col">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                  Quiz Content (Markdown) *
                                </label>
                                <textarea
                                  value={getSelectedLesson()?.contentMarkdown || ''}
                                  onChange={(e) => {
                                    if (selectedLesson) {
                                      updateLesson(selectedLesson.moduleId, selectedLesson.lessonId, 'contentMarkdown', e.target.value)
                                    }
                                  }}
                                  maxLength={3000}
                                  className="flex-1 w-full px-3 py-2 border border-gray-300 dark:border-gray-500 rounded-md focus:ring-amber-500 focus:border-amber-500 dark:bg-gray-700 dark:text-white text-sm font-mono resize-none"
                                  placeholder="Write your quiz questions in Markdown format..."
                                />
                                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                  {(getSelectedLesson()?.contentMarkdown?.length || 0)}/3000 characters
                                </div>
                              </div>
                            )}

                            {getSelectedLesson()?.type === 'challenge' && (
                              <div className="flex-1 flex flex-col">
                                {/* Tab Navigation */}
                                <div className="border-b border-gray-200 dark:border-gray-600">
                                  <nav className="-mb-px flex space-x-8">
                                    {[
                                      { id: 'instructions', label: 'Instructions', icon: '📝' },
                                      { id: 'initialCode', label: 'Initial Code', icon: '💻' },
                                      { id: 'solutionCode', label: 'Solution Code', icon: '✅' },
                                      { id: 'tests', label: 'Test Cases', icon: '🧪' }
                                    ].map((tab) => (
                                      <button
                                        key={tab.id}
                                        type="button"
                                        onClick={() => {
                                          setActiveTab(tab.id as any)
                                          // Clear test results when switching away from tests tab
                                          if (activeTab === 'tests' && tab.id !== 'tests') {
                                            setTestExecutionResult(null)
                                          }
                                        }}
                                        className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                                          activeTab === tab.id
                                            ? 'border-amber-500 text-amber-600 dark:text-amber-400'
                                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                                        }`}
                                      >
                                        <span className="mr-2">{tab.icon}</span>
                                        {tab.label}
                                      </button>
                                    ))}
                                  </nav>
                                </div>

                                {/* Tab Content */}
                                <div className="flex-1 flex flex-col">
                                  {activeTab === 'instructions' && (
                                    <div className="flex-1 flex flex-col">
                                      <div className="h-4"></div>
                                      <textarea
                                        value={getSelectedLesson()?.contentMarkdown || ''}
                                        onChange={(e) => {
                                          if (selectedLesson) {
                                            updateLesson(selectedLesson.moduleId, selectedLesson.lessonId, 'contentMarkdown', e.target.value)
                                          }
                                        }}
                                        maxLength={10000}
                                        className="flex-1 w-full px-3 py-2 border border-gray-300 dark:border-gray-500 rounded-md focus:ring-amber-500 focus:border-amber-500 dark:bg-gray-700 dark:text-white text-sm font-mono resize-none"
                                        placeholder="Write the challenge instructions in Markdown format..."
                                      />
                                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                        {(getSelectedLesson()?.contentMarkdown?.length || 0)}/10000 characters
                                      </div>
                                    </div>
                                  )}

                                  {activeTab === 'initialCode' && (
                                    <div className="flex-1 flex flex-col">
                                      <div className="h-4"></div>
                                      <div className="flex-1 flex flex-col">
                                        {/* Compilation Results at the top */}
                                        {initialCodeCompilation && (
                                          <CompilationResultDisplay 
                                            result={initialCodeCompilation} 
                                            className="mb-4"
                                          />
                                        )}
                                        
                                        <div className="flex justify-between items-center mb-2">
                                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                            Initial Code (Solidity)
                                          </label>
                                          <CompileButton
                                            code={getSelectedLesson()?.initialCode || ''}
                                            onCompilationResult={setInitialCodeCompilation}
                                            className="flex-shrink-0"
                                            courseId={course?.id || ''}
                                            skipSession={true}
                                          />
                                        </div>
                                        <CodeEditor
                                          value={getSelectedLesson()?.initialCode || ''}
                                          onChange={(value) => {
                                            if (selectedLesson) {
                                              updateLesson(selectedLesson.moduleId, selectedLesson.lessonId, 'initialCode', value)
                                            }
                                          }}
                                          language="solidity"
                                          placeholder="// Enter initial Solidity code here..."
                                          height="calc(100vh - 300px)"
                                        />
                                      </div>
                                    </div>
                                  )}

                                  {activeTab === 'solutionCode' && (
                                    <div className="flex-1 flex flex-col">
                                      <div className="h-4"></div>
                                      <div className="flex-1 flex flex-col">
                                        {/* Compilation Results at the top */}
                                        {solutionCodeCompilation && (
                                          <CompilationResultDisplay 
                                            result={solutionCodeCompilation} 
                                            className="mb-4"
                                          />
                                        )}
                                        
                                        <div className="flex justify-between items-center mb-2">
                                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                            Solution Code (Solidity)
                                          </label>
                                          <CompileButton
                                            code={getSelectedLesson()?.solutionCode || ''}
                                            onCompilationResult={setSolutionCodeCompilation}
                                            className="flex-shrink-0"
                                            courseId={course?.id || ''}
                                            skipSession={true}
                                          />
                                        </div>
                                        <CodeEditor
                                          value={getSelectedLesson()?.solutionCode || ''}
                                          onChange={(value) => {
                                            if (selectedLesson) {
                                              updateLesson(selectedLesson.moduleId, selectedLesson.lessonId, 'solutionCode', value)
                                            }
                                          }}
                                          language="solidity"
                                          placeholder="// Enter solution Solidity code here..."
                                          height="calc(100vh - 300px)"
                                        />
                                      </div>
                                    </div>
                                  )}

                                  {activeTab === 'tests' && (
                                    <div className="flex-1 flex flex-col">
                                      <div className="h-4"></div>
                                      <div className="flex-1 flex flex-col">
                                        {/* Test Results at the top */}
                                        {testExecutionResult && (
                                          <TestResultDisplay 
                                            result={testExecutionResult} 
                                            className="mb-4"
                                          />
                                        )}
                                        
                                        <div className="flex justify-between items-center mb-2">
                                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                            Test Cases (Solidity)
                                          </label>
                                          <AdminTestButton
                                            testCode={getSelectedLesson()?.tests || ''}
                                            solutionCode={getSelectedLesson()?.solutionCode || ''}
                                            onTestResult={setTestExecutionResult}
                                            className="flex-shrink-0"
                                            courseId={course?.id || ''}
                                          />
                                        </div>
                                        <CodeEditor
                                          value={getSelectedLesson()?.tests || ''}
                                          onChange={(value) => {
                                            if (selectedLesson) {
                                              updateLesson(selectedLesson.moduleId, selectedLesson.lessonId, 'tests', value)
                                            }
                                          }}
                                          language="solidity"
                                          placeholder="// Write your test cases here...\n// Use Foundry syntax with import 'forge-std/Test.sol'"
                                          height="calc(100vh - 300px)"
                                        />
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="h-full flex items-center justify-center">
                      <div className="text-center">
                        <div className="text-gray-400 dark:text-gray-500 mb-4">
                          {modules.length === 0 ? (
                            <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                            </svg>
                          ) : (
                            <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                          )}
                        </div>
                        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                          {modules.length === 0 ? 'Add Your First Module' : 'Select a Lesson'}
                        </h3>
                        <p className="text-gray-500 dark:text-gray-400">
                          {modules.length === 0 
                            ? 'Start building your course by adding modules and lessons'
                            : 'Choose a lesson from the tree on the left to start editing'
                          }
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

            </form>
          </div>
        </div>
      </main>
    </div>
    </AdminRoute>
  )
}