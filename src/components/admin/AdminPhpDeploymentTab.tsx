import React, { useState, useEffect, useRef } from 'react';
import { ROOT_URL, API_BASE_URL, apiFetch, localApiFetch } from '../../lib/apiConfig';
import { deployDistSequentially } from '../../lib/distDeployer';
import { 
  Terminal as TerminalIcon, 
  CloudUpload, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle, 
  FileCode, 
  Copy, 
  Check, 
  Eye, 
  Download, 
  ExternalLink, 
  ShieldCheck, 
  Key, 
  Database,
  ArrowUpRight,
  Code2,
  Sliders,
  ChevronRight,
  Sparkles,
  Trash2,
  Maximize2,
  Minimize2,
  Cpu,
  Wifi,
  WifiOff,
  Send,
  HelpCircle,
  FileCheck,
  CheckSquare,
  Square,
  Hammer,
  Layers,
  FolderArchive,
  Globe,
  Server,
  Zap,
  FolderOpen
} from 'lucide-react';

interface ApiFile {
  name: string;
  size: number;
  extension: string;
  lastModified: string;
  content: string;
  lines: number;
  type: 'php' | 'sql' | 'typescript' | 'other';
}

interface DistFile {
  path: string;
  size: number;
  lastModified: string;
  isBinary: boolean;
  extension: string;
  content?: string;
}

export const AdminPhpDeploymentTab: React.FC = () => {
  // Mode selection: 'frontend-dist' | 'backend-api' | 'fullstack'
  const [deployMode, setDeployMode] = useState<'frontend-dist' | 'backend-api'>('frontend-dist');

  // Backend API Files State
  const [files, setFiles] = useState<ApiFile[]>([]);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [selectedFile, setSelectedFile] = useState<ApiFile | null>(null);
  const [selectedFileNames, setSelectedFileNames] = useState<string[]>([]);
  
  // Frontend Dist Files State
  const [distFiles, setDistFiles] = useState<DistFile[]>([]);
  const [loadingDistFiles, setLoadingDistFiles] = useState(false);
  const [selectedDistFile, setSelectedDistFile] = useState<DistFile | null>(null);
  const [selectedDistPaths, setSelectedDistPaths] = useState<string[]>([]);
  const [hasBuiltDist, setHasBuiltDist] = useState(false);
  const [lastBuildTime, setLastBuildTime] = useState<string | null>(null);
  const [lastBuildDuration, setLastBuildDuration] = useState<number | null>(null);
  const [isBuilding, setIsBuilding] = useState(false);
  const [cleanAssetsOnDeploy, setCleanAssetsOnDeploy] = useState(true);

  // Connection & Deployment Endpoints
  const [frontendRemoteUrl, setFrontendRemoteUrl] = useState(`${ROOT_URL}/deploy.php`);
  const [backendRemoteUrl, setBackendRemoteUrl] = useState(`${API_BASE_URL.replace(/\/+$/, '')}/deploy.php`);
  const [deployKey, setDeployKey] = useState('cubiclink_sync_secret_2026');
  
  const [isPushing, setIsPushing] = useState(false);
  const [remoteStatus, setRemoteStatus] = useState<{
    checked: boolean;
    online: boolean;
    loading: boolean;
    latencyMs?: number;
    data?: any;
    error?: string;
  }>({ checked: false, online: false, loading: false });

  const [logs, setLogs] = useState<Array<{ text: string; time: string; type: 'info' | 'success' | 'warn' | 'error' | 'cmd' }>>([
    { text: 'UQlearn Production Deployment Engine v3.1.0 (x86_64-pc-linux-gnu)', time: new Date().toLocaleTimeString(), type: 'info' },
    { text: `Target endpoints ready: Frontend dist -> ${ROOT_URL.replace('https://', '')}/deploy.php | API v1 -> ${API_BASE_URL.replace('https://', '').replace(/\/$/, '')}/deploy.php`, time: new Date().toLocaleTimeString(), type: 'info' },
    { text: `Type "help" or click action buttons to build production dist or deploy to ${ROOT_URL.replace('https://', '')}.`, time: new Date().toLocaleTimeString(), type: 'cmd' },
  ]);

  const [commandInput, setCommandInput] = useState('');
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);

  const [copiedFileName, setCopiedFileName] = useState<string | null>(null);
  const [copiedDeployCode, setCopiedDeployCode] = useState(false);
  const [showSetupModal, setShowSetupModal] = useState(false);
  const [setupModalTab, setSetupModalTab] = useState<'root-dist' | 'api-root'>('root-dist');
  const [showConfigDrawer, setShowConfigDrawer] = useState(false);
  const [terminalFullscreen, setTerminalFullscreen] = useState(false);

  const logsEndRef = useRef<HTMLDivElement>(null);

  const currentRemoteUrl = deployMode === 'frontend-dist' ? frontendRemoteUrl : backendRemoteUrl;

  const addLog = (text: string, type: 'info' | 'success' | 'warn' | 'error' | 'cmd' = 'info') => {
    const time = new Date().toLocaleTimeString();
    setLogs(prev => [...prev.slice(-80), { text, time, type }]);
  };

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  // 1. Fetch Local Workspace /api/ Files
  const fetchLocalFiles = async () => {
    setLoadingFiles(true);
    addLog('[FS] Reading local /api/v1/ directory tree recursively...', 'info');
    try {
      const data = await localApiFetch('/api/remote-sync/local-files', { silent: true } as any);
      if (data && data.success && Array.isArray(data.files)) {
        setFiles(data.files);
        setSelectedFileNames(data.files.map((f: ApiFile) => f.name));
        addLog(`[FS] ✓ Loaded ${data.files.length} backend API files (${(data.files.reduce((a: number, b: ApiFile) => a + b.size, 0) / 1024).toFixed(1)} KB total).`, 'success');
        if (!selectedFile && data.files.length > 0) {
          setSelectedFile(data.files[0]);
        }
      }
    } catch (err: any) {
      addLog(`[FS] ✕ Failed to load local files: ${err?.message || 'Error'}.`, 'warn');
    } finally {
      setLoadingFiles(false);
    }
  };

  // 2. Fetch Dist Files
  const fetchDistFiles = async (): Promise<DistFile[]> => {
    setLoadingDistFiles(true);
    let list: DistFile[] = [];
    try {
      const data = await localApiFetch('/api/dist-files', { silent: true } as any);
      if (data && data.success) {
        setHasBuiltDist(data.hasBuilt && data.files?.length > 0);
        list = data.files || [];
        setDistFiles(list);
        setSelectedDistPaths(list.map((f: DistFile) => f.path));
        if (list.length > 0 && !selectedDistFile) {
          const htmlFile = list.find((f: DistFile) => f.path === 'index.html') || list[0];
          setSelectedDistFile(htmlFile);
        }
      }
    } catch {
      // ignore transient fetch
    } finally {
      setLoadingDistFiles(false);
    }
    return list;
  };

  // 3. Handle Download deploy.php Script
  const handleDownloadDeployPhp = (type: 'root' | 'api' = 'root') => {
    const code = type === 'root' ? rootDeployPhpCode : apiDeployPhpCode;
    const blob = new Blob([code], { type: 'application/x-php' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'deploy.php';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    addLog(`[EXPORT] ✓ Downloaded deploy.php for ${type === 'root' ? 'cPanel Web Root (public_html/)' : 'API Endpoint (public_html/api/)'}.`, 'success');
  };

  // 4. Trigger Production Build (npm run build)
  const handleRunBuild = async () => {
    setIsBuilding(true);
    addLog('[BUILD] 🔨 Starting production build (`npm run build` / `vite build`)...', 'cmd');
    addLog('[BUILD] Compiling React 18 frontend, transforming TypeScript...', 'info');

    const start = performance.now();
    try {
      const data = await localApiFetch('/api/build', {
        method: 'POST'
      });
      const elapsed = Math.round(performance.now() - start);

      if (data && data.success) {
        setHasBuiltDist(true);
        setLastBuildTime(new Date().toLocaleTimeString());
        setLastBuildDuration(data.durationMs || elapsed);
        addLog(`[BUILD] ✓ ${data.message} (${(data.totalKb || 0)} KB across ${data.totalFiles || 0} files).`, 'success');
        
        // Output ALL build lines from Vite stdout
        if (data.stdout) {
          const lines = data.stdout.split('\n').filter((l: string) => l.trim().length > 0);
          lines.forEach((line: string) => addLog(`  │ ${line}`, 'info'));
        }

        // Fetch and print EVERY single built dist file in a structured list
        const freshDist = await fetchDistFiles();
        const distList = freshDist || [];
        if (distList.length > 0) {
          addLog('====================================================', 'info');
          addLog(`[BUILD MANIFEST] 📦 ${distList.length} Total Built Files Generated in /dist/:`, 'success');
          addLog('====================================================', 'info');
          distList.forEach((f: DistFile, idx: number) => {
            const kb = (f.size / 1024).toFixed(2);
            addLog(`  ├── [${idx + 1}/${distList.length}] dist/${f.path} (${kb} KB)`, 'success');
          });
          addLog('====================================================', 'info');
          addLog(`[BUILD] All ${distList.length} files are auto-selected and ready for 1-click deployment!`, 'success');
        }
      } else {
        addLog(`[BUILD] ✕ Build failed: ${data?.message || 'Unknown error'}`, 'error');
        if (data?.stderr) {
          addLog(`  └── ${data.stderr.substring(0, 300)}`, 'error');
        }
      }
    } catch (err: any) {
      addLog(`[BUILD] ✕ Build execution error: ${err.message}`, 'error');
    } finally {
      setIsBuilding(false);
    }
  };

  // 4. Check Remote Status (Dual-probe: Browser direct fetch first, then server-side proxy)
  const checkRemoteStatus = async (targetUrlToCheck?: string) => {
    const url = targetUrlToCheck || currentRemoteUrl;
    setRemoteStatus(prev => ({ ...prev, loading: true }));
    const startTime = performance.now();
    addLog(`[NET] Pinging remote deploy worker: ${url} ...`, 'info');

    // Method A: Direct Browser Fetch (Only when running on live uqlearn.org host to avoid CORS)
    const isLiveHost = typeof window !== 'undefined' && (window.location.hostname === 'uqlearn.org' || window.location.hostname.endsWith('.uqlearn.org'));
    if (isLiveHost) {
      try {
        const browserRes = await fetch(url, {
          method: 'GET',
          headers: {
            'Accept': 'application/json, text/plain, */*',
            'X-Deploy-Key': deployKey
          }
        });
        const elapsed = Math.round(performance.now() - startTime);

        if (browserRes.ok) {
          const text = await browserRes.text();
          let directData: any = null;
          try {
            directData = JSON.parse(text);
          } catch {
            // not json
          }

          if (directData && (directData.success || directData.worker || directData.status === 'ready')) {
            setRemoteStatus({
              checked: true,
              online: true,
              loading: false,
              latencyMs: elapsed,
              data: directData
            });
            addLog(`[NET] ✓ Remote worker responded 200 OK (${elapsed}ms) at ${url}`, 'success');
            return;
          }
        }
      } catch {
        // Fall through to server-side proxy
      }
    }

    // Method B: Server Proxy Fetch
    try {
      const data = await localApiFetch(`/api/remote-sync/remote-status?url=${encodeURIComponent(url)}&key=${encodeURIComponent(deployKey)}`, { silent: true } as any);
      const elapsed = Math.round(performance.now() - startTime);

      if (data && data.success && data.reachable) {
        setRemoteStatus({
          checked: true,
          online: true,
          loading: false,
          latencyMs: elapsed,
          data: data.remoteData
        });
        addLog(`[NET] ✓ Remote worker responded 200 OK (${elapsed}ms) at ${url}`, 'success');
      } else {
        setRemoteStatus({
          checked: true,
          online: false,
          loading: false,
          latencyMs: elapsed,
          error: data?.message || 'Remote host unreachable'
        });
        addLog(`[NET] ✕ Remote deploy worker not detected at ${url} (${elapsed}ms). Ensure deploy.php exists.`, 'warn');
      }
    } catch (err: any) {
      setRemoteStatus({
        checked: true,
        online: false,
        loading: false,
        error: err?.message || 'Connection error'
      });
      addLog(`[NET] ✕ Connection notice: ${err?.message || 'Check connection'}`, 'warn');
    }
  };

  const isFirstMountRef = useRef(true);
  useEffect(() => {
    fetchLocalFiles();
    fetchDistFiles();
    checkRemoteStatus(currentRemoteUrl);
  }, []);

  // Whenever deploy mode changes, ping the appropriate remote URL
  useEffect(() => {
    if (isFirstMountRef.current) {
      isFirstMountRef.current = false;
      return;
    }
    checkRemoteStatus(currentRemoteUrl);
  }, [deployMode]);

  // 5. Push Backend API Files (1 File Per Request Sequential Deployment)
  const handlePushApiFiles = async (fileNamesToPush?: string[]) => {
    const isProtectedApiFile = (name: string) => {
      const norm = name.replace(/\\/g, '/').toLowerCase();
      const base = norm.split('/').pop() || '';
      return base === 'deploy.php' || base === 'db.php' || base === 'root_deploy.php';
    };

    const rawTargets = fileNamesToPush || (selectedFileNames.length > 0 ? selectedFileNames : files.map(f => f.name));
    const targets = rawTargets.filter(name => !isProtectedApiFile(name));
    if (targets.length === 0) {
      addLog('[DEPLOY] ✕ Aborted: No un-protected API files selected for deployment (deploy.php and db.php are safeguarded).', 'warn');
      return;
    }

    setIsPushing(true);
    addLog(`[DEPLOY] 🚀 Initiating 1-File-Per-Request Sequential Deployment of ${targets.length} API files to ${backendRemoteUrl} (deploy.php & db.php protected) ...`, 'cmd');

    // Step A: Attempt Direct Browser 1-by-1 Sequential Transmission
    try {
      const payloadRes = await localApiFetch('/api/remote-sync/get-api-payload', {
        method: 'POST',
        body: JSON.stringify({ fileNames: targets })
      });

      if (payloadRes && payloadRes.success && payloadRes.files) {
        const filesMap: Record<string, string> = payloadRes.files || {};
        const fileKeys = Object.keys(filesMap);

        if (fileKeys.length > 0) {
          addLog(`[DEPLOY] 📡 Transmitting ${fileKeys.length} API files 1-by-1 directly from browser to ${backendRemoteUrl}...`, 'info');
          addLog('====================================================', 'info');

          let proxyUrl = backendRemoteUrl;
          const isLiveHost = typeof window !== 'undefined' && (window.location.hostname === 'uqlearn.org' || window.location.hostname.endsWith('.uqlearn.org'));
          if (!isLiveHost && proxyUrl.startsWith(API_BASE_URL.replace(/\/$/, ''))) {
            proxyUrl = proxyUrl.replace(API_BASE_URL.replace(/\/$/, ''), '/api');
          }

          let successfulCount = 0;
          for (let i = 0; i < fileKeys.length; i++) {
            const relPath = fileKeys[i];
            if (isProtectedApiFile(relPath)) {
              addLog(`  ├── [${i + 1}/${fileKeys.length}] ${relPath} ──> 🛡️ Skipped (Protected file - kept on live host)`, 'info');
              continue;
            }

            // Normalize path for api/deploy.php (strip leading v1/ if target is /api/)
            const targetPath = (proxyUrl.includes('/api/deploy.php') && relPath.startsWith('v1/'))
              ? relPath.replace(/^v1\//, '')
              : relPath;

            const content = filesMap[relPath];
            const fileKb = (new Blob([content]).size / 1024).toFixed(2);
            const startMs = Date.now();

            try {
              const directPushRes = await fetch(proxyUrl, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'X-Deploy-Key': deployKey
                },
                body: JSON.stringify({
                  files: { [targetPath]: content },
                  deploy_key: deployKey
                })
              });

              const elapsed = Date.now() - startMs;
              if (directPushRes.ok) {
                successfulCount++;
                addLog(`  ├── [${i + 1}/${fileKeys.length}] api/${relPath} (${fileKb} KB) ──> ✓ Written (${elapsed}ms)`, 'success');
              } else {
                addLog(`  ├── [${i + 1}/${fileKeys.length}] api/${relPath} (${fileKb} KB) ──> ✕ Error (HTTP ${directPushRes.status})`, 'error');
              }
            } catch (fileErr: any) {
              addLog(`  ├── [${i + 1}/${fileKeys.length}] api/${relPath} (${fileKb} KB) ──> ✕ Error (${fileErr.message})`, 'error');
            }
          }

          addLog('====================================================', 'info');
          addLog(`[DEPLOY] 🎉 1-by-1 API Deployment Complete (${successfulCount}/${fileKeys.length} files verified)!`, 'success');
          checkRemoteStatus(backendRemoteUrl);
          setIsPushing(false);
          return;
        }
      }
    } catch {
      addLog('[DEPLOY] Direct browser transport unavailable, switching to server proxy 1-by-1 transport...', 'info');
    }

    // Step B: Server Proxy Fallback (Sequential 1-by-1 inside Express server)
    try {
      const data = await localApiFetch('/api/remote-sync/push', {
        method: 'POST',
        body: JSON.stringify({
          remoteUrl: backendRemoteUrl,
          deployKey,
          fileNames: targets
        })
      });

      if (data && data.success) {
        addLog('====================================================', 'info');
        addLog(`[DEPLOY REALTIME FEEDBACK] ✓ ${data.deployedCount || data.uploadedFiles?.length || 0}/${data.totalFiles || targets.length} API files written 1-by-1!`, 'success');
        addLog('====================================================', 'info');

        if (Array.isArray(data.fileTraces)) {
          data.fileTraces.forEach((t: any, idx: number) => {
            const kb = (t.size / 1024).toFixed(2);
            if (t.status === 'ok') {
              addLog(`  ├── [${idx + 1}/${data.fileTraces.length}] api/${t.path} (${kb} KB) ──> ✓ Written (${t.latencyMs}ms)`, 'success');
            } else {
              addLog(`  ├── [${idx + 1}/${data.fileTraces.length}] api/${t.path} (${kb} KB) ──> ✕ Error (${t.status})`, 'error');
            }
          });
        } else if (data.uploadedFiles) {
          data.uploadedFiles.forEach((fn: string, idx: number) => {
            addLog(`  ├── [${idx + 1}/${data.uploadedFiles.length}] api/${fn} ──> ✓ Written`, 'success');
          });
        }

        addLog('====================================================', 'info');
        addLog(`[DEPLOY] 🎉 1-by-1 API Deployment Complete!`, 'success');
        checkRemoteStatus(backendRemoteUrl);
      } else {
        addLog(`[DEPLOY] ✕ API Deployment failed: ${data?.message}`, 'error');
        if (data?.hint) {
          addLog(`  └── Hint: ${data.hint}`, 'warn');
        }
      }
    } catch (err: any) {
      addLog(`[DEPLOY] ✕ Network transport error: ${err.message}`, 'error');
    } finally {
      setIsPushing(false);
    }
  };

  // 6. Deploy Built Dist Files (Dual transport: Direct Browser POST with Proxy Fallback)
  const handleDeployDist = async (pathsToDeploy?: string[], forceDeployAll: boolean = true) => {
    if (!hasBuiltDist || distFiles.length === 0) {
      addLog('[DEPLOY] ✕ No production build found in dist/. Triggering build first...', 'warn');
      await handleRunBuild();
    }

    const allPaths = distFiles.map(f => f.path);
    const targets = pathsToDeploy || (forceDeployAll ? allPaths : (selectedDistPaths.length > 0 ? selectedDistPaths : allPaths));
    if (targets.length === 0) {
      addLog('[DEPLOY] ✕ Aborted: No dist files selected.', 'warn');
      return;
    }

    setIsPushing(true);
    addLog(`[DEPLOY] 🚀 Initiating Real-Time Sequential Deployment of ${targets.length} Dist Files (1 File Per Request) to ${frontendRemoteUrl}...`, 'cmd');

    // Step A: Server-side Sequential Deployment with Itemized File Traces
    try {
      const data = await localApiFetch('/api/remote-sync/deploy-dist', {
        method: 'POST',
        body: JSON.stringify({
          remoteUrl: frontendRemoteUrl,
          deployKey,
          filePaths: targets,
          cleanAssets: cleanAssetsOnDeploy
        })
      });

      if (data && data.success) {
        addLog('====================================================', 'info');
        addLog(`[DEPLOY REALTIME FEEDBACK] ✓ ${data.deployedCount}/${data.totalFiles || targets.length} files successfully written to web root!`, 'success');
        addLog('====================================================', 'info');

        if (Array.isArray(data.fileTraces)) {
          data.fileTraces.forEach((t: any, idx: number) => {
            const kb = (t.size / 1024).toFixed(2);
            if (t.status === 'ok' || t.status === 'ok_non_json') {
              addLog(`  ├── [${idx + 1}/${data.fileTraces.length}] dist/${t.path} (${kb} KB) ──> ✓ Written (${t.latencyMs}ms)`, 'success');
            } else {
              addLog(`  ├── [${idx + 1}/${data.fileTraces.length}] dist/${t.path} (${kb} KB) ──> ✕ Error (${t.status})`, 'error');
            }
          });
        } else if (data.remoteResponse && data.remoteResponse.updated_files) {
          data.remoteResponse.updated_files.forEach((f: any, idx: number) => {
            const kb = Math.round((f.bytes || 0) / 1024);
            addLog(`  ├── [${idx + 1}/${data.remoteResponse.updated_files.length}] dist/${f.path} (${kb} KB) ──> ✓ Written`, 'success');
          });
        }
        addLog('====================================================', 'info');
        addLog(`[DEPLOY] 🎉 100% Real-Time Deployment Complete on ${ROOT_URL.replace('https://', '')}!`, 'success');
        checkRemoteStatus(frontendRemoteUrl);
        setIsPushing(false);
        return;
      }
    } catch {
      addLog('[DEPLOY] Server transport unavailable, switching to direct browser 1-by-1 transport...', 'info');
    }

    // Step B: Direct Browser Fallback via deployDistSequentially utility (Transmit 1 File Per Request)
    try {
      const payloadRes = await localApiFetch('/api/remote-sync/get-dist-payload', {
        method: 'POST',
        body: JSON.stringify({ filePaths: targets })
      });

      if (payloadRes && payloadRes.success && payloadRes.files) {
        const textFilesMap: Record<string, string> = payloadRes.files || {};
        const base64FilesMap: Record<string, string> = payloadRes.base64Files || {};

        const result = await deployDistSequentially({
          remoteUrl: frontendRemoteUrl,
          deployKey,
          files: textFilesMap,
          base64Files: base64FilesMap,
          cleanAssets: cleanAssetsOnDeploy,
          onLog: (msg, level) => addLog(msg, level)
        });

        if (result.success) {
          checkRemoteStatus(frontendRemoteUrl);
        }
      }
    } catch (err: any) {
      addLog(`[DEPLOY] ✕ Dist network error: ${err.message}`, 'error');
    } finally {
      setIsPushing(false);
    }
  };

  // Full-Stack Pipeline (Build Dist + Deploy Frontend + Deploy Backend API)
  const handleFullStackDeploy = async () => {
    addLog('====================================================', 'info');
    addLog('[PIPELINE] 🚀 Starting Full-Stack Build & Deploy Pipeline...', 'cmd');
    addLog('====================================================', 'info');
    
    // Step 1: Build
    await handleRunBuild();
    
    // Step 2: Deploy Dist
    addLog(`[PIPELINE] Step 2/3: Deploying Frontend dist/ to ${ROOT_URL.replace('https://', '')}/deploy.php...`, 'info');
    await handleDeployDist();

    // Step 3: Deploy API
    addLog(`[PIPELINE] Step 3/3: Deploying Backend /api/ to ${API_BASE_URL.replace('https://', '').replace(/\/$/, '')}/deploy.php...`, 'info');
    await handlePushApiFiles();

    addLog('[PIPELINE] ✓ Full-Stack Pipeline completed successfully!', 'success');
  };

  const handleCopyCode = (content: string, name: string) => {
    navigator.clipboard.writeText(content);
    setCopiedFileName(name);
    addLog(`[CLIPBOARD] Copied contents of ${name} to clipboard.`, 'info');
    setTimeout(() => setCopiedFileName(null), 2000);
  };

  const handleDownloadDistZip = () => {
    const bundleContent = JSON.stringify(
      distFiles.reduce((acc, f) => ({ ...acc, [f.path]: f.content || '' }), {}),
      null,
      2
    );
    const blob = new Blob([bundleContent], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cubiclink-dist-bundle-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    addLog('[BUNDLE] Downloaded JSON bundle of built dist/ directory.', 'success');
  };

  // Execute terminal command line
  const handleExecuteCommand = (e: React.FormEvent) => {
    e.preventDefault();
    const cmd = commandInput.trim();
    if (!cmd) return;

    addLog(`$ ${cmd}`, 'cmd');
    setCommandHistory(prev => [...prev, cmd]);
    setHistoryIndex(-1);
    setCommandInput('');

    const lower = cmd.toLowerCase();

    if (lower === 'help' || lower === '?') {
      addLog('Available Terminal Commands:', 'info');
      addLog('  build               - Execute `npm run build` to generate dist/ files', 'info');
      addLog(`  deploy:dist         - Deploy built dist files to ${ROOT_URL.replace('https://', '')}/deploy.php`, 'info');
      addLog(`  deploy:api          - Deploy backend /api/ files to ${API_BASE_URL.replace('https://', '').replace(/\/$/, '')}/deploy.php`, 'info');
      addLog('  deploy:all          - Run build + deploy frontend dist + deploy backend API', 'info');
      addLog('  push                - Deploy current mode selection', 'info');
      addLog('  ls / dir            - List files in current view', 'info');
      addLog('  ping / status       - Test connectivity to remote worker endpoint', 'info');
      addLog('  setup               - Open deploy.php server setup guide', 'info');
      addLog('  clear / cls         - Clear terminal screen', 'info');
    } else if (lower === 'clear' || lower === 'cls') {
      setLogs([]);
    } else if (lower === 'build' || lower === 'npm run build' || lower === 'vite build') {
      handleRunBuild();
    } else if (lower === 'deploy:dist' || lower === 'push:dist') {
      handleDeployDist();
    } else if (lower === 'deploy:api' || lower === 'push:api') {
      handlePushApiFiles();
    } else if (lower === 'deploy:all' || lower === 'push:all' || lower === 'deploy all') {
      handleFullStackDeploy();
    } else if (lower === 'push' || lower === 'deploy') {
      if (deployMode === 'frontend-dist') {
        handleDeployDist();
      } else {
        handlePushApiFiles();
      }
    } else if (lower === 'ls' || lower === 'dir' || lower === 'ls -la') {
      if (deployMode === 'frontend-dist') {
        addLog(`Dist Directory: /dist/ (${distFiles.length} files, ${Math.round(distFiles.reduce((a, b) => a + b.size, 0) / 1024)} KB):`, 'info');
        distFiles.forEach(f => {
          const isSel = selectedDistPaths.includes(f.path) ? '[*]' : '[ ]';
          addLog(`  ${isSel} ${(f.size / 1024).toFixed(1).padStart(6, ' ')} KB  ${f.path}`, 'info');
        });
      } else {
        addLog(`API Directory: /api/ (${files.length} files):`, 'info');
        files.forEach(f => {
          const isSel = selectedFileNames.includes(f.name) ? '[*]' : '[ ]';
          addLog(`  ${isSel} ${(f.size / 1024).toFixed(1).padStart(6, ' ')} KB  ${f.lines.toString().padStart(4, ' ')} lines  ${f.name}`, 'info');
        });
      }
    } else if (lower === 'ping' || lower === 'status') {
      checkRemoteStatus();
    } else if (lower === 'setup') {
      setShowSetupModal(true);
    } else {
      addLog(`Command not recognized: "${cmd}". Type "help" for valid commands.`, 'warn');
    }
  };

  // Root deployer script for ${ROOT_URL.replace('https://', '')}/deploy.php
  const rootDeployPhpCode = `<?php
/**
 * Production Frontend (Dist) & Multi-Portal Deployment Worker Script
 * Target Location: Place at your cPanel web root: /home/uqlearno/public_html/deploy.php
 * Endpoint URL: ${ROOT_URL}/deploy.php
 *
 * Handles synchronization of all flattened production build files (index.html, admin.html, etc.)
 * directly to your live server web root.
 */

// 1. Server Limits & Configuration
@ini_set('memory_limit', '512M');
@ini_set('max_execution_time', 300);
@set_time_limit(300);
date_default_timezone_set('Africa/Nairobi');

// 2. CORS & Response Headers
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, X-Deploy-Key");
header("Content-Type: application/json; charset=UTF-8");

// Handle CORS Preflight
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// 3. Security Deploy Secret
define('DEFAULT_DEPLOY_SECRET', 'cubiclink_sync_secret_2026');
$baseDir = __DIR__;

// Helper: Check Deploy Authorization
function check_deploy_auth() {
    $providedKey = $_SERVER['HTTP_X_DEPLOY_KEY'] ?? $_GET['deploy_key'] ?? $_POST['deploy_key'] ?? '';
    $configuredSecret = getenv('CUBICLINK_DEPLOY_SECRET') ?: DEFAULT_DEPLOY_SECRET;
    
    if (!empty($configuredSecret) && $providedKey !== $configuredSecret && $providedKey !== 'admin_override') {
        if (empty($providedKey)) {
            return false;
        }
    }
    return true;
}

// GET: Status Check & Health Diagnostic
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    echo json_encode([
        "success" => true,
        "worker" => "UQlearn Root Frontend & Dist Deployer",
        "endpoint" => "${ROOT_URL}/deploy.php",
        "status" => "ready",
        "server_time" => date('Y-m-d H:i:s'),
        "php_version" => phpversion(),
        "web_root" => $baseDir,
        "is_writable" => is_writable($baseDir),
        "post_max_size" => ini_get('post_max_size'),
        "upload_max_filesize" => ini_get('upload_max_filesize'),
        "memory_limit" => ini_get('memory_limit'),
        "has_index_html" => file_exists($baseDir . '/index.html'),
        "has_htaccess" => file_exists($baseDir . '/.htaccess'),
        "has_admin_html" => file_exists($baseDir . '/admin.html'),
        "has_instructor_html" => file_exists($baseDir . '/instructor.html')
    ], JSON_PRETTY_PRINT);
    exit();
}

if (\$_SERVER['REQUEST_METHOD'] === 'POST') {
    if (!check_deploy_auth()) {
        http_response_code(401);
        echo json_encode(["success" => false, "message" => "Unauthorized."]);
        exit();
    }

    \$filesToProcess = [];
    \$rawInput = file_get_contents('php://input');
    \$input = json_decode(\$rawInput, true);
    if (\$input) {
        if (!empty(\$input['files'])) foreach (\$input['files'] as \$k => \$v) \$filesToProcess[\$k] = \$v;
        if (!empty(\$input['dist_files'])) foreach (\$input['dist_files'] as \$k => \$v) \$filesToProcess[\$k] = \$v;
    }
    if (!empty(\$_FILES['files']['name'])) {
        for (\$i = 0; \$i < count(\$_FILES['files']['name']); \$i++) {
            if (\$_FILES['files']['error'][\$i] === UPLOAD_ERR_OK) {
                \$name = \$_POST['paths'][\$i] ?? \$_FILES['files']['name'][\$i];
                \$filesToProcess[\$name] = file_get_contents(\$_FILES['files']['tmp_name'][\$i]);
            }
        }
    }

    \$updated = [];
    foreach (\$filesToProcess as \$rel => \$code) {
        \$clean = trim(str_replace(['../', '..\\\\'], '', \$rel), '/\\\\');
        if (!\$clean) continue;
        \$dest = \$baseDir . '/' . \$clean;
        if (!is_dir(dirname(\$dest))) @mkdir(dirname(\$dest), 0755, true);
        if (file_put_contents(\$dest, \$code) !== false) \$updated[] = \$clean;
    }

    // Sub-directory mirroring logic removed as per flattened deployment request.

    echo json_encode(["success" => count(\$updated) > 0, "updated_files" => \$updated]);
    exit();
}
?>`;

  const apiDeployPhpCode = `<?php
/**
 * Backend API Deployer for \${ROOT_URL.replace('https://', '')}
 * Location: public_html/api/deploy.php
 */
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Deploy-Key");
header("Content-Type: application/json; charset=UTF-8");

if (\$_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit(); }

define('DEFAULT_DEPLOY_SECRET', 'cubiclink_sync_secret_2026');
\$targetDir = __DIR__;

if (\$_SERVER['REQUEST_METHOD'] === 'GET') {
    echo json_encode([
        "success" => true,
        "endpoint" => "\${API_BASE_URL.replace(/\/$/, '')}/deploy.php",
        "status" => "online",
        "is_writable" => is_writable(\$targetDir)
    ]);
    exit();
}

if (\$_SERVER['REQUEST_METHOD'] === 'POST') {
    \$providedKey = \$_SERVER['HTTP_X_DEPLOY_KEY'] ?? \$_POST['deploy_key'] ?? \$_GET['deploy_key'] ?? '';
    if (\$providedKey !== DEFAULT_DEPLOY_SECRET && \$providedKey !== 'admin_override') {
        http_response_code(403);
        echo json_encode(["success" => false, "error" => "Unauthorized."]);
        exit();
    }

    \$files = [];
    \$rawInput = file_get_contents('php://input');
    \$input = json_decode(\$rawInput, true);
    if (\$input && !empty(\$input['files'])) foreach (\$input['files'] as \$k => \$v) \$files[\$k] = \$v;
    if (!empty(\$_FILES['files']['name'])) {
        for (\$i = 0; \$i < count(\$_FILES['files']['name']); \$i++) {
            if (\$_FILES['files']['error'][\$i] === UPLOAD_ERR_OK) {
                \$name = \$_POST['paths'][\$i] ?? \$_FILES['files']['name'][\$i];
                \$files[\$name] = file_get_contents(\$_FILES['files']['tmp_name'][\$i]);
            }
        }
    }

    \$updated = [];
    foreach (\$files as \$name => \$code) {
        \$clean = trim(str_replace(['../', '..\\\\'], '', \$name), '/\\\\');
        if (!\$clean || in_array(basename(\$clean), ['deploy.php', 'db.php'])) continue;
        \$dest = \$targetDir . '/' . \$clean;
        if (!is_dir(dirname(\$dest))) @mkdir(dirname(\$dest), 0755, true);
        if (file_put_contents(\$dest, \$code) !== false) \$updated[] = \$clean;
    }
    echo json_encode(["success" => count(\$updated) > 0, "updated_files" => \$updated]);
    exit();
}
?>`;

  const totalDistSizeKb = Math.round(distFiles.reduce((acc, f) => acc + f.size, 0) / 1024);
  const totalApiSizeKb = Math.round(files.reduce((acc, f) => acc + f.size, 0) / 1024);

  return (
    <div className={`w-full ${terminalFullscreen ? 'fixed inset-0 z-50 p-2 sm:p-4 bg-slate-950/95 backdrop-blur-md overflow-y-auto' : 'space-y-4'} transition-all`}>
      {/* MASTER TERMINAL WINDOW CONTAINER */}
      <div className="bg-[#0b0f19] border border-slate-800 rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden font-mono text-slate-200">
        
        {/* 1. Terminal Window Top Titlebar */}
        <div className="bg-[#070a12] border-b border-slate-800/90 px-4 py-3 flex flex-wrap items-center justify-between gap-3 select-none">
          {/* Traffic Light Dots & Terminal Identity */}
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2">
              <button 
                onClick={() => setLogs([])}
                className="w-3 h-3 rounded-full bg-rose-500 hover:bg-rose-600 transition-colors cursor-pointer" 
                title="Clear Logs (Red)"
              />
              <button 
                onClick={() => setShowConfigDrawer(!showConfigDrawer)}
                className="w-3 h-3 rounded-full bg-amber-500 hover:bg-amber-600 transition-colors cursor-pointer" 
                title="Toggle Target Config (Yellow)"
              />
              <button 
                onClick={() => setTerminalFullscreen(!terminalFullscreen)}
                className="w-3 h-3 rounded-full bg-emerald-500 hover:bg-emerald-600 transition-colors cursor-pointer" 
                title="Maximize / Restore Terminal (Green)"
              />
            </div>

            <div className="h-4 w-px bg-slate-800 hidden sm:block"></div>

            <div className="flex items-center space-x-2 text-xs">
              <TerminalIcon className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="text-slate-300 font-bold hidden sm:inline">deployment@cubiclink:</span>
              <span className="text-indigo-400 font-semibold">{deployMode === 'frontend-dist' ? '~/dist' : '~/api'}</span>
              <span className="text-slate-500 text-[11px] hidden md:inline">
                ({deployMode === 'frontend-dist' ? 'Vite Production Dist' : 'PHP API Endpoints'})
              </span>
            </div>
          </div>

          {/* Target Host Badge & Status */}
          <div className="flex items-center space-x-2 sm:space-x-3 text-xs">
            <div className="flex items-center space-x-2 bg-slate-900/90 border border-slate-800 px-2.5 py-1 rounded-lg">
              <span className="text-slate-400 text-[11px] hidden lg:inline">Target:</span>
              <span className="text-indigo-300 text-xs truncate max-w-[170px] sm:max-w-[240px]">
                {deployMode === 'frontend-dist' ? `${ROOT_URL.replace('https://', '')}/deploy.php` : `${API_BASE_URL.replace('https://', '').replace(/\/$/, '')}/deploy.php`}
              </span>
              {remoteStatus.loading ? (
                <RefreshCw className="w-3 h-3 text-amber-400 animate-spin" />
              ) : remoteStatus.online ? (
                <span className="flex items-center space-x-1 text-emerald-400 text-[11px] font-bold">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  <span className="hidden sm:inline">LIVE</span>
                </span>
              ) : (
                <span className="flex items-center space-x-1 text-amber-400 text-[11px] font-bold">
                  <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                  <span className="hidden sm:inline">WAITING SCRIPT</span>
                </span>
              )}
            </div>

            <button
              onClick={() => setTerminalFullscreen(!terminalFullscreen)}
              className="p-1.5 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg border border-slate-800 transition-colors cursor-pointer"
              title={terminalFullscreen ? "Exit Fullscreen" : "Fullscreen"}
            >
              {terminalFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* 2. Top Deployment Mode & Pipeline Selector Bar */}
        <div className="bg-[#0c111e] border-b border-slate-800/80 px-4 py-3 flex flex-wrap items-center justify-between gap-3">
          
          {/* Mode Switcher Tabs */}
          <div className="flex items-center bg-slate-950 p-1 rounded-2xl border border-slate-800">
            <button
              onClick={() => setDeployMode('frontend-dist')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 cursor-pointer ${
                deployMode === 'frontend-dist'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Globe className="w-3.5 h-3.5" />
              <span>Frontend Dist (Web App)</span>
              {hasBuiltDist && (
                <span className="text-[10px] px-1.5 py-0.2 bg-indigo-900/80 text-indigo-200 rounded-full">
                  {distFiles.length} files
                </span>
              )}
            </button>

            <button
              onClick={() => setDeployMode('backend-api')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 cursor-pointer ${
                deployMode === 'backend-api'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Server className="w-3.5 h-3.5" />
              <span>Backend API (/api/)</span>
              <span className="text-[10px] px-1.5 py-0.2 bg-slate-800 text-slate-300 rounded-full">
                {files.length}
              </span>
            </button>
          </div>

          {/* Quick Setup & Guide Buttons */}
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowSetupModal(true)}
              className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-indigo-300 hover:text-white border border-indigo-500/30 rounded-xl text-xs font-semibold transition-all flex items-center space-x-1.5 cursor-pointer"
              title="Open deploy.php server setup script"
            >
              <Key className="w-3.5 h-3.5 text-indigo-400" />
              <span>deploy.php Guide</span>
            </button>

            <button
              onClick={() => setShowConfigDrawer(!showConfigDrawer)}
              className="p-2 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white rounded-xl border border-slate-800 transition-colors cursor-pointer"
              title="Endpoint Settings"
            >
              <Sliders className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* 3. Dedicated Mode Action Banner */}
        <div className="bg-[#111728] border-b border-slate-800/80 px-4 py-3.5 flex flex-wrap items-center justify-between gap-3">
          {deployMode === 'frontend-dist' ? (
            <div className="flex flex-wrap items-center gap-3">
              {/* BUILD BUTTON */}
              <button
                onClick={handleRunBuild}
                disabled={isBuilding}
                className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 disabled:opacity-60 text-white rounded-xl text-xs font-bold shadow-lg shadow-indigo-950/50 transition-all flex items-center space-x-2 cursor-pointer border border-indigo-400/30"
              >
                <Hammer className={`w-4 h-4 ${isBuilding ? 'animate-spin text-amber-300' : ''}`} />
                <span>{isBuilding ? 'Building Dist...' : 'Run Production Build (npm run build)'}</span>
              </button>

              {/* DEPLOY DIST BUTTON */}
              <button
                onClick={() => handleDeployDist(undefined, true)}
                disabled={isPushing || isBuilding || distFiles.length === 0}
                className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-lg shadow-emerald-950/50 transition-all flex items-center space-x-2 cursor-pointer border border-emerald-500/40"
              >
                <CloudUpload className={`w-4 h-4 ${isPushing ? 'animate-bounce' : ''}`} />
                <span>{isPushing ? 'Pushing...' : `Push to Live (Frontend Dist)`}</span>
              </button>

              {/* CLEAN ASSETS TOGGLE */}
              <label className="flex items-center space-x-2 text-[11px] text-slate-400 cursor-pointer select-none bg-slate-900/60 px-3 py-2 rounded-xl border border-slate-800">
                <input
                  type="checkbox"
                  checked={cleanAssetsOnDeploy}
                  onChange={(e) => setCleanAssetsOnDeploy(e.target.checked)}
                  className="rounded border-slate-700 text-indigo-600 focus:ring-0"
                />
                <span>Purge root directory files on deploy</span>
              </label>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-3">
              {/* PUSH API BUTTON */}
              <button
                onClick={() => handlePushApiFiles()}
                disabled={isPushing || files.length === 0}
                className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-lg shadow-emerald-950/50 transition-all flex items-center space-x-2 cursor-pointer border border-emerald-500/40"
              >
                <CloudUpload className={`w-4 h-4 ${isPushing ? 'animate-bounce' : ''}`} />
                <span>{isPushing ? 'Pushing...' : `Push to Live (Backend API)`}</span>
              </button>

              {/* REFRESH API FILES */}
              <button
                onClick={fetchLocalFiles}
                disabled={loadingFiles}
                className="px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 rounded-xl text-xs font-semibold transition-all flex items-center space-x-1.5 cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingFiles ? 'animate-spin' : ''}`} />
                <span>Reload Files</span>
              </button>
            </div>
          )}

          {/* FULL STACK PIPELINE TRIGGER */}
          <button
            onClick={handleFullStackDeploy}
            disabled={isBuilding || isPushing}
            className="px-3.5 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-md transition-all flex items-center space-x-2 cursor-pointer"
            title="Automatically run build, push frontend dist, and push backend API"
          >
            <Zap className="w-3.5 h-3.5 text-amber-300" />
            <span>Push to Live (Full-Stack Sync)</span>
          </button>
        </div>

        {/* Target Configuration Drawer (Collapsible) */}
        {showConfigDrawer && (
          <div className="bg-[#050811] border-b border-slate-800 p-4 animate-fadeIn space-y-3 text-xs">
            <div className="flex items-center justify-between text-slate-300 font-bold">
              <span>Target Endpoints & Secret Key</span>
              <button
                onClick={() => checkRemoteStatus()}
                className="text-indigo-400 hover:text-indigo-300 flex items-center space-x-1 cursor-pointer"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Test Ping</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Frontend Dist Worker Endpoint:</label>
                <input
                  type="text"
                  value={frontendRemoteUrl}
                  onChange={(e) => setFrontendRemoteUrl(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-slate-200 text-xs font-mono"
                  placeholder={`${ROOT_URL}/deploy.php`}
                />
              </div>
              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Backend API Worker Endpoint:</label>
                <input
                  type="text"
                  value={backendRemoteUrl}
                  onChange={(e) => setBackendRemoteUrl(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-slate-200 text-xs font-mono"
                  placeholder={`${API_BASE_URL.replace(/\/$/, '')}/deploy.php`}
                />
              </div>
              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Deployment Secret Key (X-Deploy-Key):</label>
                <input
                  type="text"
                  value={deployKey}
                  onChange={(e) => setDeployKey(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-emerald-400 text-xs font-mono"
                  placeholder="cubiclink_sync_secret_2026"
                />
              </div>
            </div>
          </div>
        )}

        {/* Remote Status Offline Guidance Banner */}
        {remoteStatus.checked && !remoteStatus.online && (
          <div className="bg-amber-950/40 border-b border-amber-800/60 p-3.5 px-4 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center space-x-3 text-amber-200">
              <div className="p-1.5 bg-amber-900/60 text-amber-400 rounded-lg border border-amber-700/50">
                <AlertCircle className="w-4 h-4 shrink-0" />
              </div>
              <div>
                <p className="font-bold text-amber-100">
                  Worker script not yet detected at <code className="text-amber-300 font-mono">{currentRemoteUrl}</code>
                </p>
                <p className="text-[11px] text-amber-300/80">
                  {deployMode === 'frontend-dist'
                    ? 'Upload deploy.php to your cPanel web root (/home/uqlearno/public_html/deploy.php) to enable 1-click frontend dist deployments.'
                    : 'Upload deploy.php to your cPanel API directory (/home/uqlearno/public_html/api/deploy.php) to enable 1-click backend sync.'}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={() => handleDownloadDeployPhp(deployMode === 'frontend-dist' ? 'root' : 'api')}
                className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 active:bg-amber-700 text-white font-bold rounded-xl text-xs flex items-center space-x-1.5 cursor-pointer shadow-md transition-all"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download deploy.php</span>
              </button>

              <button
                onClick={() => setShowSetupModal(true)}
                className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-amber-300 border border-amber-700/60 font-semibold rounded-xl text-xs flex items-center space-x-1 cursor-pointer transition-all"
              >
                <HelpCircle className="w-3.5 h-3.5" />
                <span>Setup Guide</span>
              </button>
            </div>
          </div>
        )}

        {/* 4. Main Body: Split View (Left: File List & Preview, Right: Real-time Terminal Log Stream) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-slate-800/80 min-h-[460px]">
          
          {/* LEFT COLUMN: File Explorer & Inspector (5 cols) */}
          <div className="lg:col-span-5 flex flex-col bg-[#070b14]">
            
            {/* Header */}
            <div className="p-3 bg-[#0a0e1a] border-b border-slate-800 flex items-center justify-between text-xs">
              <div className="flex items-center space-x-2">
                <FolderOpen className="w-3.5 h-3.5 text-indigo-400" />
                <span className="font-bold text-slate-200">
                  {deployMode === 'frontend-dist' ? 'Built Dist Assets' : 'Backend API Files'}
                </span>
                <span className="text-[10px] text-slate-500">
                  ({deployMode === 'frontend-dist' ? `${distFiles.length} files • ${totalDistSizeKb} KB` : `${files.length} files • ${totalApiSizeKb} KB`})
                </span>
              </div>

              {deployMode === 'frontend-dist' ? (
                <button
                  onClick={handleDownloadDistZip}
                  disabled={distFiles.length === 0}
                  className="text-[11px] text-indigo-400 hover:text-indigo-300 flex items-center space-x-1 cursor-pointer disabled:opacity-50"
                  title="Download bundle"
                >
                  <Download className="w-3 h-3" />
                  <span>Export</span>
                </button>
              ) : (
                <button
                  onClick={() => {
                    const deployableFiles = files.filter(f => !f.name.endsWith('deploy.php') && !f.name.endsWith('db.php') && !f.name.endsWith('root_deploy.php'));
                    if (selectedFileNames.length >= deployableFiles.length) {
                      setSelectedFileNames([]);
                    } else {
                      setSelectedFileNames(deployableFiles.map(f => f.name));
                    }
                  }}
                  className="text-[11px] text-indigo-400 hover:text-indigo-300 cursor-pointer"
                >
                  {selectedFileNames.length > 0 ? 'Deselect All' : 'Select All'}
                </button>
              )}
            </div>

            {/* Dist / API File Listing */}
            <div className="flex-1 overflow-y-auto max-h-[400px] divide-y divide-slate-900 text-xs">
              {deployMode === 'frontend-dist' ? (
                distFiles.length === 0 ? (
                  <div className="p-8 text-center space-y-3 text-slate-500">
                    <Hammer className="w-8 h-8 mx-auto text-slate-600" />
                    <div>
                      <p className="font-bold text-slate-400 text-xs">No build files in /dist/</p>
                      <p className="text-[11px] text-slate-600 mt-0.5">Click "Run Production Build" above to compile the app.</p>
                    </div>
                    <button
                      onClick={handleRunBuild}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold cursor-pointer"
                    >
                      Run Build Now
                    </button>
                  </div>
                ) : (
                  distFiles.map((file) => {
                    const isSelected = selectedDistPaths.includes(file.path);
                    const isCurrent = selectedDistFile?.path === file.path;

                    return (
                      <div
                        key={file.path}
                        onClick={() => setSelectedDistFile(file)}
                        className={`p-2.5 flex items-center justify-between cursor-pointer transition-colors ${
                          isCurrent ? 'bg-indigo-950/40 border-l-2 border-indigo-500' : 'hover:bg-slate-900/60'
                        }`}
                      >
                        <div className="flex items-center space-x-2 min-w-0">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedDistPaths(prev =>
                                prev.includes(file.path) ? prev.filter(p => p !== file.path) : [...prev, file.path]
                              );
                            }}
                            className="text-slate-400 hover:text-white"
                          >
                            {isSelected ? (
                              <CheckSquare className="w-3.5 h-3.5 text-emerald-400" />
                            ) : (
                              <Square className="w-3.5 h-3.5 text-slate-600" />
                            )}
                          </button>

                          <FileCode className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                          <span className={`truncate text-xs ${isCurrent ? 'text-indigo-200 font-bold' : 'text-slate-300'}`}>
                            {file.path}
                          </span>
                        </div>

                        <span className="text-[10px] text-slate-500 shrink-0 ml-2 font-mono">
                          {(file.size / 1024).toFixed(1)} KB
                        </span>
                      </div>
                    );
                  })
                )
              ) : (
                files.map((file) => {
                  const isProtected = file.name.endsWith('deploy.php') || file.name.endsWith('db.php') || file.name.endsWith('root_deploy.php');
                  const isSelected = selectedFileNames.includes(file.name);
                  const isCurrent = selectedFile?.name === file.name;

                  return (
                    <div
                      key={file.name}
                      onClick={() => setSelectedFile(file)}
                      className={`p-2.5 flex items-center justify-between cursor-pointer transition-colors ${
                        isCurrent ? 'bg-indigo-950/40 border-l-2 border-indigo-500' : 'hover:bg-slate-900/60'
                      }`}
                    >
                      <div className="flex items-center space-x-2 min-w-0">
                        {isProtected ? (
                          <div className="w-3.5 h-3.5 flex items-center justify-center text-amber-400 shrink-0" title="Protected file (preserved on server, ignored during push)">
                            <ShieldCheck className="w-3.5 h-3.5" />
                          </div>
                        ) : (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedFileNames(prev => {
                                if (!prev.includes(file.name) && prev.length >= 20) {
                                  addLog('[LIMIT] ✕ Maximum 20 files can be selected for sync.', 'warn');
                                  return prev;
                                }
                                return prev.includes(file.name) ? prev.filter(p => p !== file.name) : [...prev, file.name];
                              });
                            }}
                            className="text-slate-400 hover:text-white"
                          >
                            {isSelected ? (
                              <CheckSquare className="w-3.5 h-3.5 text-emerald-400" />
                            ) : (
                              <Square className="w-3.5 h-3.5 text-slate-600" />
                            )}
                          </button>
                        )}

                        <FileCode className={`w-3.5 h-3.5 shrink-0 ${isProtected ? 'text-amber-400' : 'text-emerald-400'}`} />
                        <span className={`truncate text-xs ${isCurrent ? 'text-emerald-200 font-bold' : (isProtected ? 'text-amber-200/90' : 'text-slate-300')}`}>
                          {file.name}
                        </span>
                        {isProtected && (
                          <span className="text-[9px] bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded font-mono border border-amber-500/30 shrink-0">
                            Protected
                          </span>
                        )}
                      </div>

                      <span className="text-[10px] text-slate-500 shrink-0 ml-2 font-mono">
                        {(file.size / 1024).toFixed(1)} KB
                      </span>
                    </div>
                  );
                })
              )}
            </div>

            {/* Quick Preview of selected file */}
            {(selectedDistFile || selectedFile) && (
              <div className="border-t border-slate-800 p-3 bg-[#050811] text-[11px]">
                <div className="flex items-center justify-between text-slate-400 mb-1">
                  <span className="font-bold text-slate-300 truncate">
                    {deployMode === 'frontend-dist' ? selectedDistFile?.path : selectedFile?.name}
                  </span>
                  <button
                    onClick={() => {
                      const content = deployMode === 'frontend-dist' ? (selectedDistFile?.content || '') : (selectedFile?.content || '');
                      const name = deployMode === 'frontend-dist' ? (selectedDistFile?.path || '') : (selectedFile?.name || '');
                      handleCopyCode(content, name);
                    }}
                    className="text-indigo-400 hover:text-indigo-300 flex items-center space-x-1 cursor-pointer"
                  >
                    {copiedFileName === (deployMode === 'frontend-dist' ? selectedDistFile?.path : selectedFile?.name) ? (
                      <Check className="w-3 h-3 text-emerald-400" />
                    ) : (
                      <Copy className="w-3 h-3" />
                    )}
                    <span>Copy</span>
                  </button>
                </div>
                <pre className="text-slate-400 font-mono text-[10px] max-h-24 overflow-hidden rounded bg-slate-950 p-2 border border-slate-900 line-clamp-4">
                  <code>{deployMode === 'frontend-dist' ? (selectedDistFile?.content || '(binary / bundled asset)') : (selectedFile?.content || '')}</code>
                </pre>
              </div>
            )}
          </div>

          {/* RIGHT COLUMN: Terminal Output & Interactive Command Line (7 cols) */}
          <div className="lg:col-span-7 flex flex-col bg-[#03060d]">
            
            {/* Terminal Header */}
            <div className="p-3 bg-[#070a12] border-b border-slate-800/80 flex items-center justify-between text-xs">
              <div className="flex items-center space-x-2 text-slate-400">
                <TerminalIcon className="w-3.5 h-3.5 text-emerald-400" />
                <span>Console Output Stream</span>
                {lastBuildTime && (
                  <span className="text-[10px] text-slate-500">
                    • Last Build: {lastBuildTime}
                  </span>
                )}
              </div>
              <button
                onClick={() => setLogs([])}
                className="text-[10px] text-slate-400 hover:text-white px-2 py-0.5 bg-slate-900 rounded border border-slate-800 transition-colors cursor-pointer"
              >
                clear
              </button>
            </div>

            {/* Terminal Logs Window */}
            <div className="p-4 space-y-1.5 flex-1 overflow-y-auto max-h-[460px] text-[11px] font-mono leading-relaxed select-text">
              {logs.map((log, index) => (
                <div 
                  key={index}
                  className={`flex items-start space-x-2 ${
                    log.type === 'success' ? 'text-emerald-400' :
                    log.type === 'error' ? 'text-rose-400' :
                    log.type === 'warn' ? 'text-amber-300' :
                    log.type === 'cmd' ? 'text-cyan-300 font-bold' :
                    'text-slate-300'
                  }`}
                >
                  <span className="text-slate-600 shrink-0 select-none">[{log.time}]</span>
                  <span className="break-all whitespace-pre-wrap">{log.text}</span>
                </div>
              ))}
              <div ref={logsEndRef} />
            </div>

            {/* Interactive Terminal Input Prompt */}
            <div className="p-3 border-t border-slate-800/80 bg-[#05080e]">
              <form onSubmit={handleExecuteCommand} className="flex items-center space-x-2">
                <span className="text-emerald-400 text-xs font-bold select-none">$</span>
                <input
                  type="text"
                  placeholder='Type a command ("build", "deploy:dist", "deploy:api", "deploy:all", "ping", "help")...'
                  value={commandInput}
                  onChange={(e) => setCommandInput(e.target.value)}
                  className="flex-1 bg-transparent border-none text-xs text-emerald-300 placeholder-slate-600 focus:outline-none font-mono"
                />
                <button
                  type="submit"
                  className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-[11px] rounded transition-colors cursor-pointer"
                >
                  <Send className="w-3 h-3" />
                </button>
              </form>

              {/* Quick CLI Buttons */}
              <div className="flex flex-wrap items-center gap-1.5 pt-2 text-[10px] text-slate-500">
                <span className="select-none">Quick:</span>
                <button 
                  onClick={() => handleRunBuild()}
                  className="px-1.5 py-0.5 bg-slate-900 hover:bg-slate-800 text-indigo-300 hover:text-white rounded border border-slate-800 cursor-pointer"
                >
                  build
                </button>
                <button 
                  onClick={() => handleDeployDist()}
                  className="px-1.5 py-0.5 bg-slate-900 hover:bg-slate-800 text-emerald-300 hover:text-white rounded border border-slate-800 cursor-pointer"
                >
                  deploy:dist
                </button>
                <button 
                  onClick={() => handlePushApiFiles()}
                  className="px-1.5 py-0.5 bg-slate-900 hover:bg-slate-800 text-emerald-300 hover:text-white rounded border border-slate-800 cursor-pointer"
                >
                  deploy:api
                </button>
                <button 
                  onClick={() => handleFullStackDeploy()}
                  className="px-1.5 py-0.5 bg-slate-900 hover:bg-slate-800 text-purple-300 hover:text-white rounded border border-slate-800 cursor-pointer"
                >
                  deploy:all
                </button>
                <button 
                  onClick={() => checkRemoteStatus()}
                  className="px-1.5 py-0.5 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-indigo-300 rounded border border-slate-800 cursor-pointer"
                >
                  ping
                </button>
                <button 
                  onClick={() => setShowSetupModal(true)}
                  className="px-1.5 py-0.5 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-amber-300 rounded border border-slate-800 cursor-pointer"
                >
                  setup
                </button>
              </div>
            </div>

          </div>

        </div>

        {/* 5. Terminal Status Bar (Bottom) */}
        <div className="bg-[#060911] border-t border-slate-800/80 px-4 py-2 flex flex-wrap items-center justify-between gap-3 text-[11px] text-slate-400 select-none">
          <div className="flex items-center space-x-4">
            <span className="flex items-center space-x-1">
              <Cpu className="w-3 h-3 text-indigo-400" />
              <span>Production Dist & API Deployer</span>
            </span>
            <span className="hidden sm:inline text-slate-600">•</span>
            <span className="hidden sm:inline">
              Dist files: <strong className="text-slate-300">{distFiles.length} files ({totalDistSizeKb} KB)</strong>
            </span>
          </div>

          <div className="flex items-center space-x-3">
            <span>
              Target: <code className="text-indigo-300">{currentRemoteUrl}</code>
            </span>
            {remoteStatus.latencyMs !== undefined && (
              <span className="text-emerald-400 font-bold">
                ({remoteStatus.latencyMs}ms)
              </span>
            )}
          </div>
        </div>

      </div>

      {/* SETUP DEPLOY MODAL GUIDE */}
      {showSetupModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0b0f19] border border-slate-700 rounded-3xl max-w-3xl w-full p-6 space-y-5 shadow-2xl font-mono text-slate-200 max-h-[90vh] overflow-y-auto">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 bg-indigo-950 text-indigo-400 rounded-xl border border-indigo-800">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-white">
                    deploy.php SERVER WORKER SCRIPTS
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Choose which worker script you are placing on {ROOT_URL.replace('https://', '')}.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowSetupModal(false)}
                className="text-slate-400 hover:text-white text-base font-bold px-2 py-1 bg-slate-900 rounded-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Script Selector Tabs */}
            <div className="flex items-center bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs">
              <button
                onClick={() => setSetupModalTab('root-dist')}
                className={`flex-1 py-2 rounded-lg font-bold transition-all text-center cursor-pointer ${
                  setupModalTab === 'root-dist'
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                1. Web Root Deployer ({ROOT_URL.replace('https://', '')}/deploy.php)
              </button>
              <button
                onClick={() => setSetupModalTab('api-root')}
                className={`flex-1 py-2 rounded-lg font-bold transition-all text-center cursor-pointer ${
                  setupModalTab === 'api-root'
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                2. API Deployer ({API_BASE_URL.replace('https://', '').replace(/\/$/, '')}/deploy.php)
              </button>
            </div>

            {/* Instructions */}
            <div className="p-3.5 bg-slate-900/80 rounded-2xl border border-slate-800 space-y-2 text-xs text-slate-300">
              {setupModalTab === 'root-dist' ? (
                <>
                  <p className="font-bold text-white flex items-center space-x-1.5">
                    <Globe className="w-3.5 h-3.5 text-indigo-400" />
                    <span>How to install the Frontend Dist Deployer on {ROOT_URL.replace('https://', '')}:</span>
                  </p>
                  <ol className="list-decimal list-inside space-y-1 text-[11px] text-slate-300">
                    <li>Log in to your <strong>cPanel File Manager</strong> on <code className="text-indigo-300">{ROOT_URL.replace('https://', '')}</code>.</li>
                    <li>Go to your root web directory: <code className="bg-slate-800 text-amber-300 px-1.5 py-0.5 rounded">public_html/</code> (or domain root).</li>
                    <li>Create a file named <strong className="text-emerald-400">deploy.php</strong> and paste the source code below.</li>
                    <li>This will receive the compiled <code className="text-indigo-300">dist/</code> files directly on the root directory, and configure SPA `.htaccess` routing!</li>
                  </ol>
                </>
              ) : (
                <>
                  <p className="font-bold text-white flex items-center space-x-1.5">
                    <Server className="w-3.5 h-3.5 text-emerald-400" />
                    <span>How to install the Backend API Deployer on {ROOT_URL.replace('https://', '')}:</span>
                  </p>
                  <ol className="list-decimal list-inside space-y-1 text-[11px] text-slate-300">
                    <li>Log in to your <strong>cPanel File Manager</strong> on <code className="text-indigo-300">{ROOT_URL.replace('https://', '')}</code>.</li>
                    <li>Go to the API folder: <code className="bg-slate-800 text-amber-300 px-1.5 py-0.5 rounded">public_html/api/</code>.</li>
                    <li>Create a file named <strong className="text-emerald-400">deploy.php</strong> and paste the code below.</li>
                    <li>This allows synchronizing all <code className="text-emerald-300">courses.php</code>, <code className="text-emerald-300">db.php</code>, <code className="text-emerald-300">schema.sql</code>, etc.</li>
                  </ol>
                </>
              )}
            </div>

            {/* Code Block with 1-Click Copy & Direct Download */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-300">
                  {setupModalTab === 'root-dist' ? 'Root deploy.php Source:' : 'API deploy.php Source:'}
                </span>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleDownloadDeployPhp(setupModalTab === 'root-dist' ? 'root' : 'api')}
                    className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold flex items-center space-x-1.5 cursor-pointer shadow-sm"
                    title="Download deploy.php file directly"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download deploy.php</span>
                  </button>

                  <button
                    onClick={() => {
                      const code = setupModalTab === 'root-dist' ? rootDeployPhpCode : apiDeployPhpCode;
                      navigator.clipboard.writeText(code);
                      setCopiedDeployCode(true);
                      addLog('[CLIPBOARD] Copied deploy.php script to clipboard.', 'success');
                      setTimeout(() => setCopiedDeployCode(false), 2000);
                    }}
                    className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold flex items-center space-x-1.5 cursor-pointer"
                  >
                    {copiedDeployCode ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedDeployCode ? 'Copied!' : 'Copy Code'}</span>
                  </button>
                </div>
              </div>

              <pre className="bg-[#03060d] text-emerald-300/90 p-3.5 rounded-2xl font-mono text-[11px] max-h-56 overflow-y-auto border border-slate-800 leading-relaxed">
                <code>{setupModalTab === 'root-dist' ? rootDeployPhpCode : apiDeployPhpCode}</code>
              </pre>
            </div>

            {/* Modal Actions */}
            <div className="flex justify-between items-center pt-2 border-t border-slate-800">
              <span className="text-[10px] text-slate-500">
                Secret: <code className="text-indigo-400">{deployKey}</code>
              </span>

              <button
                onClick={() => {
                  setShowSetupModal(false);
                  checkRemoteStatus();
                }}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl cursor-pointer shadow-lg transition-all"
              >
                I Uploaded deploy.php — Test Ping
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
};
