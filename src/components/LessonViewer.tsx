'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

interface Lesson {
  id: string
  title: string
  type: string
  contentMarkdown: string | null
  youtubeUrl: string | null
  order: number
  module: {
    id: string
    title: string
    description: string
    course: {
      id: string
      title: string
    }
  }
  progress: {
    completed: boolean
  } | null
  navigation: {
    currentIndex: number
    totalLessons: number
    nextLesson: {
      id: string
      title: string
      type: string
    } | null
    previousLesson: {
      id: string
      title: string
      type: string
    } | null
    allLessons: Array<{
      id: string
      title: string
      type: string
      order: number
    }>
  }
}

interface LessonViewerProps {
  lesson: Lesson
  courseId: string
}

export default function LessonViewer({ lesson: initialLesson, courseId }: LessonViewerProps) {
  const [lesson, setLesson] = useState<Lesson | null>(initialLesson)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isCompleting, setIsCompleting] = useState(false)
  const router = useRouter()

  // Fix macOS text substitution on component mount
  useEffect(() => {
    // Only run on client side to avoid hydration issues
    if (typeof window === 'undefined') return

    const fixMacOSTextSubstitution = () => {
      // Find all text nodes and convert symbols back
      const walker = document.createTreeWalker(
        document.body,
        NodeFilter.SHOW_TEXT,
        null
      )
      
      let node
      while (node = walker.nextNode()) {
        if (node.textContent) {
          let text = node.textContent
          const originalText = text
          
          // Convert mathematical symbols back to operators
          text = text.replace(/≠/g, '!=')
          text = text.replace(/≤/g, '<=')
          text = text.replace(/≥/g, '>=')
          text = text.replace(/⇒/g, '=>')
          text = text.replace(/→/g, '->')
          text = text.replace(/←/g, '<-')
          text = text.replace(/∧/g, '&&')
          text = text.replace(/∨/g, '||')
          
          if (text !== originalText) {
            node.textContent = text
          }
        }
      }
    }

    // Run immediately and set up observer
    fixMacOSTextSubstitution()
    
    // Set up mutation observer to catch dynamic changes
    const observer = new MutationObserver(fixMacOSTextSubstitution)
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true
    })

    return () => observer.disconnect()
  }, [])

  // Clean markdown content to remove any special characters
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

  // The public API already ensures only intro lessons are accessible

  const markLessonCompleted = async () => {
    if (!lesson || lesson.progress?.completed) return

    try {
      setIsCompleting(true)
      const response = await fetch(`/api/lessons/${lesson.id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error('Failed to mark lesson as completed')
      }

      // Update local state
      setLesson(prev => prev ? {
        ...prev,
        progress: { completed: true }
      } : null)
    } catch (err) {
    } finally {
      setIsCompleting(false)
    }
  }

  const navigateToLesson = (targetLessonId: string) => {
    router.push(`/courses/${courseId}/modules/${lesson?.module.id}/lessons/${targetLessonId}`)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-yellow-500"></div>
      </div>
    )
  }

  if (error || !lesson) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Lesson Not Found</h1>
          <p className="text-gray-600 mb-4">{error || 'The requested lesson could not be found.'}</p>
          <button
            onClick={() => router.push(`/courses/${courseId}${lesson?.module?.id ? `?expandedModule=${lesson.module.id}` : ''}`)}
            className="bg-yellow-500 text-black px-6 py-2 rounded-lg font-semibold hover:bg-yellow-600 transition-colors"
          >
            Back to Course
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Top Navigation Bar */}
      <div className="bg-slate-800 border-b border-slate-700 px-8 py-4 w-full">
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

    {/* Main Content */}
    <div className="bg-gray-50 dark:bg-gray-900 min-h-screen">
      <div className="max-w-6xl mx-auto px-8 py-8">
        {/* Lesson Header */}
        <div className="mb-8">
          <div className="mb-4">
            <h1 className="text-2xl font-bold text-yellow-500">
              Lesson {lesson.navigation.currentIndex + 1}.{lesson.order} - {lesson.title}
            </h1>
          </div>
        </div>

        {/* YouTube Video */}
        {lesson.youtubeUrl && (
          <div className="mb-8">
            <div className="aspect-video bg-gray-900 rounded-lg overflow-hidden shadow-lg">
              <iframe
                src={lesson.youtubeUrl}
                title={lesson.title}
                className="w-full h-full"
                allowFullScreen
              />
            </div>
          </div>
        )}


        {/* Markdown Content */}
        {lesson.contentMarkdown && (
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-600 p-6 shadow-sm">
            <div className="prose prose-lg max-w-none dark:prose-invert prose-headings:text-yellow-500 prose-a:text-yellow-500 prose-strong:text-gray-800 dark:prose-strong:text-gray-200 prose-code:text-gray-800 dark:prose-code:text-gray-200">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              rehypePlugins={[]}
              skipHtml={false}
              allowElement={(element, index, parent) => {
                // Allow all elements
                return true
              }}
              urlTransform={(uri) => {
                // Handle relative image paths
                if (uri.startsWith('/')) {
                  return `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}${uri}`
                }
                return uri
              }}
              components={{
                h1: ({ children }) => (
                  <h1 className="text-2xl font-bold text-white mb-4 mt-6 first:mt-0">
                    {children}
                  </h1>
                ),
                h2: ({ children }) => (
                  <h2 className="text-xl font-bold text-white mb-3 mt-4">
                    {children}
                  </h2>
                ),
                h3: ({ children }) => (
                  <h3 className="text-lg font-semibold text-white mb-2 mt-3">
                    {children}
                  </h3>
                ),
                p: ({ children }) => (
                  <p className="mb-3 text-base text-gray-700 dark:text-gray-300 leading-relaxed">
                    {children}
                  </p>
                ),
                ul: ({ children }) => (
                  <ul className="list-disc list-outside mb-3 text-base text-gray-700 dark:text-gray-300 space-y-1 ml-6">
                    {children}
                  </ul>
                ),
                ol: ({ children }) => (
                  <ol className="list-decimal list-outside mb-3 text-base text-gray-700 dark:text-gray-300 space-y-1 ml-6">
                    {children}
                  </ol>
                ),
                li: ({ children }) => (
                  <li className="mb-1 text-base leading-relaxed text-gray-700 dark:text-gray-300">
                    {children}
                  </li>
                ),
                blockquote: ({ children }) => (
                  <blockquote className="border-l-4 border-blue-500 pl-4 py-6 mb-4 bg-blue-50 dark:bg-blue-900/20 text-gray-800 dark:text-gray-200 italic flex items-center [&>p]:mb-0">
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
                  
                  // For Solidity code blocks, apply comprehensive syntax highlighting
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
                    
                    // Process comments to make them italic and green
                    const lines = processedCode.split('\n')
                    const processedLines = lines.map(line => {
                      if (line.includes('//')) {
                        const commentIndex = line.indexOf('//')
                        const beforeComment = line.substring(0, commentIndex)
                        const comment = line.substring(commentIndex)
                        return (
                          <>
                            {beforeComment}
                            <span style={{ color: '#82c482', fontStyle: 'italic' }}>
                              {comment}
                            </span>
                          </>
                        )
                      }
                      return line
                    })
                    
                    return (
                      <code className={className}>
                        {processedLines.map((line, index) => (
                          <div key={index}>
                            {line}
                          </div>
                        ))}
                      </code>
                    )
                  }
                  
                  return (
                    <code className={className}>
                      {children}
                    </code>
                  )
                },
                 pre: ({ children }) => {
                   // Check if this is a Solidity code block
                   const isSolidity = children && 
                     typeof children === 'object' && 
                     'props' in children && 
                     children.props && 
                     'className' in children.props &&
                     children.props.className?.includes('language-solidity')
                   
                   const copyToClipboard = async () => {
                     try {
                       const codeText = typeof children === 'string' ? children : String(children)
                       await navigator.clipboard.writeText(codeText)
                     } catch (err) {
                     }
                   }
                   
                   if (isSolidity) {
                     const codeString = children.props.children
                     const lines = codeString.split('\n')
                     
                    // Enhanced Solidity syntax highlighting
                    const highlightLine = (line: string) => {
                       if (line.includes('//')) {
                         const commentIndex = line.indexOf('//')
                         const beforeComment = line.substring(0, commentIndex)
                         const comment = line.substring(commentIndex)
                         
                         return (
                           <>
                             {highlightText(beforeComment)}
                             <span style={{ color: '#82c482', fontStyle: 'italic' }}>
                               {comment}
                             </span>
                           </>
                         )
                       }
                       return highlightText(line)
                     }
                     
                      // Use the same highlighting approach as the admin preview
                      const highlightText = (text: string) => {
                       const highlighted = text;
                       
                       // Process line by line to avoid conflicts
                       const lines = highlighted.split('\n');
                       const processedLines = lines.map((line, index) => {
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
                       
                       return <span dangerouslySetInnerHTML={{ __html: processedLines.join('\n') }} />
                     }
                     
                     return (
                       <div className="relative group bg-slate-900 rounded-lg overflow-hidden mb-4 shadow-lg">
                         <pre className="text-gray-100 p-4 font-mono text-sm leading-relaxed m-0">
                           {lines.map((line: string, index: number) => {
                             // Don't add h-4 for the last line if it's empty (trailing empty line)
                             const isLastLine = index === lines.length - 1;
                             const isTrailingEmptyLine = isLastLine && line.trim() === '';
                             
                             return (
                               <div key={index} className={line.trim() === '' && !isTrailingEmptyLine ? 'h-4' : ''}>
                                 {highlightLine(line)}
                               </div>
                             );
                           })}
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
                   
                   // Default styling for other code blocks
                   return (
                     <div className="relative group">
                       <pre className="bg-slate-900 text-gray-100 p-4 rounded-lg overflow-x-auto mb-4 shadow-lg font-mono text-sm leading-relaxed">
                         {children}
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
                    <table className="min-w-full border border-gray-200 dark:border-gray-600 rounded-lg shadow-sm bg-white dark:bg-gray-800">
                      {children}
                    </table>
                  </div>
                ),
                th: ({ children }) => (
                  <th className="bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 px-4 py-2 text-left font-semibold text-gray-900 dark:text-white">
                    {children}
                  </th>
                ),
                td: ({ children }) => (
                  <td className="border border-gray-200 px-4 py-2 text-gray-800 dark:text-gray-100">
                    {children}
                  </td>
                ),
                a: ({ children, href }) => (
                  <a 
                    href={href} 
                    className="text-yellow-500 hover:text-yellow-600 underline transition-colors"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {children}
                  </a>
                ),
                strong: ({ children }) => (
                  <strong className="font-semibold text-gray-800 dark:text-gray-200">
                    {children}
                  </strong>
                ),
                em: ({ children }) => (
                  <em className="italic text-gray-700 dark:text-gray-300">
                    {children}
                  </em>
                ),
                hr: () => (
                  <hr className="my-8 border-gray-300 dark:border-gray-600" />
                ),
                img: ({ src, alt }) => (
                  <img 
                    src={src} 
                    alt={alt}
                    className="max-w-full h-auto rounded-lg shadow-md my-4"
                  />
                ),
                input: ({ type, checked, ...props }) => {
                  if (type === 'checkbox') {
                    return (
                      <input 
                        type="checkbox" 
                        checked={checked}
                        readOnly
                        className="mr-2 accent-yellow-500"
                        {...props}
                      />
                    )
                  }
                  return <input type={type} {...props} />
                },
              }}
            >
              {cleanMarkdown(lesson.contentMarkdown)}
            </ReactMarkdown>
            </div>
          </div>
        )}

        {/* No Content Message */}
        {!lesson.contentMarkdown && !lesson.youtubeUrl && (
          <div className="text-center py-12">
            <p className="text-gray-500">No content available for this lesson.</p>
          </div>
        )}

        {/* Mark as Complete Button */}
        {!lesson.progress?.completed && (
          <div className="mt-8 pt-8 border-t border-gray-200">
            <button
              onClick={markLessonCompleted}
              disabled={isCompleting}
              className="bg-yellow-500 text-black px-6 py-3 rounded-lg font-semibold hover:bg-yellow-600 transition-colors disabled:opacity-50"
            >
              {isCompleting ? 'Marking...' : 'Mark as Complete'}
            </button>
          </div>
        )}
      </div>
    </div>
  </div>
)
}
