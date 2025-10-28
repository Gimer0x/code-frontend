'use client'

import { useEffect, useRef, useState } from 'react'
import * as ace from 'ace-builds'
import 'ace-builds/src-noconflict/mode-javascript'
import 'ace-builds/src-noconflict/theme-tomorrow_night'
import 'ace-builds/src-noconflict/ext-language_tools'

// Load Solidity mode from CDN
const loadSolidityMode = () => {
  if (typeof window !== 'undefined') {
    return new Promise((resolve) => {
      const script = document.createElement('script')
      script.src = 'https://cdn.jsdelivr.net/gh/ConsenSys/ace-mode-solidity@master/solidity.js'
      script.onload = () => resolve(true)
      script.onerror = () => resolve(false)
      document.head.appendChild(script)
    })
  }
  return Promise.resolve(false)
}

// Apply custom Solidity keyword highlighting
const applyCustomSolidityHighlighting = () => {
  const aceEditor = document.querySelector('.ace_editor')
  if (!aceEditor) return

  // Keywords to highlight in green (visibility modifiers)
  const greenKeywords = ['payable', 'public', 'internal', 'private', 'external', 'view', 'pure']
  
  // Keywords to highlight in blue (core Solidity keywords)
  const blueKeywords = [
    'pragma', 'solidity', 'import', 'contract', 'is', 'uint', 'uint256', 'uint8', 'uint16', 'uint32', 'uint64', 'uint128', 
    'int', 'int256', 'int8', 'int16', 'int32', 'int64', 'int128', 'address', 'bool', 'true', 'false', 'mapping', 'struct', 'enum',
    'modifier', 'event', 'error', 'function', 'from', 'to', 'this','if','else','for','while','do','continue','try','catch','assert'
    ,'throw', 'returns', 'this','super','wei','gwei','ether','seconds','minutes','hours','days','weeks','years','true','false','null',
    'undefined','bytes', 'bytes1', 'bytes2', 'bytes4', 'bytes8', 'bytes16', 'bytes32', 'assembly'
  ]
  
  // Keywords to highlight in red-pink
  const redPinkKeywords = ['constructor']
  
  // Keywords to highlight in red
  const redKeywords = ['revert', 'require', 'return', 'break', 'continue']
  
  // Keywords to highlight in purple
  const purpleKeywords = ['msg', 'tx', 'block', 'now']
  
  // Brackets and symbols to highlight in blue
  const blueBrackets = ['(', ')', '[', ']', '{', '}']
  
  // Storage keywords to highlight in light yellow cake (not bold)
  const storageKeywords = ['memory', 'calldata', 'storage', 'transient']

  // Find all text spans and apply custom classes
  const textSpans = aceEditor.querySelectorAll('.ace_text-layer span, .ace_line span')
  textSpans.forEach((span: any) => {
    const text = span.textContent?.trim()
    if (greenKeywords.includes(text)) {
      span.classList.add('ace_payable')
      // Force inline style as backup
      span.style.color = '#42C4A8'
      span.style.fontWeight = 'bold'
    } else if (blueKeywords.includes(text)) {
      span.classList.add('ace_blue_keyword')
      // Force inline style as backup
      span.style.color = '#60a5fa'
      span.style.fontWeight = 'bold'
    } else if (redPinkKeywords.includes(text)) {
      span.classList.add('ace_constructor')
      // Force inline style as backup
      span.style.color = '#ff6b9d'
      span.style.fontWeight = 'bold'
    } else if (redKeywords.includes(text)) {
      span.classList.add('ace_red_keyword')
      // Force inline style as backup
      span.style.color = '#ff4757'
      span.style.fontWeight = 'light'
    } else if (purpleKeywords.includes(text)) {
      span.classList.add('ace_purple_keyword')
      // Force inline style as backup
      span.style.color = '#475569'
      span.style.fontWeight = 'bold'
    } else if (blueBrackets.includes(text)) {
      span.classList.add('ace_bracket')
      // Force inline style as backup
      span.style.color = '#60a5fa'
      span.style.fontWeight = 'bold'
    } else if (storageKeywords.includes(text)) {
      span.classList.add('ace_storage')
      // Force inline style as backup
      span.style.color = '#fbbf24'
      span.style.fontWeight = 'normal'
    }
  })
}

interface SolidityEditorProps {
  value: string
  onChange: (value: string) => void
  height?: string
  readOnly?: boolean
  className?: string
  onResizeTrigger?: () => void
  clearSelectionOnValueChange?: boolean
}

const SolidityEditor: React.FC<SolidityEditorProps> = ({
  value,
  onChange,
  height = '100%',
  readOnly = false,
  className = '',
  onResizeTrigger,
  clearSelectionOnValueChange = true
}) => {
  const editorRef = useRef<HTMLDivElement>(null)
  const aceEditorRef = useRef<ace.Ace.Editor | null>(null)
  const [copySuccess, setCopySuccess] = useState(false)

  useEffect(() => {
    if (!editorRef.current) return

    // Load Solidity mode and initialize editor
    loadSolidityMode().then((solidityLoaded) => {
      const editor = ace.edit(editorRef.current)
      aceEditorRef.current = editor

      // Configure editor
      editor.setTheme('ace/theme/tomorrow_night')
      
      // Use Solidity mode if available, otherwise fallback to JavaScript
      if (solidityLoaded) {
        editor.session.setMode('ace/mode/solidity')
      } else {
        editor.session.setMode('ace/mode/javascript')
      }
      
      editor.setValue(value)
      editor.setReadOnly(readOnly)
      
      // Clear any selection and position cursor at the beginning
      editor.clearSelection()
      editor.gotoLine(1, 0) // Go to beginning of document
      editor.clearSelection() // Ensure no text is selected
      
      // Configure editor options for maximum performance
      editor.setOptions({
        fontSize: 12,
        fontFamily: 'Monaco, Menlo, "Ubuntu Mono", monospace',
        showLineNumbers: true,
        showGutter: true,
        highlightActiveLine: false, // Disable to reduce lag
        enableBasicAutocompletion: false,
        enableLiveAutocompletion: false,
        enableSnippets: false,
        enableAutoIndent: false,
        enableMultiselect: false,
        dragEnabled: false,
        wrap: true,
        tabSize: 4,
        useSoftTabs: true,
        showPrintMargin: false,
        behavioursEnabled: false, // Disable to reduce lag
        wrapBehavioursEnabled: false, // Disable to reduce lag
        autoScrollEditorIntoView: false,
        focusTimeout: 0,
        mergeUndoDeltas: true,
        // Additional performance optimizations
        useWorker: false, // Disable web worker for better performance
        animatedScroll: false, // Disable animations
        scrollSpeed: 1, // Enable mouse wheel scrolling
        scrollPastEnd: 0.5 // Allow scrolling past end of document
      })

      // Apply additional CSS styling to match project theme
      setTimeout(() => {
        const aceEditor = document.querySelector('.ace_editor') as HTMLElement
        if (aceEditor) {
          aceEditor.style.backgroundColor = '#1e293b'
          aceEditor.style.color = '#e2e8f0'
        }
        
        // Force line height on editor container
        if (editor.container) {
          editor.container.style.lineHeight = '1.5'
          editor.renderer.updateFontSize()
        }
        
        // Apply custom Solidity keyword highlighting
        applyCustomSolidityHighlighting()
        
        // Set up MutationObserver to catch DOM changes and reapply highlighting
        const observer = new MutationObserver(() => {
          applyCustomSolidityHighlighting()
        })
        
        const textLayer = aceEditor?.querySelector('.ace_text-layer')
        if (textLayer) {
          observer.observe(textLayer, { childList: true, subtree: true })
        }
      }, 100)

      // Ensure no selection after editor is fully initialized
      setTimeout(() => {
        editor.clearSelection()
        editor.blur() // Remove focus to prevent selection
        
        // Force layout recalculation to fix positioning issues
        if (editor && editor.resize) {
          editor.resize()
        }
      }, 100)

      // Explicitly disable autocomplete commands
      editor.commands.removeCommand('startAutocomplete')
      editor.commands.removeCommand('autocomplete')
      editor.commands.removeCommand('showPopup')
      editor.commands.removeCommand('showTooltip')

      // Optimized change handling - minimal operations for better performance
      editor.session.on('change', () => {
        const content = editor.getValue()
        onChange(content)
        
        // Fix layout issues by forcing a resize when content changes
        setTimeout(() => {
          if (editor && editor.resize) {
            editor.resize()
          }
          
          // Reapply custom highlighting after content changes
          applyCustomSolidityHighlighting()
        }, 10)
      })

      // Minimal ResizeObserver - only resize when absolutely necessary
      let resizeTimeout: NodeJS.Timeout
      const resizeObserver = new ResizeObserver((entries) => {
        if (editor && editor.resize) {
          // More aggressive debouncing to reduce resize calls
          clearTimeout(resizeTimeout)
          resizeTimeout = setTimeout(() => {
            editor.resize()
          }, 100) // Longer debounce for better performance
        }
      })

      if (editorRef.current) {
        resizeObserver.observe(editorRef.current)
      }

      // Cleanup
      return () => {
        if (resizeTimeout) {
          clearTimeout(resizeTimeout)
        }
        if (resizeObserver) {
          resizeObserver.disconnect()
        }
        if (editor) {
          editor.destroy()
        }
      }
    })
  }, [])

  // Update editor value when prop changes
  useEffect(() => {
    if (aceEditorRef.current && aceEditorRef.current.getValue() !== value) {
      aceEditorRef.current.setValue(value)
      // Clear selection and position cursor at beginning after value change (if enabled)
      if (clearSelectionOnValueChange) {
        // Use setTimeout to ensure the selection clearing happens after the editor processes the value change
        setTimeout(() => {
          if (aceEditorRef.current) {
            aceEditorRef.current.clearSelection()
            aceEditorRef.current.gotoLine(1, 0)
            aceEditorRef.current.clearSelection()
          }
        }, 10)
      }
    }
  }, [value, clearSelectionOnValueChange])

  // Optimized window resize handling - single efficient handler
  useEffect(() => {
    const handleResize = () => {
      if (aceEditorRef.current && aceEditorRef.current.resize) {
        aceEditorRef.current.resize()
      }
    }

    // Listen for window resize events
    window.addEventListener('resize', handleResize)
    
    // Trigger resize when component mounts
    handleResize()

    return () => {
      window.removeEventListener('resize', handleResize)
    }
  }, [])

  // Handle resize trigger from parent component
  useEffect(() => {
    if (onResizeTrigger) {
      onResizeTrigger()
    }
  }, [onResizeTrigger])

  // Copy to clipboard function
  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(value)
      setCopySuccess(true)
      setTimeout(() => setCopySuccess(false), 2000)
    } catch (err) {
      console.error('Failed to copy text: ', err)
    }
  }

  return (
    <div className={`solidity-editor-container ${className}`} style={{ height: '100%', display: 'flex', flexDirection: 'column', position: 'relative' }}>
      {/* Copy Button */}
      <button
        onClick={copyToClipboard}
        className="absolute top-2 right-2 z-10 p-2 text-gray-400 hover:text-gray-200 hover:bg-gray-700 rounded-md transition-all duration-200 opacity-70 hover:opacity-100"
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

      {/* Ace Editor */}
      <div
        ref={editorRef}
        style={{
          height: height,
          width: '100%',
          minHeight: '400px',
          backgroundColor: '#282a36', // Enhanced dark purple-blue background
          color: '#f8f8f2', // Light off-white text
          borderRadius: '0.5rem',
          border: '1px solid #44475a' // Subtle purple border
        }}
      />
    </div>
  )
}

export default SolidityEditor