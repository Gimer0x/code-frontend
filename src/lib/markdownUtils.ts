// Reusable Markdown interpreter utilities
// This file contains the same logic as the preview component in the tab editor

export function highlightSolidityCode(code: string): string {
  const highlighted = code;
  
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
  
  return processedLines.join('\n');
}

export function renderMarkdown(markdown: string): string {
  if (!markdown) return '';
  
  let html = markdown;
  
  // First, extract and replace code blocks with placeholders to prevent them from being processed as paragraphs
  const codeBlocks: string[] = [];
  
  // Handle Solidity code blocks first
  html = html.replace(/```solidity\n?([\s\S]*?)```/g, (match, code) => {
    const highlighted = highlightSolidityCode(code.trim());
    const placeholder = `__CODE_BLOCK_${codeBlocks.length}__`;
    codeBlocks.push(`<pre class="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto my-4" style="line-height: 1.5 !important; margin: 0 !important; padding: 1rem !important; font-size: 16px !important;"><code class="language-solidity" style="line-height: 1.5 !important; margin: 0 !important; padding: 0 !important; display: block !important; font-size: 16px !important;">${highlighted}</code></pre>`);
    return placeholder;
  });
  
  // Handle other code blocks
  html = html.replace(/```(\w+)?\n?([\s\S]*?)```/g, (match, lang, code) => {
    if (lang === 'solidity') return match; // Already handled above
    const placeholder = `__CODE_BLOCK_${codeBlocks.length}__`;
    codeBlocks.push(`<pre class="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto my-4" style="line-height: 1.0 !important; margin: 0 !important; padding: 1rem !important; font-size: 14px !important;"><code class="language-${lang || 'text'}" style="line-height: 1.0 !important; margin: 0 !important; padding: 0 !important; display: block !important; font-size: 14px !important;">${code.trim()}</code></pre>`);
    return placeholder;
  });
  
  // Handle inline code
  html = html.replace(/`([^`]+)`/g, '<code class="bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded text-sm font-mono">$1</code>');
  
  // Handle headings
  html = html.replace(/^######\s+(.*)$/gm, '<h6 class="text-sm font-bold text-gray-900 dark:text-white mb-2 mt-4">$1</h6>');
  html = html.replace(/^#####\s+(.*)$/gm, '<h5 class="text-base font-bold text-gray-900 dark:text-white mb-2 mt-4">$1</h5>');
  html = html.replace(/^####\s+(.*)$/gm, '<h4 class="text-lg font-bold text-gray-900 dark:text-white mb-2 mt-4">$1</h4>');
  html = html.replace(/^###\s+(.*)$/gm, '<h3 class="text-xl font-bold text-gray-900 dark:text-white mb-2 mt-4">$1</h3>');
  html = html.replace(/^##\s+(.*)$/gm, '<h2 class="text-2xl font-bold text-gray-900 dark:text-white mb-3 mt-6">$1</h2>');
  html = html.replace(/^#\s+(.*)$/gm, '<h1 class="text-3xl font-bold text-gray-900 dark:text-white mb-4 mt-8">$1</h1>');
  
  // Handle blockquotes with nested content
  html = html.replace(/^(> .*(\n> .*)*)$/gm, (match) => {
    let content = match.replace(/^> /gm, '').trim();
    
    // Process nested markdown within blockquote
    content = content.replace(/^######\s+(.*)$/gm, '<h6 class="text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">$1</h6>');
    content = content.replace(/^#####\s+(.*)$/gm, '<h5 class="text-base font-bold text-gray-700 dark:text-gray-300 mb-1">$1</h5>');
    content = content.replace(/^####\s+(.*)$/gm, '<h4 class="text-lg font-bold text-gray-700 dark:text-gray-300 mb-1">$1</h4>');
    content = content.replace(/^###\s+(.*)$/gm, '<h3 class="text-xl font-bold text-gray-700 dark:text-gray-300 mb-1">$1</h3>');
    content = content.replace(/^##\s+(.*)$/gm, '<h2 class="text-2xl font-bold text-gray-700 dark:text-gray-300 mb-2">$1</h2>');
    content = content.replace(/^#\s+(.*)$/gm, '<h1 class="text-3xl font-bold text-gray-700 dark:text-gray-300 mb-2">$1</h1>');
    
    // Handle lists within blockquotes
    content = content.replace(/^\* (.*)$/gm, '<li class="ml-4">$1</li>');
    content = content.replace(/^- (.*)$/gm, '<li class="ml-4">$1</li>');
    content = content.replace(/^(\d+)\. (.*)$/gm, '<li class="ml-4">$2</li>');
    content = content.replace(/(<li.*<\/li>\s*)+/g, '<ul class="list-disc list-inside mb-2 space-y-1">$&</ul>');
    
    // Handle bold and italic within blockquotes
    content = content.replace(/\*\*([^*]+)\*\*/g, '<strong class="font-bold">$1</strong>');
    content = content.replace(/\*([^*]+)\*/g, '<em class="italic">$1</em>');
    
    // Wrap remaining text in paragraphs
    content = content.replace(/^(?!<[hlu])(.*)$/gm, '<p class="mb-2 text-gray-700 dark:text-gray-300">$1</p>');
    
    return `<blockquote class="border-l-4 border-amber-400 pl-4 py-2 my-4 bg-amber-50 dark:bg-amber-900/20 rounded-r-md">${content}</blockquote>`;
  });
  
  // Handle images (including video thumbnails)
  html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" class="max-w-full h-auto rounded-lg my-4 shadow-md" />');
  
  // Handle video embeds (YouTube thumbnail pattern)
  html = html.replace(/\[!\[([^\]]*)\]\(([^)]+)\)\]\(([^)]+)\)/g, '<a href="$3" target="_blank" rel="noopener noreferrer" class="inline-block my-4"><img src="$2" alt="$1" class="max-w-full h-auto rounded-lg shadow-md hover:shadow-lg transition-shadow cursor-pointer border-2 border-transparent hover:border-amber-400" /></a>');
  
  // Handle links
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 underline font-medium">$1</a>');
  
  // Handle unordered lists
  html = html.replace(/^\* (.*)$/gm, '<li class="mb-1">$1</li>');
  html = html.replace(/^- (.*)$/gm, '<li class="mb-1">$1</li>');
  html = html.replace(/(<li class="mb-1">.*<\/li>\s*)+/g, '<ul class="list-disc list-inside mb-4 ml-4 space-y-1">$&</ul>');
  
  // Handle ordered lists
  html = html.replace(/^(\d+)\. (.*)$/gm, '<li class="mb-1">$2</li>');
  html = html.replace(/(<li class="mb-1">.*<\/li>\s*)+/g, (match) => {
    // Check if this is part of an unordered list already
    if (match.includes('list-disc')) return match;
    return `<ol class="list-decimal list-inside mb-4 ml-4 space-y-1">${match}</ol>`;
  });
  
  // Handle bold and italic text
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong class="font-bold text-gray-900 dark:text-white">$1</strong>');
  html = html.replace(/\*([^*]+)\*/g, '<em class="italic text-gray-800 dark:text-gray-200">$1</em>');
  
  // Handle paragraphs (wrap remaining text)
  html = html.replace(/^(?!<[hlupo])(.+)$/gm, '<p class="mb-4 text-gray-700 dark:text-gray-300 leading-relaxed">$1</p>');
  
  // Reduce margin between paragraphs and lists
  html = html.replace(/(<p class="mb-4[^"]*">[^<]*<\/p>)\s*(<ul|<ol)/g, (match, pTag, listTag) => {
    const newPTag = pTag.replace('mb-4', 'mb-2');
    return newPTag + listTag;
  });
  
  // Clean up extra whitespace and empty paragraphs
  html = html.replace(/<p[^>]*>\s*<\/p>/g, '');
  html = html.replace(/\n\s*\n/g, '\n');
  
  // Restore code blocks
  codeBlocks.forEach((codeBlock, index) => {
    html = html.replace(`__CODE_BLOCK_${index}__`, codeBlock);
  });
  
  return html.trim();
}

export function openMarkdownPreviewInNewWindow(markdown: string, title: string = 'Markdown Preview', moduleNumber?: number, lessonNumber?: number): void {
  if (!markdown.trim()) {
    alert('No content to preview. Please add some markdown content first.');
    return;
  }
  
  const html = renderMarkdown(markdown);
  
  const newWindow = window.open('', '_blank', 'width=1200,height=800,scrollbars=yes,resizable=yes');
  
  if (newWindow) {
    newWindow.document.open();
    newWindow.document.write(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${title}</title>
        <style>
          * {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            box-sizing: border-box;
          }
          
          body {
            background: linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%);
            min-height: 100vh;
            margin: 0;
            padding: 2rem;
            color: #f9fafb;
          }
          
          .container {
            width: 75%;
            margin: 0 auto;
          }
          
          .content-box {
            border: 1px solid #374151;
            border-radius: 0.375rem;
            padding: 1rem;
            background-color: #1f2937;
            color: #f9fafb;
          }
          
          .prose {
            max-width: none;
            color: #f9fafb;
          }
          
          .prose h1 {
            font-size: 1.875rem;
            font-weight: 700;
            margin-bottom: 1rem;
            margin-top: 2rem;
            color: #ffffff;
          }
          
          .prose h2 {
            font-size: 1.5rem;
            font-weight: 700;
            margin-bottom: 0.75rem;
            margin-top: 1.5rem;
            color: #ffffff;
          }
          
          .prose h3 {
            font-size: 1.25rem;
            font-weight: 700;
            margin-bottom: 0.5rem;
            margin-top: 1rem;
            color: #ffffff;
          }
          
          .prose h4 {
            font-size: 1.125rem;
            font-weight: 700;
            margin-bottom: 0.5rem;
            margin-top: 1rem;
            color: #ffffff;
          }
          
          .prose h5 {
            font-size: 1rem;
            font-weight: 700;
            margin-bottom: 0.5rem;
            margin-top: 1rem;
            color: #ffffff;
          }
          
          .prose h6 {
            font-size: 0.875rem;
            font-weight: 700;
            margin-bottom: 0.5rem;
            margin-top: 1rem;
            color: #ffffff;
          }
          
          .prose p {
            margin-bottom: 1rem;
            line-height: 1.625;
            color: #d1d5db;
          }
          
          .prose strong {
            font-weight: 700;
            color: #ffffff;
          }
          
          .prose em {
            font-style: italic;
            color: #e5e7eb;
          }
          
          .prose a {
            color: #f59e0b;
            text-decoration: underline;
            font-weight: 500;
          }
          
          .prose a:hover {
            color: #d97706;
          }
          
          .prose ul, .prose ol {
            margin-bottom: 1rem;
            padding-left: 1.5rem;
            margin-block-start: 0;
            margin-block-end: 0;
          }
          
          .prose ul {
            list-style-type: disc;
          }
          
          .prose ol {
            list-style-type: decimal;
          }
          
          .prose li {
            margin-bottom: 0.25rem;
            line-height: 1.5;
          }
          
          .prose blockquote {
            border-left: 4px solid #f59e0b;
            padding-left: 1rem;
            padding-top: 0.5rem;
            padding-bottom: 0.5rem;
            margin: 1rem 0;
            background-color: rgba(245, 158, 11, 0.1);
            border-radius: 0 0.375rem 0.375rem 0;
          }
          
          .prose blockquote h1,
          .prose blockquote h2,
          .prose blockquote h3,
          .prose blockquote h4,
          .prose blockquote h5,
          .prose blockquote h6 {
            color: #d1d5db;
          }
          
          .prose blockquote p {
            color: #d1d5db;
            margin-bottom: 0.5rem;
          }
          
          .prose blockquote ul {
            margin-bottom: 0.5rem;
          }
          
          .prose blockquote li {
            margin-left: 1rem;
          }
          
          .prose img {
            max-width: 100%;
            height: auto;
            border-radius: 0.5rem;
            margin: 1rem 0;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
          }
          
          .prose pre {
            background-color: #111827;
            color: #f3f4f6;
            padding: 1rem;
            border-radius: 0.5rem;
            overflow-x: auto;
            margin: 1rem 0;
            line-height: 1.5;
            font-size: 16px;
          }
          
          .prose code {
            background-color: #374151;
            color: #f3f4f6;
            padding: 0.25rem 0.5rem;
            border-radius: 0.25rem;
            font-size: 0.875rem;
            font-family: 'Courier New', monospace;
          }
          
          .prose pre code {
            background-color: transparent;
            padding: 0;
            border-radius: 0;
            font-size: 16px;
            line-height: 1.5;
            display: block;
          }
          
          /* Solidity syntax highlighting */
          .text-gray-500 {
            color: #6b7280 !important;
            font-style: italic;
          }
          
          .text-green-400 {
            color: #4ade80 !important;
          }
          
          .text-blue-300 {
            color: #93c5fd !important;
          }
          
          .text-blue-400 {
            color: #60a5fa !important;
            font-weight: 600;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="content-box">
            <div class="prose" id="content">
            </div>
          </div>
        </div>
        <script>
          const titleHtml = ${moduleNumber && lessonNumber ? `'<h1 style="font-size: 1.875rem; font-weight: 700; margin-bottom: 1.5rem; margin-top: 0; color: #ffffff; border-bottom: 1px solid #374151; padding-bottom: 1rem;">Lesson ${moduleNumber}.${lessonNumber} ${title}</h1>'` : `''`};
          document.getElementById('content').innerHTML = titleHtml + \`${html.replace(/`/g, '\\`')}\`;
        </script>
      </body>
      </html>
    `);
    newWindow.document.close();
  }
}
