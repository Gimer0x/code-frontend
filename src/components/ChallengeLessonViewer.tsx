'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import SolidityEditor from './SolidityEditor'
import { useStudentProgress } from '@/hooks/useStudentProgress'

interface Lesson {
  id: string
  title: string
  type: string
  contentMarkdown: string
  initialCode?: string
  solutionCode?: string
  tests?: string
  module: {
    id: string
    title: string
    course: {
      id: string
      title: string
    }
  }
  navigation: {
    currentIndex: number
    totalLessons: number
    nextLesson?: {
      id: string
      title: string
    }
  }
  progress?: {
    completed: boolean
  }
}

interface ChallengeLessonViewerProps {
  lesson: Lesson
  courseId: string
  session?: any
}

// Helper function to get default Solidity template
const getDefaultSolidityTemplate = () => {
  return `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

contract Challenge {
    // Your code here
}`
}

export default function ChallengeLessonViewer({ lesson, courseId, session }: ChallengeLessonViewerProps) {
  const router = useRouter()
  const [leftPanelCollapsed, setLeftPanelCollapsed] = useState(false)
  const [rightPanelCollapsed, setRightPanelCollapsed] = useState(false)
  
  // Immediate resize trigger function
  const immediateResize = useCallback(() => {
    const aceEditor = document.querySelector('.ace_editor') as any
    if (aceEditor && aceEditor.env && aceEditor.env.editor && aceEditor.env.editor.resize) {
      aceEditor.env.editor.resize()
    }
  }, [])
  const [leftPanelWidth, setLeftPanelWidth] = useState(30) // percentage
  const [rightPanelWidth, setRightPanelWidth] = useState(25) // percentage
  const [isResizing, setIsResizing] = useState(false)
  const [resizeType, setResizeType] = useState<'left' | 'right' | null>(null)
  const [code, setCode] = useState('') // Start empty, will be set when progress loads
  const [isLoadingCode, setIsLoadingCode] = useState(true) // Start as loading
  const [showResetConfirm, setShowResetConfirm] = useState(false)
  
  // Chat state
  const [chatMessages, setChatMessages] = useState<Array<{ role: 'user' | 'assistant'; content: string; timestamp: Date }>>([])
  const [chatInput, setChatInput] = useState('')
  const [isLoadingChat, setIsLoadingChat] = useState(false)
  const [hasActiveSubscription, setHasActiveSubscription] = useState<boolean | null>(null)
  const chatMessagesRef = useRef<HTMLDivElement>(null)
  
  // Challenge system state
  const [activeRightTab, setActiveRightTab] = useState<'chat' | 'output'>('output')
  const [outputContent, setOutputContent] = useState<{
    type: 'compile' | 'save' | 'test' | 'error'
    content: any
    timestamp: Date
  } | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)

  // Progress tracking
  const {
    progress: studentProgress,
    statistics,
    isLoading: progressLoading,
    error: progressError,
    saveCode: saveStudentCode,
    markCompleted,
    isSaving: isSavingProgress,
    handleAutoSave
  } = useStudentProgress({
    courseId,
    lessonId: lesson.id,
    autoSave: false,
    autoSaveDelay: 3000
  }) as any // Type assertion to include handleAutoSave
  const [isLoading, setIsLoading] = useState(false)
  
  // Project initialization state
  const [isInitializing, setIsInitializing] = useState(false)
  const [initializationStatus, setInitializationStatus] = useState<{
    initialized: boolean
    ready: boolean
    message: string
    missingComponents?: string[]
  } | null>(null)
  
  const containerRef = useRef<HTMLDivElement>(null)
  const initializationAttempted = useRef(false)

  const navigateToLesson = (lessonId: string) => {
    router.push(`/courses/${courseId}/modules/${lesson.module.id}/lessons/${lessonId}`)
  }

  // Handle code changes without auto-save
  const handleCodeChange = useCallback((newCode: string) => {
    setCode(newCode)
    // Auto-save disabled to prevent infinite loops
  }, [])

  const cleanMarkdown = (content: string) => {
    if (!content) return content
    // Replace non-breaking spaces with regular spaces
    let cleaned = content.replace(/\u00A0/g, ' ')
    // Replace other Unicode spaces with regular spaces
    cleaned = cleaned.replace(/[\u2000-\u200B\u2028\u2029]/g, ' ')
    // Remove any non-printable characters except newlines and tabs
    cleaned = cleaned.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    // Convert mathematical symbols back to operators
    cleaned = cleaned.replace(/≠/g, '!=')  // Not equal
    cleaned = cleaned.replace(/≤/g, '<=')  // Less than or equal
    cleaned = cleaned.replace(/≥/g, '>=')  // Greater than or equal
    cleaned = cleaned.replace(/⇒/g, '=>')  // Arrow function
    cleaned = cleaned.replace(/→/g, '->')  // Arrow
    cleaned = cleaned.replace(/←/g, '<-')  // Left arrow
    cleaned = cleaned.replace(/∧/g, '&&')  // Logical AND
    cleaned = cleaned.replace(/∨/g, '||')  // Logical OR
    return cleaned
  }

  // Resize handlers
  const handleMouseDown = useCallback((type: 'left' | 'right') => {
    setIsResizing(true)
    setResizeType(type)
  }, [])

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isResizing || !containerRef.current) return

    const containerRect = containerRef.current.getBoundingClientRect()
    const containerWidth = containerRect.width
    const mouseX = e.clientX - containerRect.left
    const percentage = (mouseX / containerWidth) * 100

    if (resizeType === 'left') {
      // Only resize the left panel, don't affect the right panel
      const newLeftWidth = Math.max(15, Math.min(70, percentage))
      setLeftPanelWidth(newLeftWidth)
    } else if (resizeType === 'right') {
      // Only resize the right panel, don't affect the left panel
      const newRightWidth = Math.max(15, Math.min(50, 100 - percentage))
      setRightPanelWidth(newRightWidth)
    }
  }, [isResizing, resizeType])

  const handleMouseUp = useCallback(() => {
    setIsResizing(false)
    setResizeType(null)
    // Trigger editor resize after resize is complete
    setTimeout(() => {
      const aceEditor = document.querySelector('.ace_editor') as any
      if (aceEditor && aceEditor.env && aceEditor.env.editor && aceEditor.env.editor.resize) {
        aceEditor.env.editor.resize()
      }
    }, 10)
  }, [])

  // Add event listeners for mouse move and up
  useEffect(() => {
    if (typeof window !== 'undefined') {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
      return () => {
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
      }
    }
  }, [handleMouseMove, handleMouseUp])

  // Trigger editor resize when panels change with improved responsiveness
  const triggerEditorResize = useCallback(() => {
    // Find the Ace Editor instance and trigger resize
    const aceEditor = document.querySelector('.ace_editor') as any
    if (aceEditor && aceEditor.env && aceEditor.env.editor && aceEditor.env.editor.resize) {
      // Immediate resize for better responsiveness
      aceEditor.env.editor.resize()
      // Additional resize after a short delay to ensure layout stability
      setTimeout(() => {
        aceEditor.env.editor.resize()
      }, 20)
    }
  }, [])

  // Add window resize listener to trigger editor resize
  useEffect(() => {
    const handleWindowResize = () => {
      // Trigger editor resize when window is resized
      setTimeout(triggerEditorResize, 100)
    }

    if (typeof window !== 'undefined') {
      window.addEventListener('resize', handleWindowResize)
      return () => {
        window.removeEventListener('resize', handleWindowResize)
      }
    }
  }, [triggerEditorResize])

  // Challenge system functions
  const handleCompile = async () => {
    setIsLoading(true)
    setIsProcessing(true)
    try {
      const response = await fetch('/api/challenge/compile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code,
          courseId,
          lessonId: lesson.id
        })
      })
      
      const result = await response.json()
      
      // Add a small delay to prevent jarring transitions
      setTimeout(() => {
        setOutputContent({
          type: 'compile',
          content: result,
          timestamp: new Date()
        })
        setIsProcessing(false)
      }, 100)
    } catch (error) {
      setTimeout(() => {
        setOutputContent({
          type: 'error',
          content: { message: 'Failed to compile code' },
          timestamp: new Date()
        })
        setIsProcessing(false)
      }, 100)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSave = async () => {
    setIsLoading(true)
    setIsProcessing(true)
    try {
      // Use the same save approach as the compile function
      const response = await fetch('/api/challenge/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code,
          courseId,
          lessonId: lesson.id
        })
      })
      
      const result = await response.json()
      
      // Add a small delay to prevent jarring transitions
      setTimeout(() => {
        setOutputContent({
          type: 'save',
          content: result.success ? {
            message: 'Code saved successfully',
            savedAt: result.savedAt || new Date().toISOString()
          } : {
            message: result.error || 'Failed to save code'
          },
          timestamp: new Date()
        })
        setIsProcessing(false)
      }, 100)
    } catch (error) {
      setTimeout(() => {
        setOutputContent({
          type: 'error',
          content: { message: 'Failed to save code' },
          timestamp: new Date()
        })
        setIsProcessing(false)
      }, 100)
    } finally {
      setIsLoading(false)
    }
  }

  const handleTest = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/challenge/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code,
          courseId,
          lessonId: lesson.id
        })
      })

      const result = await response.json()
      setOutputContent({
        type: 'test',
        content: result,
        timestamp: new Date()
      })
    } catch (error) {
      setOutputContent({
        type: 'error',
        content: { message: 'Failed to run tests' },
        timestamp: new Date()
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleReset = async () => {
    setShowResetConfirm(true)
  }

  const confirmReset = async () => {
    setIsLoading(true)
    setShowResetConfirm(false)
    
    try {
      const response = await fetch('/api/challenge/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          courseId,
          lessonId: lesson.id
        })
      })
      
      const result = await response.json()
      
      if (response.ok) {
        // Reset successful - load the initial code
        setCode(lesson.initialCode || getDefaultSolidityTemplate())
        setOutputContent({
          type: 'save',
          content: { message: result.message },
          timestamp: new Date()
        })
      } else {
        setOutputContent({
          type: 'error',
          content: { message: result.error || 'Failed to reset code' },
          timestamp: new Date()
        })
      }
    } catch (error) {
      setOutputContent({
        type: 'error',
        content: { message: 'Failed to reset code' },
        timestamp: new Date()
      })
    } finally {
      setIsLoading(false)
    }
  }

  const cancelReset = () => {
    setShowResetConfirm(false)
  }

  // Chat functionality
  const handleSendMessage = async () => {
    if (!chatInput.trim() || isLoadingChat) return

    const userMessage = chatInput.trim()
    setChatInput('')
    setIsLoadingChat(true)

    // Add user message to chat
    const newUserMessage = { role: 'user' as const, content: userMessage, timestamp: new Date() }
    setChatMessages(prev => [...prev, newUserMessage])

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage,
          courseId,
          lessonId: lesson.id,
          currentCode: code,
          chatHistory: chatMessages
        })
      })

      const data = await response.json()

      if (response.ok) {
        // Add AI response to chat
        const aiMessage = { role: 'assistant' as const, content: data.response, timestamp: new Date() }
        setChatMessages(prev => [...prev, aiMessage])
      } else {
        // Add error message to chat
        const errorMessage = { role: 'assistant' as const, content: `Sorry, I encountered an error: ${data.error}`, timestamp: new Date() }
        setChatMessages(prev => [...prev, errorMessage])
      }
    } catch (error) {
      const errorMessage = { role: 'assistant' as const, content: 'Sorry, I encountered a network error. Please try again.', timestamp: new Date() }
      setChatMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoadingChat(false)
    }
  }

  // Auto-scroll to bottom when new messages are added
  useEffect(() => {
    if (chatMessagesRef.current) {
      chatMessagesRef.current.scrollTop = chatMessagesRef.current.scrollHeight
    }
  }, [chatMessages, isLoadingChat])

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  // Check user subscription status
  const checkSubscriptionStatus = async () => {
    try {
      const response = await fetch('/api/user/subscription-status')
      const data = await response.json()
      setHasActiveSubscription(data.hasActiveSubscription || false)
    } catch (error) {
      setHasActiveSubscription(false)
    }
  }

  // Refresh subscription status (can be called after payment)
  const refreshSubscriptionStatus = async () => {
    await checkSubscriptionStatus()
  }


  // Initialize project when component mounts
  const initializeProject = async () => {
    if (isInitializing || initializationAttempted.current) return // Prevent multiple initializations
    
    setIsInitializing(true)
    setInitializationStatus({
      initialized: false,
      ready: false,
      message: 'Checking development environment...'
    })

    try {
      const response = await fetch('/api/challenge/initialize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lessonId: lesson.id,
          userId: session?.user?.id
        })
      })

      const result = await response.json()
      
      if (response.ok) {
        setInitializationStatus({
          initialized: result.initialized,
          ready: result.ready,
          message: result.message,
          missingComponents: result.missingComponents
        })
        
        if (result.ready) {
        } else if (result.initialized) {
        } else {
        }
      } else {
        setInitializationStatus({
          initialized: false,
          ready: false,
          message: result.error || 'Failed to initialize development environment'
        })
      }
    } catch (error) {
      setInitializationStatus({
        initialized: false,
        ready: false,
        message: 'Failed to initialize development environment'
      })
    } finally {
      setIsInitializing(false)
      initializationAttempted.current = true
    }
  }

  // Load user progress and initialize project on component mount
  useEffect(() => {
    const loadProgressAndInitialize = async () => {
      try {
        // For authenticated users, wait for progress to load before setting code
        if (session?.user?.id) {
          // Don't set code here - let the progress loading handle it
          Promise.all([
          ])
        } else {
          // For anonymous users, use initial code immediately
          setCode(lesson.initialCode || getDefaultSolidityTemplate())
          setIsLoadingCode(false)
        }
        
      } catch (error) {
        // Fallback to admin's initial code on error
        setCode(lesson.initialCode || getDefaultSolidityTemplate())
        setIsLoadingCode(false)
      }
    }
    loadProgressAndInitialize()
  }, [courseId, lesson.id]) // Removed session dependency to prevent re-running on login

  // Load saved code when progress data is available, or initial code if no progress
  useEffect(() => {
    if (session?.user?.id) {
      if (studentProgress?.codeContent) {
        setCode(studentProgress.codeContent)
        setIsLoadingCode(false)
      } else if (studentProgress !== null && !progressLoading) {
        // Progress loaded but no saved code, use initial code
        setCode(lesson.initialCode || getDefaultSolidityTemplate())
        setIsLoadingCode(false)
      }
    }
  }, [studentProgress?.codeContent, studentProgress, progressLoading, session?.user?.id, lesson.initialCode])

  useEffect(() => {
    // Trigger resize when panel states change with immediate response
    triggerEditorResize()
  }, [leftPanelCollapsed, rightPanelCollapsed, leftPanelWidth, rightPanelWidth, triggerEditorResize])

  // Periodically check subscription status (every 30 seconds)
  useEffect(() => {
    const interval = setInterval(() => {
      if (hasActiveSubscription === false) {
        checkSubscriptionStatus()
      }
    }, 30000) // Check every 30 seconds if user doesn't have subscription

    return () => clearInterval(interval)
  }, [hasActiveSubscription])

  return (
    <div className="h-screen bg-gray-50 dark:bg-gray-900 w-full overflow-hidden flex flex-col">
      {/* Top Navigation Bar */}
      <div className="bg-slate-800 border-b border-slate-700 px-8 py-4 w-full flex-shrink-0">
        <div className="w-full">
          <div className="flex items-center justify-between">
            {/* Breadcrumbs */}
            <nav className="text-sm text-gray-200">
              <button
                onClick={() => router.push(`/courses/${courseId}?expandedModule=${lesson.module.id}`)}
                className="text-yellow-400 hover:text-yellow-300 font-medium transition-colors"
              >
                ← Back to Course
              </button>
              <span className="mx-2 text-gray-400">›</span>
              <span className="text-gray-200">{lesson.module.course.title}</span>
              <span className="mx-2 text-gray-400">›</span>
              <span className="text-gray-200">{lesson.module.title}</span>
              <span className="mx-2 text-gray-400">›</span>
              <span className="text-yellow-400 font-medium">{lesson.title}</span>
            </nav>
            
            {/* Save Status */}
            {isSavingProgress && (
              <div className="flex items-center space-x-2 text-sm">
                <span className="text-blue-400">Saving...</span>
              </div>
            )}

            {/* Progress and Navigation */}
            <div className="flex items-center space-x-6">
              {lesson.progress?.completed && (
                <div className="flex items-center space-x-2 text-green-400">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-sm font-medium">Completed</span>
                </div>
              )}

              {/* Navigation Controls */}
              <div className="flex items-center space-x-1 bg-slate-700 rounded-lg px-3 py-2">
                {/* Previous Lesson */}
                {lesson.navigation.previousLesson && (
                  <button
                    onClick={() => navigateToLesson(lesson.navigation.previousLesson!.id)}
                    className="flex items-center space-x-1 text-gray-300 hover:text-white transition-colors text-sm px-2 py-1 rounded hover:bg-slate-600"
                  >
                    <span>&lt;</span>
                    <span>Previous</span>
                  </button>
                )}

                {/* Separator */}
                {lesson.navigation.previousLesson && (
                  <div className="w-px h-4 bg-gray-500 mx-2"></div>
                )}

                {/* Lesson Counter */}
                <div className="text-sm text-gray-200 font-medium px-2">
                  {lesson.navigation.currentIndex + 1} / {lesson.navigation.totalLessons}
                </div>

                {/* Separator */}
                {lesson.navigation.nextLesson && (
                  <div className="w-px h-4 bg-gray-500 mx-2"></div>
                )}

                {/* Next Lesson */}
                {lesson.navigation.nextLesson && (
                  <button
                    onClick={() => navigateToLesson(lesson.navigation.nextLesson!.id)}
                    className="flex items-center space-x-1 text-gray-300 hover:text-white transition-colors text-sm px-2 py-1 rounded hover:bg-slate-600"
                  >
                    <span>Next</span>
                    <span>&gt;</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content - Three Panel Layout */}
      <div className="flex flex-1 min-h-0 w-full overflow-hidden will-change-auto" ref={containerRef}>
        {/* Left Panel - Instructions (Collapsible) */}
        <div className={`${leftPanelCollapsed ? 'w-12' : ''} ${isResizing ? 'pointer-events-none' : 'transition-[width] duration-200 ease-out'} bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col min-w-0 h-full overflow-hidden flex-shrink-0`} style={{ width: leftPanelCollapsed ? '48px' : `${leftPanelWidth}%`, minWidth: leftPanelCollapsed ? '48px' : '150px', maxWidth: leftPanelCollapsed ? '48px' : '70%' }}>
          {/* Panel Header */}
          <div className="flex items-center justify-between p-3 border-b border-gray-200 dark:border-gray-700">
            
            {!leftPanelCollapsed && (
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white">Instructions</h3>
            )}
            <button
              onClick={() => {
                setLeftPanelCollapsed(!leftPanelCollapsed)
                // Trigger immediate resize
                setTimeout(immediateResize, 10)
              }}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <svg 
                className={`w-5 h-5 text-gray-500 transition-transform ${leftPanelCollapsed ? 'rotate-180' : ''}`}
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          </div>

          {/* Instructions Content */}
          {!leftPanelCollapsed && (
            <div className="flex-1 overflow-y-auto p-4">
              {lesson.contentMarkdown && (
                <div className="prose prose-lg max-w-none dark:prose-invert prose-headings:text-white prose-a:text-yellow-500 prose-strong:text-gray-800 dark:prose-strong:text-gray-200 prose-code:text-gray-800 dark:prose-code:text-gray-200">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    rehypePlugins={[]}
                    skipHtml={false}
                    allowElement={(element, index, parent) => {
                      return true
                    }}
                    components={{
                      h1: ({ children }) => (
                        <h1 className="text-2xl font-bold text-blue-800 dark:text-blue-300 mb-4 mt-2">
                          {children}
                        </h1>
                      ),
                      h2: ({ children }) => (
                        <h2 className="text-xl font-semibold text-blue-800 dark:text-blue-300 mb-3 mt-4">
                          {children}
                        </h2>
                      ),
                      h3: ({ children }) => (
                        <h3 className="text-lg font-semibold text-blue-800 dark:text-blue-300 mb-2 mt-3">
                          {children}
                        </h3>
                      ),
                      p: ({ children }) => (
                        <p className="mb-3 text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                          {children}
                        </p>
                      ),
                      ul: ({ children }) => (
                        <ul className="list-disc list-outside mb-3 text-sm text-gray-700 dark:text-gray-300 space-y-1 ml-6">
                          {children}
                        </ul>
                      ),
                      ol: ({ children }) => (
                        <ol className="list-decimal list-outside mb-3 text-sm text-gray-700 dark:text-gray-300 space-y-1 ml-6">
                          {children}
                        </ol>
                      ),
                      li: ({ children }) => (
                        <li className="mb-1 text-sm leading-relaxed text-gray-700 dark:text-gray-300">
                          {children}
                        </li>
                      ),
                      blockquote: ({ children }) => (
                        <blockquote className="border-l-4 border-yellow-500 pl-4 py-2 mb-4 bg-yellow-50 text-gray-600 italic">
                          {children}
                        </blockquote>
                      ),
                      code: ({ children, className }) => {
                        const isInline = !className
                        if (isInline) {
                          return (
                            <code className="bg-gray-700 text-gray-200 px-1.5 py-0.5 rounded text-xs font-mono">
                              {children}
                            </code>
                          )
                        }
                        
                        const copyToClipboard = async () => {
                          try {
                            const codeText = typeof children === 'string' ? children : String(children)
                            await navigator.clipboard.writeText(codeText)
                            // You could add a toast notification here
                          } catch (err) {
                          }
                        }
                        
                        // Check if this is a Solidity code block
                        const language = className?.replace('language-', '') || 'text'
                        const codeString = typeof children === 'string' ? children : String(children)
                        
                        if (language === 'solidity') {
                          // Convert mathematical symbols back to operators first
                          let processedCode = codeString
                          processedCode = processedCode.replace(/≠/g, '!=')  // Not equal
                          processedCode = processedCode.replace(/≤/g, '<=')  // Less than or equal
                          processedCode = processedCode.replace(/≥/g, '>=')  // Greater than or equal
                          processedCode = processedCode.replace(/⇒/g, '=>')  // Arrow function
                          processedCode = processedCode.replace(/→/g, '->')  // Arrow
                          processedCode = processedCode.replace(/←/g, '<-')  // Left arrow
                          processedCode = processedCode.replace(/∧/g, '&&')  // Logical AND
                          processedCode = processedCode.replace(/∨/g, '||')  // Logical OR
                          
                          // Use the same highlighting approach as the admin preview
                          const highlightText = (text: string) => {
                            let highlighted = text;
                            
                            // Process line by line to avoid conflicts
                            const lines = highlighted.split('\n');
                            const processedLines = lines.map((line: string, index: number) => {
                              let processedLine = line;
                              
                              // Handle comments first (single line and multi-line)
                              processedLine = processedLine.replace(/(\/\/.*$)/g, '<span class="text-gray-500 dark:text-gray-400 italic">$1</span>');
                              processedLine = processedLine.replace(/(\/\*[\s\S]*?\*\/)/g, '<span class="text-gray-500 dark:text-gray-400 italic">$1</span>');
                              
                              // Handle strings (but not if they're inside comments)
                              if (!processedLine.includes('<span class="text-gray-500')) {
                                processedLine = processedLine.replace(/(".*?")/g, '<span class="text-green-400">$1</span>');
                                processedLine = processedLine.replace(/('.*?')/g, '<span class="text-green-400">$1</span>');
                              }
                              
                              // Handle numbers (but not if they're inside strings or comments)
                              if (!processedLine.includes('<span class="text-green-400') && !processedLine.includes('<span class="text-gray-500')) {
                                processedLine = processedLine.replace(/\b(\d+\.?\d*)\b/g, '<span class="text-blue-300">$1</span>');
                              }
                              
                              // Handle Solidity keywords (but not if they're inside strings or comments)
                              if (!processedLine.includes('<span class="text-green-400') && !processedLine.includes('<span class="text-gray-500')) {
                                const keywords = [
                                  'contract', 'pragma', 'solidity', 'function', 'modifier', 'event', 'struct', 'enum',
                                  'mapping', 'address', 'uint', 'uint8', 'uint16', 'uint32', 'uint64', 'uint128', 'uint256',
                                  'int', 'int8', 'int16', 'int32', 'int64', 'int128', 'int256', 'bool', 'string', 'bytes',
                                  'bytes1', 'bytes2', 'bytes4', 'bytes8', 'bytes16', 'bytes32',
                                  'public', 'private', 'internal', 'external', 'pure', 'view', 'payable', 'nonpayable',
                                  'memory', 'storage', 'calldata', 'constant', 'immutable',
                                  'if', 'else', 'for', 'while', 'do', 'break', 'continue', 'return', 'try', 'catch',
                                  'require', 'assert', 'revert', 'throw',
                                  'msg', 'tx', 'block', 'now', 'this', 'super',
                                  'wei', 'gwei', 'ether', 'seconds', 'minutes', 'hours', 'days', 'weeks', 'years',
                                  'true', 'false', 'null', 'undefined'
                                ];
                                
                                keywords.forEach(keyword => {
                                  const regex = new RegExp(`\\b(${keyword})\\b`, 'g');
                                  processedLine = processedLine.replace(regex, '<span class="text-blue-400 font-semibold">$1</span>');
                                });
                              }
                              
                              return processedLine;
                            });
                            
                            return processedLines.join('\n');
                          }
                          
                          return (
                            <div className="relative group">
                              <pre className="bg-slate-900 text-gray-100 p-4 rounded-lg overflow-x-auto mb-4 shadow-lg font-mono text-xs leading-relaxed">
                                <code 
                                  className={className}
                                  dangerouslySetInnerHTML={{ __html: highlightText(processedCode) }}
                                />
                              </pre>
                              <button
                                onClick={copyToClipboard}
                                className="absolute top-2 right-2 p-2 bg-gray-700 hover:bg-gray-600 text-gray-300 hover:text-white rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-200"
                                title="Copy code"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                </svg>
                              </button>
                            </div>
                          )
                        }
                        
                        return (
                          <div className="relative group">
                            <pre className="bg-slate-900 text-gray-100 p-4 rounded-lg overflow-x-auto mb-4 shadow-lg font-mono text-xs leading-relaxed">
                              <code className={className}>
                                {children}
                              </code>
                            </pre>
                            <button
                              onClick={copyToClipboard}
                              className="absolute top-2 right-2 p-2 bg-gray-700 hover:bg-gray-600 text-gray-300 hover:text-white rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-200"
                              title="Copy code"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                              </svg>
                            </button>
                          </div>
                        )
                      },
                      table: ({ children }) => (
                        <div className="overflow-x-auto mb-4">
                          <table className="min-w-full border border-gray-300 dark:border-gray-600">
                            {children}
                          </table>
                        </div>
                      ),
                      thead: ({ children }) => (
                        <thead className="bg-gray-50 dark:bg-gray-700">
                          {children}
                        </thead>
                      ),
                      tbody: ({ children }) => (
                        <tbody className="bg-white dark:bg-gray-800">
                          {children}
                        </tbody>
                      ),
                      tr: ({ children }) => (
                        <tr className="border-b border-gray-200 dark:border-gray-600">
                          {children}
                        </tr>
                      ),
                      th: ({ children }) => (
                        <th className="px-4 py-2 text-left text-sm font-medium text-gray-900 dark:text-white">
                          {children}
                        </th>
                      ),
                      td: ({ children }) => (
                        <td className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300">
                          {children}
                        </td>
                      ),
                    }}
                  >
                    {cleanMarkdown(lesson.contentMarkdown)}
                  </ReactMarkdown>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Resize Handle - Left */}
        {!leftPanelCollapsed && (
          <div 
            className="w-1 bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-500 cursor-col-resize transition-colors flex-shrink-0"
            onMouseDown={() => handleMouseDown('left')}
          />
        )}

        {/* Center Panel - Code Editor (Wider) */}
        <div className="flex-1 bg-white dark:bg-gray-800 flex flex-col min-w-0 h-full overflow-hidden" style={{ minWidth: '300px' }}>
          {/* Editor Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white">Solidity Editor</h3>
            <div className="flex items-center space-x-2">
              <button 
                onClick={handleCompile}
                disabled={isLoading}
                className="px-3 py-1 bg-slate-700 text-white rounded text-sm font-medium hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed min-w-[100px]"
              >
                {isLoading ? 'Compiling...' : 'Compile'}
              </button>
              <button 
                onClick={handleTest}
                disabled={isLoading}
                className="px-3 py-1 bg-emerald-700 text-white rounded text-sm font-medium hover:bg-emerald-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed min-w-[80px]"
              >
                Test
              </button>
              <button 
                onClick={handleReset}
                disabled={isLoading}
                className="px-3 py-1 bg-amber-700 text-white rounded text-sm font-medium hover:bg-amber-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed min-w-[80px]"
              >
                Reset
              </button>
              <button 
                onClick={handleSave}
                disabled={isLoading}
                className="px-3 py-1 bg-indigo-700 text-white rounded text-sm font-medium hover:bg-indigo-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed min-w-[80px]"
              >
                {isLoading ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>

          {/* Initialization status banner - only show for authenticated users */}
          {isInitializing && session?.user?.id && (
            <div className="bg-blue-50 dark:bg-blue-900/20 border-b border-blue-200 dark:border-blue-800 p-3">
              <div className="flex items-center space-x-3">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                <span className="text-blue-700 dark:text-blue-300 text-sm font-medium">
                  {initializationStatus?.message || 'Setting up development environment...'}
                </span>
              </div>
            </div>
          )}
          
          {/* Initialization error banner */}
          {!isInitializing && initializationStatus && !initializationStatus.ready && initializationStatus.message.includes('Failed') && (
            <div className="bg-red-50 dark:bg-red-900/20 border-b border-red-200 dark:border-red-800 p-3">
              <div className="flex items-center space-x-3">
                <div className="w-4 h-4 bg-red-500 rounded-full flex items-center justify-center">
                  <svg className="w-2 h-2 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </div>
                <span className="text-red-700 dark:text-red-300 text-sm font-medium">
                  {initializationStatus.message}
                </span>
              </div>
            </div>
          )}

          {/* Code Editor Area */}
          <div className="flex-1 p-4 flex flex-col">
            <div className="flex-1 border border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden relative">
              {isLoadingCode ? (
                <div className="flex items-center justify-center h-full bg-gray-50 dark:bg-gray-800">
                  <div className="flex flex-col items-center space-y-3">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    <span className="text-gray-600 dark:text-gray-400 text-sm">Loading your progress...</span>
                  </div>
                </div>
              ) : (
                <SolidityEditor
                  value={code}
                  onChange={handleCodeChange}
                  height="100%"
                  className="h-full"
                  onResizeTrigger={triggerEditorResize}
                  clearSelectionOnValueChange={true}
                />
              )}
              
              {/* Reset Confirmation Dialog */}
              {showResetConfirm && (
                <div className="absolute inset-0 bg-gray-900 bg-opacity-20 flex items-center justify-center z-40">
                  <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 p-5 max-w-sm w-full mx-4">
                    <div className="flex items-center mb-3">
                      <div className="w-8 h-8 bg-amber-100 dark:bg-amber-900 rounded-full flex items-center justify-center mr-3">
                        <svg className="w-5 h-5 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                        </svg>
                      </div>
                      <h3 className="text-base font-semibold text-gray-900 dark:text-white">Reset Code?</h3>
                    </div>
                    
                    <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
                      This will restore the original lesson code and clear your progress.
                    </p>
                    
                    <div className="flex space-x-2">
                      <button
                        onClick={cancelReset}
                        className="flex-1 px-3 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors text-sm"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={confirmReset}
                        disabled={isLoading}
                        className="flex-1 px-3 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                      >
                        {isLoading ? 'Resetting...' : 'Reset'}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Resize Handle - Right */}
        {!rightPanelCollapsed && (
          <div 
            className="w-1 bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-500 cursor-col-resize transition-colors flex-shrink-0"
            onMouseDown={() => handleMouseDown('right')}
          />
        )}

        {/* Right Panel - Output/Chat (Collapsible) */}
        <div className={`${rightPanelCollapsed ? 'w-12' : ''} ${isResizing ? 'pointer-events-none' : 'transition-[width] duration-200 ease-out'} bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 flex flex-col min-w-0 h-full overflow-hidden flex-shrink-0 will-change-auto`} style={{ width: rightPanelCollapsed ? '48px' : `${rightPanelWidth}%`, minWidth: rightPanelCollapsed ? '48px' : '150px', maxWidth: rightPanelCollapsed ? '48px' : '50%', height: '100%' }}>
          {/* Panel Header */}
          <div className="flex items-center justify-between p-3 border-b border-gray-200 dark:border-gray-700">
            {!rightPanelCollapsed && (
              <div className="flex items-center space-x-4">
                <h3 className="text-lg font-semibold text-gray-800 dark:text-white">Output</h3>
                <div className="flex space-x-1">
                  <button
                    onClick={() => setActiveRightTab('output')}
                    className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                      activeRightTab === 'output'
                        ? 'bg-yellow-500 text-black'
                        : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                    }`}
                  >
                    Output
                  </button>
                  <button
                    onClick={() => setActiveRightTab('chat')}
                    className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                      activeRightTab === 'chat'
                        ? 'bg-yellow-500 text-black'
                        : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                    }`}
                  >
                    Chat
                  </button>
                </div>
              </div>
            )}
            <button
              onClick={() => {
                setRightPanelCollapsed(!rightPanelCollapsed)
                // Trigger immediate resize
                setTimeout(immediateResize, 10)
              }}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <svg 
                className={`w-5 h-5 text-gray-500 transition-transform ${rightPanelCollapsed ? 'rotate-180' : ''}`}
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          {/* Content */}
          {!rightPanelCollapsed && (
            <div className="flex-1 flex flex-col h-full min-h-0 overflow-hidden will-change-auto">
              {activeRightTab === 'output' ? (
                <div className="flex-1 overflow-y-auto p-4 will-change-auto">
                  {isProcessing ? (
                    <div className="flex items-center justify-center min-h-[200px]">
                      <div className="flex items-center space-x-2">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-yellow-500"></div>
                        <span className="text-sm text-gray-600 dark:text-gray-400">Processing...</span>
                      </div>
                    </div>
                  ) : outputContent ? (
                    <div className="space-y-4 will-change-auto min-h-[200px] transition-all duration-200 ease-out transform-gpu">
                       <div className="flex items-center justify-between">
                         <h4 className="text-sm font-medium text-gray-800 dark:text-white">
                           {outputContent.type === 'compile' && 'Compilation Results'}
                           {outputContent.type === 'save' && 'Save Results'}
                           {outputContent.type === 'test' && 'Test Results'}
                           {outputContent.type === 'error' && 'Error'}
                         </h4>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {outputContent.timestamp.toLocaleTimeString()}
                        </span>
                      </div>
                      
                      {outputContent.type === 'compile' && (
                        <div className="space-y-3 transform-gpu">
                          {outputContent.content.success ? (
                            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 p-4 rounded-lg">
                              {/* Header with status and timing */}
                              <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                  <span className="text-green-600 dark:text-green-400">✅</span>
                                  <span className="font-semibold text-green-800 dark:text-green-200">
                                    Compilation Successful
                                  </span>
                                </div>
                                {outputContent.content.compilationTime && (
                                  <div className="text-xs text-gray-500 dark:text-gray-400">
                                    {outputContent.content.compilationTime}ms
                                  </div>
                                )}
                              </div>

                              {/* Compilation details */}
                              {outputContent.content.message && (
                                <div className="mb-3 text-sm text-green-700 dark:text-green-300">
                                  {outputContent.content.message}
                                </div>
                              )}

                              {/* Artifacts information */}
                              {outputContent.content.artifacts && outputContent.content.artifacts.length > 0 && (
                                <div className="mb-3">
                                  <div className="font-medium mb-1 text-green-800 dark:text-green-200">📁 Compiled Files:</div>
                                  <div className="ml-4 space-y-1">
                                    {outputContent.content.artifacts.map((artifact: any, index: number) => (
                                      <div key={index} className="text-xs text-green-600 dark:text-green-400">
                                        • {artifact.file} ({artifact.status})
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Contracts information */}
                              {outputContent.content.contracts && outputContent.content.contracts.length > 0 && (
                                <div className="mb-3">
                                  <div className="font-medium mb-1 text-green-800 dark:text-green-200">📄 Contracts:</div>
                                  <div className="ml-4 space-y-1">
                                    {outputContent.content.contracts.map((contract: any, index: number) => (
                                      <div key={index} className="text-xs text-green-600 dark:text-green-400">
                                        • {contract.count} contract(s) compiled successfully
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                            </div>
                          ) : (
                            <div className="space-y-2">
                              {outputContent.content.errors?.map((error: any, index: number) => (
                                <div key={index} className="bg-red-50 dark:bg-red-900 p-3 rounded-lg">
                                <div className="text-sm text-red-800 dark:text-red-200 font-medium">
                                  Error {index + 1}: {error.message}
                                </div>
                                {error.line > 0 && (
                                  <div className="text-xs text-red-700 dark:text-red-300 mt-1">
                                    Line {error.line}, Column {error.column}
                                  </div>
                                )}
                                {error.suggestions && error.suggestions.length > 0 && (
                                  <div className="mt-2">
                                    <div className="text-xs text-red-700 dark:text-red-300 font-medium">Suggestions:</div>
                                    <ul className="text-xs text-red-600 dark:text-red-400 mt-1 space-y-1">
                                      {error.suggestions.map((suggestion: string, suggestionIndex: number) => (
                                        <li key={suggestionIndex}>• {suggestion}</li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                              </div>
                              ))}
                            </div>
                          )}
                          
                          {outputContent.content.warnings?.length > 0 && (
                            <div className="space-y-2">
                              <div className="text-sm font-medium text-yellow-800 dark:text-yellow-200 mb-2">
                                ⚠️ Warnings ({outputContent.content.warnings.length})
                              </div>
                              {outputContent.content.warnings.map((warning: any, index: number) => (
                                <div key={index} className="bg-yellow-50 dark:bg-yellow-900 border border-yellow-200 dark:border-yellow-700 p-3 rounded-lg">
                                  <div className="text-sm text-yellow-800 dark:text-yellow-200 font-medium">
                                    Warning {index + 1}: {warning.message}
                                  </div>
                                  {warning.line > 0 && (
                                    <div className="text-xs text-yellow-700 dark:text-yellow-300 mt-1">
                                      Line {warning.line}, Column {warning.column}
                                    </div>
                                  )}
                                  {warning.suggestions && warning.suggestions.length > 0 && (
                                    <div className="mt-2">
                                      <div className="text-xs text-yellow-700 dark:text-yellow-300 font-medium">Suggestions:</div>
                                      <ul className="text-xs text-yellow-600 dark:text-yellow-400 mt-1 space-y-1">
                                        {warning.suggestions.map((suggestion: string, suggestionIndex: number) => (
                                          <li key={suggestionIndex}>• {suggestion}</li>
                                        ))}
                                      </ul>
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                      
                       {outputContent.type === 'save' && (
                         <div className="bg-green-50 dark:bg-green-900 p-3 rounded-lg">
                           <div className="text-sm text-green-800 dark:text-green-200">
                             ✅ {outputContent.content.message}
                           </div>
                           <div className="text-xs text-green-700 dark:text-green-300 mt-1">
                             Saved at: {outputContent.content.savedAt ? new Date(outputContent.content.savedAt).toLocaleString() : 'Just now'}
                           </div>
                         </div>
                       )}

                      {outputContent.type === 'test' && (
                        <div className="space-y-3 transform-gpu">
                           {outputContent.content.success ? (
                             <div className="bg-green-50 dark:bg-green-900 p-3 rounded-lg">
                               <div className="text-sm text-green-800 dark:text-green-200">
                                 ✅ {outputContent.content.message}
                               </div>
                               <div className="text-xs text-green-700 dark:text-green-300 mt-1">
                                 Contract: {outputContent.content.contractName}
                               </div>
                               <div className="text-xs text-green-700 dark:text-green-300">
                                 Test File: {outputContent.content.testFileName}
                               </div>
                             </div>
                           ) : (
                             <div className="bg-red-50 dark:bg-red-900 p-3 rounded-lg">
                               <div className="text-sm text-red-800 dark:text-red-200">
                                 ❌ {outputContent.content.message}
                               </div>
                               {outputContent.content.error && (
                                 <div className="text-xs text-red-700 dark:text-red-300 mt-1">
                                   Error: {outputContent.content.error}
                                 </div>
                               )}
                             </div>
                           )}

                           {outputContent.content.result && (
                             <div className="space-y-2">
                               <div className="bg-blue-50 dark:bg-blue-900 p-3 rounded-lg">
                                 <div className="text-sm text-blue-800 dark:text-blue-200 font-medium">
                                   Test Summary
                                 </div>
                                 <div className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                                   {outputContent.content.result.totalTests > 0 && `Total: ${outputContent.content.result.totalTests}`}
                                   {outputContent.content.result.totalTests > 0 && outputContent.content.result.passedTests > 0 && ' | '}
                                   {outputContent.content.result.passedTests > 0 && `Passed: ${outputContent.content.result.passedTests}`}
                                   {(outputContent.content.result.totalTests > 0 || outputContent.content.result.passedTests > 0) && outputContent.content.result.failedTests > 0 && ' | '}
                                   {outputContent.content.result.failedTests > 0 && `Failed: ${outputContent.content.result.failedTests}`}
                                 </div>
                               </div>

                               {outputContent.content.result.testResults && outputContent.content.result.testResults.length > 0 && (
                                 <div className="max-h-[60vh] overflow-y-auto space-y-2 pr-2 border border-gray-200 dark:border-gray-700 rounded-lg p-2 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600 scrollbar-track-gray-100 dark:scrollbar-track-gray-800">
                                   {outputContent.content.result.testResults.length > 10 && (
                                     <div className="text-xs text-gray-500 dark:text-gray-400 mb-2 text-center">
                                       Scroll to see all {outputContent.content.result.testResults.length} tests
                                     </div>
                                   )}
                                   {outputContent.content.result.testResults.map((test: any, index: number) => (
                                     <div key={index} className={`p-3 rounded-lg ${
                                       test.success 
                                         ? 'bg-green-50 dark:bg-green-900' 
                                         : 'bg-red-50 dark:bg-red-900'
                                     }`}>
                                       <div className={`text-sm font-medium ${
                                         test.success 
                                           ? 'text-green-800 dark:text-green-200' 
                                           : 'text-red-800 dark:text-red-200'
                                       }`}>
                                         {test.success ? '✅' : '❌'} {test.name}
                                       </div>
                                       <div className={`text-xs mt-1 ${
                                         test.success 
                                           ? 'text-green-700 dark:text-green-300' 
                                           : 'text-red-700 dark:text-red-300'
                                       }`}>
                                         Status: {test.status} | Gas: {test.gas} | Duration: {test.duration}
                                       </div>
                                       {test.reason && (
                                         <div className="text-xs text-red-600 dark:text-red-400 mt-1">
                                           Reason: {test.reason}
                                         </div>
                                       )}
                                       {test.logs && test.logs.length > 0 && (
                                         <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                                           Logs: {test.logs.join(', ')}
                                         </div>
                                       )}
                                     </div>
                                   ))}
                                 </div>
                               )}

                               {outputContent.content.result.errors && outputContent.content.result.errors.length > 0 && (
                                 <div className="space-y-2">
                                   {outputContent.content.result.errors.map((error: any, index: number) => (
                                     <div key={index} className="bg-red-50 dark:bg-red-900 p-3 rounded-lg">
                                       <div className="text-sm text-red-800 dark:text-red-200">
                                         ❌ {error.message}
                                       </div>
                                       {error.type && (
                                         <div className="text-xs text-red-700 dark:text-red-300 mt-1">
                                           Type: {error.type}
                                         </div>
                                       )}
                                     </div>
                                   ))}
                                 </div>
                               )}
                             </div>
                           )}
                         </div>
                       )}
                      
                      {outputContent.type === 'error' && (
                        <div className="bg-red-50 dark:bg-red-900 p-3 rounded-lg">
                          <div className="text-sm text-red-800 dark:text-red-200">
                            ❌ {outputContent.content.message}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center text-gray-500 dark:text-gray-400 py-8">
                      <div className="text-4xl mb-2">📝</div>
                      <div className="text-sm">No output yet</div>
                      <div className="text-xs mt-1">Compile or save your code to see results here</div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex-1 flex flex-col h-full min-h-0">
                  {/* Chat Messages */}
                  <div ref={chatMessagesRef} className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0 max-h-[calc(100%-80px)]">
                    {chatMessages.length === 0 ? (
                      <>
                        <div className="bg-blue-50 dark:bg-blue-900 p-3 rounded-lg">
                          <div className="text-sm text-blue-800 dark:text-blue-200">
                            👋 Hi! I'm your AI Solidity tutor. I can help you with:
                          </div>
                          <ul className="text-xs text-blue-700 dark:text-blue-300 mt-2 space-y-1">
                            <li>• Understanding Solidity concepts</li>
                            <li>• Debugging your code</li>
                            <li>• Explaining error messages</li>
                            <li>• Code optimization tips</li>
                          </ul>
                        </div>
                        
                        <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
                          <div className="text-sm text-gray-800 dark:text-gray-200">
                            💡 <strong>Tip:</strong> I can see your current code and the lesson instructions. Ask me anything!
                          </div>
                        </div>
                      </>
                    ) : (
                      chatMessages.map((message, index) => (
                        <div key={index} className="w-full mb-4">
                          <div className={`w-full p-4 rounded-lg ${
                            message.role === 'user' 
                              ? 'bg-yellow-500 text-black' 
                              : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
                          }`}>
                            <div className="text-sm leading-relaxed">
                              {message.role === 'assistant' ? (
                                <ReactMarkdown
                                  remarkPlugins={[remarkGfm]}
                                  components={{
                                    code: ({ children, className }) => {
                                      const isInline = !className
                                      if (isInline) {
                                        return (
                                          <code className="bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200 px-1.5 py-0.5 rounded text-xs font-mono">
                                            {children}
                                          </code>
                                        )
                                      }
                                      
                                      const language = className?.replace('language-', '') || 'text'
                                      
                                      return (
                                        <div className="relative group my-2">
                                          <pre className="bg-slate-900 text-gray-100 p-3 rounded-lg overflow-x-auto shadow-lg font-mono text-xs leading-relaxed">
                                            <code className={className}>
                                              {children}
                                            </code>
                                          </pre>
                                        </div>
                                      )
                                    },
                                    p: ({ children }) => (
                                      <p className="mb-2 text-gray-800 dark:text-gray-200">
                                        {children}
                                      </p>
                                    ),
                                    ul: ({ children }) => (
                                      <ul className="list-disc list-outside mb-2 text-gray-800 dark:text-gray-200 space-y-1 ml-4">
                                        {children}
                                      </ul>
                                    ),
                                    ol: ({ children }) => (
                                      <ol className="list-decimal list-outside mb-2 text-gray-800 dark:text-gray-200 space-y-1 ml-4">
                                        {children}
                                      </ol>
                                    ),
                                    li: ({ children }) => (
                                      <li className="text-gray-800 dark:text-gray-200">
                                        {children}
                                      </li>
                                    ),
                                    strong: ({ children }) => (
                                      <strong className="font-semibold text-gray-900 dark:text-gray-100">
                                        {children}
                                      </strong>
                                    ),
                                    em: ({ children }) => (
                                      <em className="italic text-gray-700 dark:text-gray-300">
                                        {children}
                                      </em>
                                    )
                                  }}
                                >
                                  {message.content}
                                </ReactMarkdown>
                              ) : (
                                <div className="whitespace-pre-wrap">{message.content}</div>
                              )}
                            </div>
                            <div className={`text-xs mt-2 ${
                              message.role === 'user' ? 'text-yellow-800' : 'text-gray-500 dark:text-gray-400'
                            }`}>
                              {message.timestamp.toLocaleTimeString()}
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                    
                    {isLoadingChat && (
                      <div className="w-full mb-4">
                        <div className="w-full bg-gray-100 dark:bg-gray-700 p-4 rounded-lg">
                          <div className="flex items-center space-x-2">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600"></div>
                            <span className="text-sm text-gray-600 dark:text-gray-400">AI is thinking...</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Chat Input */}
                  <div className="flex-shrink-0 p-4 border-t border-gray-200 dark:border-gray-700 h-20">
                    <div className="flex space-x-2">
                      <input
                        type="text"
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        onKeyPress={handleKeyPress}
                        placeholder={hasActiveSubscription === false ? "AI chat requires a paid plan!" : "Ask me anything about this challenge..."}
                        disabled={isLoadingChat || hasActiveSubscription === false}
                        className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 dark:bg-gray-700 dark:text-white text-sm disabled:opacity-50"
                      />
                      {hasActiveSubscription === false ? (
                        <button 
                          onClick={refreshSubscriptionStatus}
                          className="px-4 py-2 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 transition-colors"
                        >
                          Refresh
                        </button>
                      ) : (
                        <button 
                          onClick={handleSendMessage}
                          disabled={isLoadingChat || !chatInput.trim()}
                          className="px-4 py-2 bg-yellow-500 text-black rounded-lg font-medium hover:bg-yellow-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Send
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

    </div>
  )
}
