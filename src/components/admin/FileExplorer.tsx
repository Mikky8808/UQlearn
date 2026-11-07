import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { 
  FileCode, 
  Search, 
  RefreshCw, 
  Copy, 
  Check, 
  Download, 
  ShieldCheck, 
  Code2, 
  ExternalLink,
  Lock,
  CheckCircle2, 
  AlertTriangle, 
  FolderOpen, 
  ArrowUpDown,
  CloudUpload,
  Send,
  CheckSquare,
  Square,
  X,
  FileCheck,
  UploadCloud,
  Terminal,
  Info
} from 'lucide-react';
import { localApiFetch, API_BASE_URL } from '../../lib/apiConfig';

export interface LocalFileItem {
  name: string;
  relativePath: string;
  size: number;
  lines: number;
  lastModified: string;
  extension: string;
  isProtected: boolean;
  category: string;
}

export interface FileExplorerProps {
  initialSelectedFile?: string;
  onFileSelect?: (file: LocalFileItem) => void;
  compact?: boolean;
}

const MAX_SELECT_LIMIT = 20;
const DEFAULT_DEPLOY_ENDPOINT = 'https://uqlearn.org/api/v1/deploy.php';
const DEFAULT_DEPLOY_KEY = 'cubiclink_sync_secret_2026';

export const FileExplorer: React.FC<FileExplorerProps> = ({
  initialSelectedFile = 'courses.php',
  onFileSelect,
  compact = false
}) => {
  const [files, setFiles] = useState<LocalFileItem[]>([]);
  const [previewFileName, setPreviewFileName] = useState<string>(initialSelectedFile);
  const [fileContent, setFileContent] = useState<string>('');
  const [previewFileMeta, setPreviewFileMeta] = useState<LocalFileItem | null>(null);

  // Multi-selection states (Maximum 20 files)
  const [selectedFileNames, setSelectedFileNames] = useState<string[]>([]);
  const [selectionNotice, setSelectionNotice] = useState<string | null>(null);

  // Data loading states
  const [isLoadingList, setIsLoadingList] = useState(true);
  const [isLoadingContent, setIsLoadingContent] = useState(false);

  // Search, filter & sort states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [sortBy, setSortBy] = useState<'name' | 'size' | 'lines'>('name');

  // Viewer options
  const [wordWrap, setWordWrap] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedPath, setCopiedPath] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Deploy Modal & Transfer states
  const [isDeployModalOpen, setIsDeployModalOpen] = useState(false);
  const [deployEndpoint, setDeployEndpoint] = useState(DEFAULT_DEPLOY_ENDPOINT);
  const [deployKey, setDeployKey] = useState(DEFAULT_DEPLOY_KEY);
  const [transferMode, setTransferMode] = useState<'multipart' | 'json'>('multipart');
  const [isTransferring, setIsTransferring] = useState(false);
  const [transferProgress, setTransferProgress] = useState(0);
  const [transferLogs, setTransferLogs] = useState<Array<{ msg: string; type: 'info' | 'success' | 'warn' | 'error' }>>([]);
  const [transferResult, setTransferResult] = useState<{
    success: boolean;
    updated: string[];
    skipped: string[];
    errors: string[];
  } | null>(null);

  const lineNumbersRef = useRef<HTMLDivElement>(null);

  // 1. Fetch File List from local workspace /api/v1
  const fetchFiles = useCallback(async () => {
    setIsLoadingList(true);
    setErrorMsg(null);
    try {
      const res = await localApiFetch('/api/v1/workspace/local-php-files');
      if (res && res.success && Array.isArray(res.files)) {
        setFiles(res.files);
        // Default select file if not selected yet
        if (!previewFileName && res.files.length > 0) {
          const defaultFile = res.files.find((f: LocalFileItem) => f.name === 'courses.php') || res.files[0];
          setPreviewFileName(defaultFile.name);
        }
      } else {
        setErrorMsg(res?.message || 'Failed to list local PHP files');
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Could not communicate with local workspace backend');
    } finally {
      setIsLoadingList(false);
    }
  }, [previewFileName]);

  useEffect(() => {
    fetchFiles();
  }, [fetchFiles]);

  // 2. Fetch specific file content when preview selection changes
  const loadFileContent = useCallback(async (fileName: string) => {
    if (!fileName) return;
    setIsLoadingContent(true);
    setCopiedCode(false);
    try {
      const res = await localApiFetch(`/api/v1/workspace/local-php-file?name=${encodeURIComponent(fileName)}`);
      if (res && res.success && typeof res.content === 'string') {
        setFileContent(res.content);
        const meta: LocalFileItem = {
          name: res.name,
          relativePath: res.path,
          size: res.size,
          lines: res.lines,
          lastModified: res.lastModified,
          extension: fileName.split('.').pop() || 'php',
          isProtected: Boolean(res.isProtected),
          category: ''
        };
        setPreviewFileMeta(meta);
        if (onFileSelect) onFileSelect(meta);
      } else {
        setFileContent(`// Error reading file: ${res?.message || 'File not available'}`);
      }
    } catch (err: any) {
      setFileContent(`// Error reading ${fileName}: ${err?.message || 'Network error'}`);
    } finally {
      setIsLoadingContent(false);
    }
  }, [onFileSelect]);

  useEffect(() => {
    if (previewFileName) {
      loadFileContent(previewFileName);
    }
  }, [previewFileName, loadFileContent]);

  // 3. Multi-selection helpers (Max 20 files)
  const isProtectedFile = (name: string) => {
    const norm = name.toLowerCase().trim();
    return norm === 'deploy.php' || norm === 'db.php' || norm === 'root_deploy.php';
  };

  const handleToggleSelectFile = (fileName: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();

    if (isProtectedFile(fileName)) {
      setSelectionNotice(`'${fileName}' is a protected core file and cannot be selected for deployment.`);
      setTimeout(() => setSelectionNotice(null), 3000);
      return;
    }

    if (selectedFileNames.includes(fileName)) {
      setSelectedFileNames(prev => prev.filter(name => name !== fileName));
      setSelectionNotice(null);
    } else {
      if (selectedFileNames.length >= MAX_SELECT_LIMIT) {
        setSelectionNotice(`Maximum limit reached: You can select up to ${MAX_SELECT_LIMIT} files at a time.`);
        setTimeout(() => setSelectionNotice(null), 4000);
        return;
      }
      setSelectedFileNames(prev => [...prev, fileName]);
      setSelectionNotice(null);
    }
  };

  // Categories list
  const categories = useMemo(() => {
    const set = new Set<string>();
    files.forEach(f => {
      if (f.category) set.add(f.category);
    });
    return ['All', ...Array.from(set).sort()];
  }, [files]);

  // Filtered and Sorted files
  const filteredFiles = useMemo(() => {
    let result = files.filter(f => {
      const matchesSearch = !searchQuery.trim() || 
        f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        f.category.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = selectedCategory === 'All' || f.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });

    result.sort((a, b) => {
      if (sortBy === 'size') return b.size - a.size;
      if (sortBy === 'lines') return b.lines - a.lines;
      return a.name.localeCompare(b.name);
    });

    return result;
  }, [files, searchQuery, selectedCategory, sortBy]);

  // Select all visible files up to 20
  const handleSelectAllVisible = () => {
    const selectable = filteredFiles
      .filter(f => !f.isProtected && !isProtectedFile(f.name))
      .map(f => f.name);

    const merged = Array.from(new Set([...selectedFileNames, ...selectable])).slice(0, MAX_SELECT_LIMIT);
    setSelectedFileNames(merged);
    if (selectable.length > MAX_SELECT_LIMIT) {
      setSelectionNotice(`Selected the maximum limit of ${MAX_SELECT_LIMIT} files.`);
      setTimeout(() => setSelectionNotice(null), 3000);
    }
  };

  const handleClearSelection = () => {
    setSelectedFileNames([]);
    setSelectionNotice(null);
  };

  // Total lines and stats
  const totalStats = useMemo(() => {
    const totalLines = files.reduce((acc, f) => acc + (f.lines || 0), 0);
    const totalBytes = files.reduce((acc, f) => acc + (f.size || 0), 0);
    const protectedCount = files.filter(f => f.isProtected).length;
    return {
      totalFiles: files.length,
      totalLines,
      totalKb: (totalBytes / 1024).toFixed(1),
      protectedCount
    };
  }, [files]);

  const handleCopyCode = () => {
    if (!fileContent) return;
    navigator.clipboard.writeText(fileContent);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleCopyPath = () => {
    navigator.clipboard.writeText(`api/v1/${previewFileName}`);
    setCopiedPath(true);
    setTimeout(() => setCopiedPath(false), 2000);
  };

  const handleDownloadFile = () => {
    if (!fileContent || !previewFileName) return;
    const blob = new Blob([fileContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = previewFileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Generate line numbers array for current viewer content
  const lineNumbers = useMemo(() => {
    const count = (fileContent || '').split('\n').length;
    return Array.from({ length: Math.max(1, count) }, (_, i) => i + 1);
  }, [fileContent]);

  // Selected files metadata summary
  const selectedFilesMeta = useMemo(() => {
    return files.filter(f => selectedFileNames.includes(f.name));
  }, [files, selectedFileNames]);

  const totalSelectedKb = useMemo(() => {
    const bytes = selectedFilesMeta.reduce((acc, f) => acc + (f.size || 0), 0);
    return (bytes / 1024).toFixed(1);
  }, [selectedFilesMeta]);

  // 4. Send / Transfer Files to https://uqlearn.org/api/v1/deploy.php
  const handleExecuteTransfer = async () => {
    if (selectedFileNames.length === 0) return;
    setIsTransferring(true);
    setTransferProgress(0);
    setTransferLogs([]);
    setTransferResult(null);

    const logs: Array<{ msg: string; type: 'info' | 'success' | 'warn' | 'error' }> = [];
    const addLog = (msg: string, type: 'info' | 'success' | 'warn' | 'error' = 'info') => {
      logs.push({ msg, type });
      setTransferLogs([...logs]);
    };

    addLog(`[TRANSFER] Initializing upload for ${selectedFileNames.length} selected files to ${deployEndpoint}...`, 'info');

    try {
      const filesPayload: Record<string, string> = {};
      for (let i = 0; i < selectedFileNames.length; i++) {
        const fname = selectedFileNames[i];
        if (isProtectedFile(fname)) {
          addLog(`[SKIP] 🛡️ Ignored protected file '${fname}'`, 'warn');
          continue;
        }

        addLog(`[READ] [${i + 1}/${selectedFileNames.length}] Reading local workspace 'api/v1/${fname}'...`, 'info');
        const fileRes = await localApiFetch(`/api/v1/workspace/local-php-file?name=${encodeURIComponent(fname)}`);
        if (fileRes && fileRes.success && typeof fileRes.content === 'string') {
          filesPayload[fname] = fileRes.content;
        } else {
          addLog(`[WARN] Could not retrieve content for '${fname}'`, 'warn');
        }
        setTransferProgress(Math.round(((i + 1) / (selectedFileNames.length * 2)) * 100));
      }

      const fileEntries = Object.entries(filesPayload);
      if (fileEntries.length === 0) {
        addLog('[ERROR] No valid file contents found to transfer.', 'error');
        setIsTransferring(false);
        return;
      }

      let targetUrl = deployEndpoint.trim() || DEFAULT_DEPLOY_ENDPOINT;
      const isLiveHost = typeof window !== 'undefined' && (window.location.hostname === 'uqlearn.org' || window.location.hostname.endsWith('.uqlearn.org'));
      const proxyUrl = (!isLiveHost && targetUrl.includes('/api/v1/deploy.php')) ? '/api/v1/deploy.php' : targetUrl;

      addLog(`[SEND] Packaging ${fileEntries.length} files using ${transferMode === 'multipart' ? 'Multipart Form Upload' : 'JSON Payload'}...`, 'info');

      const performRequest = async (url: string) => {
        if (transferMode === 'multipart') {
          const formData = new FormData();
          formData.append('deploy_key', deployKey.trim());
          fileEntries.forEach(([fname, code], index) => {
            const blob = new Blob([code], { type: 'text/plain;charset=utf-8' });
            formData.append('files[]', blob, fname);
            formData.append(`paths[${index}]`, fname);
          });
          return fetch(url, {
            method: 'POST',
            headers: { 'X-Deploy-Key': deployKey.trim() },
            body: formData
          });
        } else {
          return fetch(url, {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'X-Deploy-Key': deployKey.trim() 
            },
            body: JSON.stringify({ files: filesPayload, deploy_key: deployKey.trim() })
          });
        }
      };

      addLog(`[UPLOAD] Transmitting payload to server...`, 'info');
      let response = await performRequest(proxyUrl);
      
      if (!response.ok && proxyUrl !== targetUrl) {
        addLog(`[RETRY] Primary route returned HTTP ${response.status}. Retrying direct route...`, 'warn');
        response = await performRequest(targetUrl);
      }

      setTransferProgress(95);
      const resData = await response.json();
      setTransferProgress(100);

      if (response.ok && resData && resData.success) {
        addLog(`[SUCCESS] ✓ Server responded with SUCCESS!`, 'success');
        const updated = resData.updated_files || [];
        updated.forEach((f: string) => addLog(`  ├── ✓ Deployed: ${f}`, 'success'));
        if (resData.skipped_protected?.length > 0) {
          resData.skipped_protected.forEach((msg: string) => addLog(`  ├── 🛡️ ${msg}`, 'warn'));
        }
        setTransferResult({
          success: true,
          updated: updated,
          skipped: resData.skipped_protected || [],
          errors: resData.errors || []
        });
      } else {
        const err = resData?.error || resData?.message || `HTTP ${response.status}`;
        addLog(`[FAILED] Server rejected payload: ${err}`, 'error');
        setTransferResult({ success: false, updated: [], skipped: [], errors: [err] });
      }
    } catch (err: any) {
      addLog(`[ERROR] Transmission failed: ${err?.message || 'Network exception'}`, 'error');
      setTransferResult({ success: false, updated: [], skipped: [], errors: [err?.message || 'Network exception'] });
    } finally {
      setIsTransferring(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Overview */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950/70 to-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2 text-indigo-400 font-semibold text-xs tracking-wider uppercase mb-1">
              <FolderOpen className="w-4 h-4 text-emerald-400" />
              <span>Workspace File Explorer & Uploader</span>
            </div>
            <h1 className="text-2xl font-black text-white flex items-center gap-2">
              <FileCode className="w-7 h-7 text-indigo-400" />
              <span>Local PHP Files & Deployer</span>
              <span className="text-xs px-2.5 py-1 bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded-full font-mono font-medium">
                api/v1/
              </span>
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              Browse, inspect, and select up to 20 local PHP scripts to send directly to <code className="text-indigo-300 font-mono text-xs">https://uqlearn.org/api/v1/deploy.php</code>.
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              onClick={fetchFiles}
              disabled={isLoadingList}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 flex items-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer shadow-sm"
              title="Re-scan api/v1 folder"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoadingList ? 'animate-spin text-indigo-400' : ''}`} />
              <span>Refresh</span>
            </button>

            {/* Main Action: Send to uqlearn.org (Max 20) */}
            <button
              onClick={() => setIsDeployModalOpen(true)}
              disabled={selectedFileNames.length === 0}
              className={`px-4 py-2 text-xs font-bold rounded-xl border flex items-center gap-2 transition-all cursor-pointer shadow-md ${
                selectedFileNames.length > 0
                  ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white border-emerald-500/40 ring-2 ring-emerald-500/30 animate-pulse'
                  : 'bg-slate-800/80 text-slate-500 border-slate-700/60 cursor-not-allowed opacity-60'
              }`}
              title={selectedFileNames.length === 0 ? 'Select up to 20 files from the list below' : `Deploy ${selectedFileNames.length} selected files to uqlearn server`}
            >
              <CloudUpload className="w-4 h-4 text-emerald-300" />
              <span>Send to uqlearn.org ({selectedFileNames.length}/{MAX_SELECT_LIMIT})</span>
            </button>
          </div>
        </div>

        {/* Quick Stat Badges */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 pt-4 border-t border-slate-800/80">
          <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/60">
            <span className="text-[11px] text-slate-400 block font-medium">Total Files</span>
            <span className="text-lg font-bold text-white font-mono">{totalStats.totalFiles} files</span>
          </div>
          <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/60">
            <span className="text-[11px] text-slate-400 block font-medium">Selected for Upload</span>
            <span className="text-lg font-bold text-emerald-400 font-mono flex items-center gap-1.5">
              <span>{selectedFileNames.length} / {MAX_SELECT_LIMIT}</span>
              {selectedFileNames.length > 0 && (
                <span className="text-xs text-slate-400 font-normal">({totalSelectedKb} KB)</span>
              )}
            </span>
          </div>
          <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/60">
            <span className="text-[11px] text-slate-400 block font-medium">Directory Size</span>
            <span className="text-lg font-bold text-indigo-300 font-mono">{totalStats.totalKb} KB</span>
          </div>
          <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/60">
            <span className="text-[11px] text-slate-400 block font-medium">Protected Safeguards</span>
            <span className="text-lg font-bold text-amber-300 font-mono flex items-center gap-1">
              <ShieldCheck className="w-4 h-4 text-amber-400" />
              <span>{totalStats.protectedCount} files</span>
            </span>
          </div>
        </div>
      </div>

      {/* Dynamic Alerts / Selection Notice */}
      {selectionNotice && (
        <div className="p-3.5 bg-amber-950/60 border border-amber-800/80 rounded-xl text-xs text-amber-200 flex items-center justify-between animate-fadeIn">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
            <span>{selectionNotice}</span>
          </div>
          <button onClick={() => setSelectionNotice(null)} className="text-amber-400 hover:text-white">✕</button>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 bg-red-950/60 border border-red-800/80 rounded-xl text-xs text-red-200 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg(null)} className="text-red-400 hover:text-white">✕</button>
        </div>
      )}

      {/* Main Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: File Explorer with Multi-Selection (5 Cols) */}
        <div className="lg:col-span-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden flex flex-col h-[780px]">
          {/* Search, Filter & Multi-Selection Toolbar */}
          <div className="p-3.5 border-b border-slate-200 dark:border-slate-800 space-y-2.5 bg-slate-50 dark:bg-slate-900/80">
            {/* Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search PHP endpoints & schemas..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-8 py-1.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Selection Bar & Quick Actions */}
            <div className="flex items-center justify-between gap-2 pt-1 text-[11px] bg-slate-100 dark:bg-slate-950/60 p-2 rounded-xl border border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-700 dark:text-slate-200">
                  Selected: <span className="text-emerald-500 font-mono">{selectedFileNames.length}</span>/{MAX_SELECT_LIMIT}
                </span>
                {selectedFileNames.length >= MAX_SELECT_LIMIT && (
                  <span className="text-[9px] px-1.5 py-0.5 bg-rose-500/20 text-rose-300 border border-rose-500/40 rounded font-bold uppercase">
                    Max
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={handleSelectAllVisible}
                  className="px-2 py-1 text-[11px] font-semibold rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 transition-colors cursor-pointer"
                  title="Select up to 20 visible files"
                >
                  Select (up to 20)
                </button>

                {selectedFileNames.length > 0 && (
                  <button
                    onClick={handleClearSelection}
                    className="px-2 py-1 text-[11px] font-semibold rounded-lg bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                    title="Clear current selection"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>

            {/* Sort Controls */}
            <div className="flex items-center justify-between gap-2 text-[11px]">
              <div className="flex items-center gap-1 text-slate-500 dark:text-slate-400">
                <ArrowUpDown className="w-3 h-3" />
                <span>Sort:</span>
                <select
                  value={sortBy}
                  onChange={(e: any) => setSortBy(e.target.value)}
                  className="bg-transparent text-slate-700 dark:text-slate-300 font-semibold focus:outline-none cursor-pointer"
                >
                  <option value="name" className="bg-white dark:bg-slate-900">Name (A-Z)</option>
                  <option value="size" className="bg-white dark:bg-slate-900">Size (Largest)</option>
                  <option value="lines" className="bg-white dark:bg-slate-900">Lines (Most)</option>
                </select>
              </div>

              <span className="text-slate-400 font-mono text-[10px]">
                {filteredFiles.length} files available
              </span>
            </div>

            {/* Category Filter Pills */}
            <div className="flex gap-1.5 overflow-x-auto pb-1 text-[11px] scrollbar-none">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-2.5 py-1 rounded-lg shrink-0 font-medium transition-colors cursor-pointer ${
                    selectedCategory === cat
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-300 dark:hover:bg-slate-700'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Files List with Checkboxes */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60">
            {isLoadingList ? (
              <div className="p-8 text-center text-slate-400 text-xs space-y-2">
                <RefreshCw className="w-5 h-5 animate-spin mx-auto text-indigo-500" />
                <p>Loading files in api/v1...</p>
              </div>
            ) : filteredFiles.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                No matching PHP files found.
              </div>
            ) : (
              filteredFiles.map((file) => {
                const isPreviewed = previewFileName === file.name;
                const isSelected = selectedFileNames.includes(file.name);
                const isProtected = file.isProtected || isProtectedFile(file.name);

                return (
                  <div
                    key={file.name}
                    onClick={() => setPreviewFileName(file.name)}
                    className={`p-3 flex items-center justify-between cursor-pointer transition-all ${
                      isPreviewed
                        ? 'bg-indigo-50 dark:bg-indigo-950/40 border-l-4 border-indigo-600 text-indigo-900 dark:text-indigo-200'
                        : isSelected
                        ? 'bg-emerald-50/50 dark:bg-emerald-950/20 text-slate-900 dark:text-slate-200'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-800/50 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <div className="flex items-center space-x-3 min-w-0">
                      {/* Checkbox for Multi-Select */}
                      <button
                        type="button"
                        onClick={(e) => handleToggleSelectFile(file.name, e)}
                        disabled={isProtected}
                        className={`p-1 rounded-md transition-colors cursor-pointer ${
                          isProtected 
                            ? 'opacity-30 cursor-not-allowed' 
                            : 'hover:bg-slate-200 dark:hover:bg-slate-800'
                        }`}
                        title={
                          isProtected 
                            ? 'Protected system file (preserved on server)' 
                            : isSelected 
                            ? 'Click to deselect' 
                            : 'Click to select for upload'
                        }
                      >
                        {isSelected ? (
                          <CheckSquare className="w-4 h-4 text-emerald-500 fill-emerald-500/20" />
                        ) : (
                          <Square className={`w-4 h-4 ${isProtected ? 'text-slate-500' : 'text-slate-400'}`} />
                        )}
                      </button>

                      {isProtected ? (
                        <div title="Protected file (deploy.php & db.php are safeguarded)">
                          <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0" />
                        </div>
                      ) : (
                        <FileCode className={`w-4 h-4 shrink-0 ${isPreviewed ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'}`} />
                      )}

                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className={`text-xs font-mono font-medium truncate ${isPreviewed ? 'font-bold text-indigo-600 dark:text-indigo-300' : ''}`}>
                            {file.name}
                          </span>
                          {isProtected && (
                            <span className="text-[9px] px-1.5 py-0.2 bg-amber-500/10 text-amber-500 dark:text-amber-300 border border-amber-500/30 rounded font-mono shrink-0">
                              Protected
                            </span>
                          )}
                          {isSelected && !isProtected && (
                            <span className="text-[9px] px-1.5 py-0.2 bg-emerald-500/10 text-emerald-500 dark:text-emerald-300 border border-emerald-500/30 rounded font-mono font-bold shrink-0">
                              Selected
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-slate-400 block truncate">
                          {file.category}
                        </span>
                      </div>
                    </div>

                    <div className="text-right shrink-0 ml-2">
                      <span className="text-[10px] text-slate-400 font-mono block">
                        {(file.size / 1024).toFixed(1)} KB
                      </span>
                      <span className="text-[9px] text-slate-500 font-mono block">
                        {file.lines} lines
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* List Footer */}
          <div className="p-2.5 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 text-[11px] text-slate-500 flex justify-between items-center px-4">
            <span>Showing {filteredFiles.length} of {files.length} files</span>
            <span className="font-mono text-[10px]">Max selection: {MAX_SELECT_LIMIT}</span>
          </div>
        </div>

        {/* Right Column: Code Viewer / Inspector (7 Cols) */}
        <div className="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden flex flex-col h-[780px]">
          {/* File Action Toolbar */}
          <div className="p-3.5 bg-slate-100 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center space-x-2.5 min-w-0">
              <div className="p-1.5 bg-indigo-500/10 dark:bg-indigo-900/40 border border-indigo-500/20 rounded-lg text-indigo-600 dark:text-indigo-400">
                <Code2 className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-mono font-bold text-sm text-slate-900 dark:text-white truncate">
                    {previewFileName || 'No file selected'}
                  </h3>
                  {previewFileMeta?.isProtected && (
                    <span className="text-[10px] px-2 py-0.5 bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-md font-mono flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3" />
                      <span>Protected Core File</span>
                    </span>
                  )}
                  {selectedFileNames.includes(previewFileName) && (
                    <span className="text-[10px] px-2 py-0.5 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-md font-mono font-semibold flex items-center gap-1">
                      <Check className="w-3 h-3" />
                      <span>In Upload Batch</span>
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-400 font-mono truncate">
                  api/v1/{previewFileName} &bull; {(previewFileMeta?.size ? (previewFileMeta.size / 1024).toFixed(1) : 0)} KB &bull; {lineNumbers.length} lines
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Quick Select/Deselect button for currently viewed file */}
              {!isProtectedFile(previewFileName) && (
                <button
                  onClick={() => handleToggleSelectFile(previewFileName)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg border flex items-center gap-1.5 transition-colors cursor-pointer ${
                    selectedFileNames.includes(previewFileName)
                      ? 'bg-emerald-600/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-600/30'
                      : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                  title={selectedFileNames.includes(previewFileName) ? 'Remove from upload selection' : 'Add to upload selection'}
                >
                  {selectedFileNames.includes(previewFileName) ? (
                    <>
                      <CheckSquare className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Selected ({selectedFileNames.length}/{MAX_SELECT_LIMIT})</span>
                    </>
                  ) : (
                    <>
                      <Square className="w-3.5 h-3.5 text-slate-400" />
                      <span>Select File</span>
                    </>
                  )}
                </button>
              )}

              <button
                onClick={() => setWordWrap(!wordWrap)}
                className={`px-2.5 py-1.5 text-xs font-medium rounded-lg border transition-colors cursor-pointer ${
                  wordWrap
                    ? 'bg-indigo-600 text-white border-indigo-600'
                    : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
                title="Toggle line wrapping"
              >
                Wrap
              </button>

              <button
                onClick={handleCopyCode}
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm"
                title="Copy code to clipboard"
              >
                {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedCode ? 'Copied' : 'Copy'}</span>
              </button>

              <button
                onClick={handleDownloadFile}
                className="p-1.5 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg transition-colors cursor-pointer"
                title="Download file"
              >
                <Download className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Endpoint Details Banner */}
          <div className="px-4 py-2 bg-slate-50 dark:bg-slate-950/50 border-b border-slate-200 dark:border-slate-800/80 text-[11px] flex items-center justify-between text-slate-500 font-mono">
            <div className="flex items-center space-x-2 truncate">
              <span className="text-slate-400">Target Endpoint:</span>
              <a 
                href={`https://uqlearn.org/api/v1/${previewFileName}`} 
                target="_blank" 
                rel="noreferrer"
                className="text-indigo-400 hover:underline flex items-center gap-1 truncate"
              >
                <span>https://uqlearn.org/api/v1/{previewFileName}</span>
                <ExternalLink className="w-3 h-3 shrink-0" />
              </a>
            </div>
            <div className="flex items-center space-x-3 shrink-0 ml-2">
              <span className="text-slate-400">Read-Only Code Preview</span>
              <span className="text-slate-400">UTF-8</span>
            </div>
          </div>

          {/* Code Viewer Body with Line Numbers */}
          <div className="flex-1 bg-[#090d16] flex overflow-hidden relative font-mono text-[12px] leading-relaxed select-text">
            {isLoadingContent ? (
              <div className="w-full p-12 text-center text-slate-400 space-y-2 flex flex-col items-center justify-center">
                <RefreshCw className="w-6 h-6 animate-spin text-indigo-400" />
                <p>Loading code for {previewFileName}...</p>
              </div>
            ) : (
              <>
                {/* Line Numbers Gutter */}
                <div
                  ref={lineNumbersRef}
                  className="w-12 py-4 select-none bg-slate-950/80 text-slate-600 text-right pr-3 font-mono border-r border-slate-800/60 overflow-hidden shrink-0"
                >
                  {lineNumbers.map(n => (
                    <div key={n} className="leading-relaxed">
                      {n}
                    </div>
                  ))}
                </div>

                {/* Read-Only Code Container */}
                <div className="flex-1 relative overflow-auto p-4 text-sky-200/90">
                  <pre className={`${wordWrap ? 'whitespace-pre-wrap break-words' : 'whitespace-pre'}`}>
                    <code>{fileContent}</code>
                  </pre>
                </div>
              </>
            )}
          </div>

          {/* Code Footer */}
          <div className="p-2.5 bg-slate-100 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 text-[11px] text-slate-500 flex justify-between items-center px-4">
            <span className="font-mono flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>Workspace Synchronized</span>
            </span>
            <span className="font-mono text-[10px]">
              Modified: {previewFileMeta?.lastModified ? new Date(previewFileMeta.lastModified).toLocaleString() : 'N/A'}
            </span>
          </div>
        </div>
      </div>

      {/* DEPLOYMENT / TRANSFER MODAL */}
      {isDeployModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-2xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/80">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-xl border border-emerald-500/30">
                  <UploadCloud className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-white flex items-center gap-2">
                    <span>Deploy Selected Files</span>
                    <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-mono">
                      {selectedFileNames.length}/{MAX_SELECT_LIMIT} files
                    </span>
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Transfer selected PHP backend scripts to uqlearn.org workspace
                  </p>
                </div>
              </div>

              <button
                onClick={() => {
                  if (!isTransferring) setIsDeployModalOpen(false);
                }}
                disabled={isTransferring}
                className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors disabled:opacity-40"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto space-y-4">
              {/* Target Endpoint & Key */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-950/60 p-4 rounded-2xl border border-slate-800/80">
                <div>
                  <label className="text-[11px] font-bold text-slate-400 block mb-1">
                    Target Deploy Endpoint:
                  </label>
                  <input
                    type="text"
                    value={deployEndpoint}
                    onChange={(e) => setDeployEndpoint(e.target.value)}
                    disabled={isTransferring}
                    className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white font-mono focus:border-indigo-500 outline-none"
                    placeholder="https://uqlearn.org/api/v1/deploy.php"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-400 block mb-1">
                    X-Deploy-Key (Deploy Secret):
                  </label>
                  <input
                    type="password"
                    value={deployKey}
                    onChange={(e) => setDeployKey(e.target.value)}
                    disabled={isTransferring}
                    className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white font-mono focus:border-indigo-500 outline-none"
                    placeholder="cubiclink_sync_secret_2026"
                  />
                </div>
              </div>

              {/* Upload Method Selector */}
              <div className="flex items-center justify-between p-3 bg-slate-950/40 rounded-xl border border-slate-800 text-xs">
                <div className="flex items-center space-x-2 text-slate-300">
                  <Terminal className="w-4 h-4 text-indigo-400" />
                  <span className="font-semibold">Transfer Protocol:</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setTransferMode('multipart')}
                    disabled={isTransferring}
                    className={`px-3 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
                      transferMode === 'multipart'
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'bg-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    Multipart Upload ($_FILES)
                  </button>
                  <button
                    type="button"
                    onClick={() => setTransferMode('json')}
                    disabled={isTransferring}
                    className={`px-3 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
                      transferMode === 'json'
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'bg-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    JSON Payload
                  </button>
                </div>
              </div>

              {/* Selected Files Badge List */}
              <div>
                <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                  <span className="font-bold text-slate-300">Files Queued for Transfer ({selectedFileNames.length}):</span>
                  <span className="font-mono text-emerald-400">Total: {totalSelectedKb} KB</span>
                </div>
                <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto p-2.5 bg-slate-950 rounded-xl border border-slate-800/80">
                  {selectedFileNames.map(name => (
                    <span 
                      key={name}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-700 text-xs font-mono text-slate-200"
                    >
                      <FileCheck className="w-3.5 h-3.5 text-emerald-400" />
                      <span>{name}</span>
                    </span>
                  ))}
                </div>
              </div>

              {/* Progress & Live Logs */}
              {(isTransferring || transferLogs.length > 0) && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-slate-400">Transfer Progress:</span>
                    <span className="text-emerald-400 font-bold">{transferProgress}%</span>
                  </div>
                  <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-300"
                      style={{ width: `${transferProgress}%` }}
                    />
                  </div>

                  {/* Console Log Window */}
                  <div className="p-3 bg-black/90 rounded-xl border border-slate-800 font-mono text-[11px] max-h-48 overflow-y-auto space-y-1 select-text">
                    {transferLogs.map((log, idx) => (
                      <div 
                        key={idx} 
                        className={`leading-relaxed ${
                          log.type === 'success' ? 'text-emerald-400' :
                          log.type === 'error' ? 'text-rose-400 font-bold' :
                          log.type === 'warn' ? 'text-amber-400' :
                          'text-slate-300'
                        }`}
                      >
                        {log.msg}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Safeguard Notice */}
              <div className="p-3 bg-indigo-950/30 border border-indigo-900/40 rounded-xl text-[11px] text-indigo-300 flex items-start gap-2">
                <Info className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                <span>
                  <strong>Safe Deployment Guarantee:</strong> Files <code className="text-amber-300">deploy.php</code> and <code className="text-amber-300">db.php</code> are automatically excluded and protected on the remote server to prevent disruption.
                </span>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-950/80 border-t border-slate-800 flex items-center justify-between">
              <span className="text-xs text-slate-500 font-mono">
                {selectedFileNames.length} of {MAX_SELECT_LIMIT} files selected
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsDeployModalOpen(false)}
                  disabled={isTransferring}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl transition-colors disabled:opacity-40 cursor-pointer"
                >
                  {transferResult?.success ? 'Close' : 'Cancel'}
                </button>

                <button
                  type="button"
                  onClick={handleExecuteTransfer}
                  disabled={isTransferring || selectedFileNames.length === 0}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl flex items-center gap-2 transition-all disabled:opacity-40 cursor-pointer shadow-lg shadow-emerald-900/30"
                >
                  {isTransferring ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Transferring...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>Start Transfer ({selectedFileNames.length})</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FileExplorer;
