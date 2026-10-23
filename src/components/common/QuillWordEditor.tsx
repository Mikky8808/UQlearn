import React, { useEffect, useRef, useState, useId } from 'react';
import Quill from 'quill';
import 'quill/dist/quill.snow.css';
import { 
  Eye, 
  Edit3, 
  Code2, 
  Copy, 
  Check, 
  FileText, 
  Sparkles,
  Maximize2,
  Minimize2
} from 'lucide-react';

export interface QuillWordEditorProps {
  value: string;
  onChange: (content: string) => void;
  placeholder?: string;
  minHeight?: string;
  title?: string;
  readOnly?: boolean;
}

// Convert common markdown patterns to HTML for initial rendering if content is raw markdown
function markdownToHtml(md: string): string {
  if (!md) return '';
  // If it already contains HTML tags, preserve it
  if (/<[a-z][\s\S]*>/i.test(md)) {
    return md;
  }
  let html = md
    .replace(/^### (.*$)/gim, '<h3>$1</h3>')
    .replace(/^## (.*$)/gim, '<h2>$1</h2>')
    .replace(/^# (.*$)/gim, '<h1>$1</h1>')
    .replace(/^\> (.*$)/gim, '<blockquote>$1</blockquote>')
    .replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/gim, '<em>$1</em>')
    .replace(/~~(.*?)~~/gim, '<del>$1</del>')
    .replace(/`([^`]+)`/gim, '<code>$1</code>')
    .replace(/```([a-z]*)\n([\s\S]*?)```/gim, '<pre class="ql-syntax">$2</pre>')
    .replace(/^\- (.*$)/gim, '<ul><li>$1</li></ul>')
    .replace(/^\d+\. (.*$)/gim, '<ol><li>$1</li></ol>')
    .replace(/<\/ul>\s*<ul>/gim, '')
    .replace(/<\/ol>\s*<ol>/gim, '');

  // Wrap loose lines in paragraphs
  const paragraphs = html.split(/\n{2,}/).map(p => {
    const trimmed = p.trim();
    if (!trimmed) return '';
    if (/^<(h1|h2|h3|blockquote|ul|ol|pre)/i.test(trimmed)) return trimmed;
    return `<p>${trimmed.replace(/\n/g, '<br/>')}</p>`;
  });

  return paragraphs.filter(Boolean).join('');
}

export const QuillWordEditor: React.FC<QuillWordEditorProps> = ({
  value,
  onChange,
  placeholder = 'Type your lecture notes, study guide, or instructions here...',
  minHeight = '280px',
  title = 'Word Document & Lecture Notes Editor',
  readOnly = false
}) => {
  const editorContainerRef = useRef<HTMLDivElement>(null);
  const quillRef = useRef<Quill | null>(null);
  const isUpdatingRef = useRef<boolean>(false);
  const uniqueId = useId().replace(/:/g, '-');
  const toolbarId = `quill-toolbar-${uniqueId}`;

  const [activeTab, setActiveTab] = useState<'visual' | 'code' | 'preview'>('visual');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [stats, setStats] = useState({ words: 0, chars: 0 });

  // Compute stats from html or text
  const computeStats = (text: string) => {
    const cleanText = text.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    const words = cleanText ? cleanText.split(/\s+/).length : 0;
    const chars = cleanText.length;
    setStats({ words, chars });
  };

  // Initialize Quill instance
  useEffect(() => {
    if (!editorContainerRef.current) return;

    // Destroy any existing instance before recreation
    if (quillRef.current) {
      quillRef.current = null;
    }
    editorContainerRef.current.innerHTML = '';

    const editorDiv = document.createElement('div');
    editorContainerRef.current.appendChild(editorDiv);

    const quill = new Quill(editorDiv, {
      theme: 'snow',
      placeholder,
      readOnly,
      modules: {
        toolbar: `#${toolbarId}`,
        history: {
          delay: 1000,
          maxStack: 100,
          userOnly: true
        }
      }
    });

    quillRef.current = quill;

    // Load initial content
    const initialHtml = markdownToHtml(value || '');
    if (initialHtml) {
      quill.clipboard.dangerouslyPasteHTML(initialHtml);
    }
    computeStats(quill.getText());

    // Listen for text changes
    quill.on('text-change', () => {
      if (isUpdatingRef.current) return;
      const html = quill.root.innerHTML;
      computeStats(quill.getText());
      onChange(html === '<p><br></p>' ? '' : html);
    });

    return () => {
      quillRef.current = null;
      if (editorContainerRef.current) {
        editorContainerRef.current.innerHTML = '';
      }
    };
  }, [placeholder, readOnly, toolbarId]);

  // Synchronize value changes from external updates
  useEffect(() => {
    if (!quillRef.current) return;
    const currentHtml = quillRef.current.root.innerHTML;
    const normalizedIncoming = value || '';
    
    // Only update if substantially different to preserve cursor
    if (normalizedIncoming && normalizedIncoming !== currentHtml && !quillRef.current.hasFocus()) {
      isUpdatingRef.current = true;
      const formatted = markdownToHtml(normalizedIncoming);
      quillRef.current.clipboard.dangerouslyPasteHTML(formatted);
      computeStats(quillRef.current.getText());
      isUpdatingRef.current = false;
    } else if (!normalizedIncoming && currentHtml !== '<p><br></p>') {
      isUpdatingRef.current = true;
      quillRef.current.setText('');
      computeStats('');
      isUpdatingRef.current = false;
    }
  }, [value]);

  const handleCopy = () => {
    const textToCopy = value || '';
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleQuickInsert = (snippet: string) => {
    if (quillRef.current) {
      const range = quillRef.current.getSelection(true);
      quillRef.current.clipboard.dangerouslyPasteHTML(range ? range.index : 0, snippet);
    } else {
      onChange((value || '') + '\n' + snippet);
    }
  };

  return (
    <div 
      className={`bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm transition-all flex flex-col ${
        isFullscreen ? 'fixed inset-4 z-50 shadow-2xl rounded-3xl overflow-hidden' : ''
      }`}
      style={{ minHeight: isFullscreen ? 'auto' : undefined }}
    >
      {/* Top Header & Mode Navigation */}
      <div className="flex flex-wrap items-center justify-between px-4 py-2.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/60 rounded-t-2xl gap-2">
        <div className="flex items-center space-x-2">
          <div className="w-7 h-7 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
            <FileText className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-black text-slate-900 dark:text-slate-100 flex items-center space-x-1.5">
              <span>{title}</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 font-mono font-bold">Quill WYSIWYG</span>
            </h4>
          </div>
        </div>

        {/* View Switcher & Utility Actions */}
        <div className="flex items-center space-x-1.5 flex-wrap">
          {/* View Mode Buttons */}
          <div className="flex items-center p-0.5 bg-slate-200/80 dark:bg-slate-800/80 rounded-xl">
            <button
              type="button"
              onClick={() => setActiveTab('visual')}
              className={`px-3 py-1 rounded-lg text-xs font-bold flex items-center space-x-1.5 transition-all cursor-pointer ${
                activeTab === 'visual'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Visual Word</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('code')}
              className={`px-3 py-1 rounded-lg text-xs font-bold flex items-center space-x-1.5 transition-all cursor-pointer ${
                activeTab === 'code'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <Code2 className="w-3.5 h-3.5" />
              <span>HTML / Markdown</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('preview')}
              className={`px-3 py-1 rounded-lg text-xs font-bold flex items-center space-x-1.5 transition-all cursor-pointer ${
                activeTab === 'preview'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Learner View</span>
            </button>
          </div>

          {/* Quick Insert Preset Snippets */}
          <div className="hidden sm:flex items-center space-x-1">
            <button
              type="button"
              onClick={() => handleQuickInsert('<div class="p-3 bg-amber-50 border-l-4 border-amber-500 rounded text-amber-900 text-xs"><strong>⚠️ Key Takeaway:</strong> Pay close attention to this principle.</div>')}
              className="px-2 py-1 text-[11px] font-bold text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-all cursor-pointer flex items-center space-x-1"
              title="Insert Callout Note"
            >
              <Sparkles className="w-3 h-3 text-amber-500" />
              <span>Callout</span>
            </button>
            <button
              type="button"
              onClick={handleCopy}
              className="p-1.5 text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
              title="Copy content"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
            <button
              type="button"
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="p-1.5 text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
              title={isFullscreen ? 'Exit full screen' : 'Expand full screen'}
            >
              {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Quill Classic Word-Style Ribbon Toolbar */}
      <div 
        id={toolbarId} 
        className={`quill-word-ribbon border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-1.5 flex flex-wrap items-center gap-y-1 text-slate-700 dark:text-slate-200 ${
          activeTab !== 'visual' ? 'hidden' : ''
        }`}
      >
        {/* Headings & Font Sizes */}
        <span className="ql-formats">
          <select className="ql-header" defaultValue="">
            <option value="1">Heading 1</option>
            <option value="2">Heading 2</option>
            <option value="3">Heading 3</option>
            <option value="">Normal Text</option>
          </select>
          <select className="ql-size" defaultValue="">
            <option value="small">Small</option>
            <option value="">Normal</option>
            <option value="large">Large</option>
            <option value="huge">Huge</option>
          </select>
        </span>

        {/* Character Formatting */}
        <span className="ql-formats">
          <button type="button" className="ql-bold" title="Bold (Ctrl+B)" />
          <button type="button" className="ql-italic" title="Italic (Ctrl+I)" />
          <button type="button" className="ql-underline" title="Underline (Ctrl+U)" />
          <button type="button" className="ql-strike" title="Strikethrough" />
        </span>

        {/* Text & Background Color Pickers */}
        <span className="ql-formats">
          <select className="ql-color" title="Font Color" />
          <select className="ql-background" title="Highlight Color" />
        </span>

        {/* Subscript / Superscript */}
        <span className="ql-formats">
          <button type="button" className="ql-script" value="sub" title="Subscript" />
          <button type="button" className="ql-script" value="super" title="Superscript" />
        </span>

        {/* Paragraph Alignment */}
        <span className="ql-formats">
          <button type="button" className="ql-align" value="" title="Align Left" />
          <button type="button" className="ql-align" value="center" title="Align Center" />
          <button type="button" className="ql-align" value="right" title="Align Right" />
          <button type="button" className="ql-align" value="justify" title="Justify" />
        </span>

        {/* Lists & Indentation */}
        <span className="ql-formats">
          <button type="button" className="ql-list" value="ordered" title="Numbered List" />
          <button type="button" className="ql-list" value="bullet" title="Bullet List" />
          <button type="button" className="ql-indent" value="-1" title="Decrease Indent" />
          <button type="button" className="ql-indent" value="+1" title="Increase Indent" />
        </span>

        {/* Quotes, Code, Inserts */}
        <span className="ql-formats">
          <button type="button" className="ql-blockquote" title="Quote block" />
          <button type="button" className="ql-code-block" title="Code block" />
          <button type="button" className="ql-link" title="Insert Link" />
          <button type="button" className="ql-image" title="Insert Image" />
          <button type="button" className="ql-clean" title="Remove Formatting" />
        </span>
      </div>

      {/* Editor Content Surface */}
      <div className="flex-1 flex flex-col relative">
        {/* Tab 1: Visual Quill Canvas */}
        <div 
          className={`flex-1 flex flex-col ${activeTab === 'visual' ? 'block' : 'hidden'}`}
          style={{ minHeight: isFullscreen ? 'calc(100vh - 200px)' : minHeight }}
        >
          <div 
            ref={editorContainerRef} 
            className="quill-editor-wrapper flex-1 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
          />
        </div>

        {/* Tab 2: Raw Markdown / HTML Code Area */}
        {activeTab === 'code' && (
          <div 
            className="flex-1 flex flex-col p-4 bg-slate-950 text-slate-100 font-mono text-xs"
            style={{ minHeight: isFullscreen ? 'calc(100vh - 200px)' : minHeight }}
          >
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800 text-[11px] text-slate-400">
              <span>Direct HTML / Markdown Input Source</span>
              <span>Changes reflect automatically in Visual Word tab</span>
            </div>
            <textarea
              value={value || ''}
              onChange={(e) => onChange(e.target.value)}
              placeholder="Paste raw Markdown or HTML here..."
              className="w-full flex-1 bg-transparent text-emerald-400 font-mono text-xs focus:outline-none resize-none leading-relaxed"
              rows={12}
            />
          </div>
        )}

        {/* Tab 3: Learner Preview View */}
        {activeTab === 'preview' && (
          <div 
            className="flex-1 p-6 bg-slate-50 dark:bg-slate-950 overflow-y-auto"
            style={{ minHeight: isFullscreen ? 'calc(100vh - 200px)' : minHeight }}
          >
            <div className="max-w-3xl mx-auto bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 text-xs text-slate-400">
                <span className="font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">Learner Document Preview</span>
                <span>{stats.words} words • {stats.chars} characters</span>
              </div>
              <div 
                className="quill-rendered-preview prose prose-slate dark:prose-invert max-w-none text-slate-800 dark:text-slate-200 text-sm leading-relaxed"
                dangerouslySetInnerHTML={{ 
                  __html: value || '<em class="text-slate-400">No content entered yet. Start typing in Visual Word tab.</em>' 
                }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Footer Status Bar (Word style) */}
      <div className="flex items-center justify-between px-4 py-2 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400 rounded-b-2xl font-mono">
        <div className="flex items-center space-x-3">
          <span>{stats.words} Words</span>
          <span>•</span>
          <span>{stats.chars} Characters</span>
          <span className="hidden sm:inline">•</span>
          <span className="hidden sm:inline text-emerald-600 dark:text-emerald-400 font-bold">Auto-sync enabled</span>
        </div>
        <div className="text-[10px] text-slate-400">
          Microsoft Word Ribbon Enabled
        </div>
      </div>
    </div>
  );
};
