'use client'

import { useState, useRef, useEffect } from 'react'

interface CodeEditorProps {
  value: string
  onChange: (value: string) => void
  language?: string
  placeholder?: string
  className?: string
  height?: string
  readOnly?: boolean
}

const CodeEditor: React.FC<CodeEditorProps> = ({
  value,
  onChange,
  language = 'solidity',
  placeholder = '// Enter your Solidity code here...',
  className = '',
  height = '300px',
  readOnly = false
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const lineNumbersRef = useRef<HTMLDivElement>(null)
  const [lineNumbers, setLineNumbers] = useState<number[]>([])
  const [copySuccess, setCopySuccess] = useState(false)

  // Calculate line numbers based on content
  useEffect(() => {
    const lines = value.split('\n')
    const newLineNumbers = lines.map((_, index) => index + 1)
    setLineNumbers(newLineNumbers)
  }, [value])

  // Handle textarea changes
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange(e.target.value)
  }

  // Handle scrolling synchronization
  const handleScroll = () => {
    if (textareaRef.current && lineNumbersRef.current) {
      lineNumbersRef.current.scrollTop = textareaRef.current.scrollTop
    }
  }

  // Handle key events for better UX
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Tab') {
      e.preventDefault()
      const textarea = e.currentTarget
      const start = textarea.selectionStart
      const end = textarea.selectionEnd
      const newValue = value.substring(0, start) + '    ' + value.substring(end)
      onChange(newValue)

      // Set cursor position after the inserted spaces
      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = start + 4
      }, 0)
    }
    
    // Auto-indent for Solidity
    if (e.key === 'Enter' && language === 'solidity') {
      const textarea = e.currentTarget
      const start = textarea.selectionStart
      const lines = value.substring(0, start).split('\n')
      const currentLine = lines[lines.length - 1]
      const indent = currentLine.match(/^(\s*)/)?.[1] || ''
      
      // Check if we need to add extra indentation for braces
      if (currentLine.includes('{')) {
        setTimeout(() => {
          const newStart = textarea.selectionStart
          const newEnd = textarea.selectionEnd
          const newValue = value.substring(0, newStart) + indent + '    ' + value.substring(newEnd)
          onChange(newValue)
          textarea.selectionStart = textarea.selectionEnd = newStart + indent.length + 4
        }, 0)
      }
    }
  }

  // Handle copy to clipboard
  const handleCopyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(value)
      setCopySuccess(true)
      setTimeout(() => setCopySuccess(false), 2000)
    } catch (err) {
      console.error('Failed to copy text: ', err)
    }
  }

  return (
    <div className={`border border-gray-300 dark:border-gray-600 rounded-md overflow-hidden ${className}`} style={{ height }}>
      <div className="flex h-full">
        {/* Line Numbers */}
        <div
          ref={lineNumbersRef}
          className="bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 text-sm font-mono px-2 py-2 select-none border-r border-gray-300 dark:border-gray-600 overflow-hidden"
          style={{ minWidth: '50px', lineHeight: '1.5' }}
        >
          {lineNumbers.map((num) => (
            <div key={num} className="text-right">
              {num}
            </div>
          ))}
        </div>

        {/* Code Editor */}
        <div className="flex-1 relative group">
          <textarea
            ref={textareaRef}
            value={value}
            onChange={handleChange}
            onScroll={handleScroll}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            readOnly={readOnly}
            className="w-full h-full bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 font-mono text-sm resize-none focus:outline-none px-3 py-2 border-0"
            style={{
              lineHeight: '1.5',
              fontFamily: 'Monaco, Menlo, "Ubuntu Mono", monospace',
              fontSize: '14px',
              tabSize: 4
            }}
          />
          
          {/* Copy Button */}
          <button
            type="button"
            onClick={handleCopyToClipboard}
            className="absolute top-2 right-4 p-2 text-gray-400 hover:text-gray-200 rounded-md transition-all duration-200 opacity-70 hover:opacity-100"
            title={copySuccess ? 'Copied!' : 'Copy code'}
          >
            {copySuccess ? (
              <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

export default CodeEditor
