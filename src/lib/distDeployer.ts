/**
 * Dedicated Production Dist Deployment Utility
 * Enforces strict sequential 1-file-per-request transmission with base64 chunking
 * to prevent server timeouts, HTTP 413 / post_max_size errors, and file loss on cPanel shared hosting.
 */

export interface DeployFileProgress {
  path: string;
  size: number;
  currentFileIndex: number;
  totalFiles: number;
  status: 'pending' | 'uploading' | 'success' | 'error';
  chunks?: number;
  currentChunk?: number;
  latencyMs?: number;
  error?: string;
}

export interface DistDeployOptions {
  remoteUrl: string;
  deployKey: string;
  files: Record<string, string>; // path -> content (raw text string or base64)
  base64Files?: Record<string, string>;
  cleanAssets?: boolean;
  maxChunkSize?: number; // Default 300,000 base64 chars (~225 KB)
  onProgress?: (progress: DeployFileProgress) => void;
  onLog?: (message: string, level: 'info' | 'success' | 'cmd' | 'warn' | 'error') => void;
}

export interface DistDeployResult {
  success: boolean;
  totalFiles: number;
  deployedFiles: number;
  failedFiles: number;
  fileDetails: Array<{ path: string; size: number; success: boolean; latencyMs: number; error?: string }>;
}

export async function deployDistSequentially(options: DistDeployOptions): Promise<DistDeployResult> {
  const {
    remoteUrl,
    deployKey,
    files,
    base64Files = {},
    cleanAssets = false,
    maxChunkSize = 300000,
    onProgress,
    onLog
  } = options;

  const log = (msg: string, level: 'info' | 'success' | 'cmd' | 'warn' | 'error' = 'info') => {
    if (onLog) onLog(msg, level);
  };

  const fileKeys = Object.keys(files || {});
  const b64Keys = Object.keys(base64Files || {});

  // Build unified entry list, ensuring index.html and .htaccess upload LAST
  const entries: Array<{ path: string; isBase64: boolean; data: string }> = [
    ...fileKeys.map(p => ({ path: p, isBase64: false, data: files[p] })),
    ...b64Keys.map(p => ({ path: p, isBase64: true, data: base64Files[p] }))
  ].sort((a, b) => {
    const aIsEntry = a.path === 'index.html' || a.path === '.htaccess' ? 1 : 0;
    const bIsEntry = b.path === 'index.html' || b.path === '.htaccess' ? 1 : 0;
    return aIsEntry - bIsEntry;
  });

  const totalFiles = entries.length;
  if (totalFiles === 0) {
    log('[DIST DEPLOY] No dist files provided for upload.', 'warn');
    return { success: false, totalFiles: 0, deployedFiles: 0, failedFiles: 0, fileDetails: [] };
  }

  log(`[DIST DEPLOY] 📡 Starting sequential 1-file-per-request transmission of ${totalFiles} dist files to ${remoteUrl}...`, 'cmd');

  const fileDetails: Array<{ path: string; size: number; success: boolean; latencyMs: number; error?: string }> = [];
  let deployedFiles = 0;
  let failedFiles = 0;

  for (let i = 0; i < totalFiles; i++) {
    const item = entries[i];
    const rawData = item.data || '';

    // Convert text to base64 if needed to ensure clean binary/UTF-8 transport over HTTP JSON payload
    let b64Data = '';
    try {
      b64Data = item.isBase64 ? rawData : btoa(unescape(encodeURIComponent(rawData)));
    } catch {
      b64Data = btoa(rawData);
    }

    const totalChunks = Math.ceil(b64Data.length / maxChunkSize) || 1;
    const approxKb = ((b64Data.length * 0.75) / 1024).toFixed(2);
    const itemStartMs = Date.now();

    log(`  ├── [${i + 1}/${totalFiles}] Uploading dist/${item.path} (${approxKb} KB, ${totalChunks} ${totalChunks === 1 ? 'request' : 'chunks'})...`, 'info');

    if (onProgress) {
      onProgress({
        path: item.path,
        size: b64Data.length,
        currentFileIndex: i + 1,
        totalFiles,
        status: 'uploading',
        chunks: totalChunks,
        currentChunk: 1
      });
    }

    let fileSuccess = true;
    let fileErrorMsg = '';

    for (let c = 0; c < totalChunks; c++) {
      const chunkStr = b64Data.slice(c * maxChunkSize, (c + 1) * maxChunkSize);
      const chunkStartMs = Date.now();
      const isText = !item.isBase64 && totalChunks === 1;

      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 45000); // 45s timeout per request chunk

        const response = await fetch(remoteUrl, {
          method: 'POST',
          signal: controller.signal,
          headers: {
            'Content-Type': 'application/json',
            'X-Deploy-Key': deployKey
          },
          body: JSON.stringify({
            files: isText ? { [item.path]: rawData } : {},
            dist_files: isText ? { [item.path]: rawData } : {},
            base64_files: (!isText && totalChunks === 1) ? { [item.path]: b64Data } : {},
            chunk_file: item.path,
            chunk_data: chunkStr,
            chunk_index: c,
            total_chunks: totalChunks,
            clean_assets: (i === 0 && c === 0) ? cleanAssets : false,
            deploy_key: deployKey
          })
        });
        clearTimeout(timeoutId);

        const elapsedMs = Date.now() - chunkStartMs;

        if (!response.ok) {
          fileSuccess = false;
          fileErrorMsg = `HTTP ${response.status}`;
          log(`  │   └── ✕ Chunk ${c + 1}/${totalChunks} failed with HTTP ${response.status} (${elapsedMs}ms)`, 'error');
          break;
        }

        if (totalChunks > 1) {
          log(`  │   └── Chunk ${c + 1}/${totalChunks} synced (${elapsedMs}ms)`, 'info');
        }

        if (onProgress) {
          onProgress({
            path: item.path,
            size: b64Data.length,
            currentFileIndex: i + 1,
            totalFiles,
            status: 'uploading',
            chunks: totalChunks,
            currentChunk: c + 1
          });
        }
      } catch (err: any) {
        fileSuccess = false;
        fileErrorMsg = err.name === 'AbortError' ? 'Request timeout (45s)' : (err.message || 'Network error');
        log(`  │   └── ✕ Network failure on chunk ${c + 1}/${totalChunks}: ${fileErrorMsg}`, 'error');
        break;
      }
    }

    const totalLatencyMs = Date.now() - itemStartMs;
    if (fileSuccess) {
      deployedFiles++;
      log(`  │   └── ✓ Written dist/${item.path} (${totalLatencyMs}ms)`, 'success');
      fileDetails.push({ path: item.path, size: b64Data.length, success: true, latencyMs: totalLatencyMs });
      if (onProgress) {
        onProgress({
          path: item.path,
          size: b64Data.length,
          currentFileIndex: i + 1,
          totalFiles,
          status: 'success',
          chunks: totalChunks,
          currentChunk: totalChunks,
          latencyMs: totalLatencyMs
        });
      }
    } else {
      failedFiles++;
      fileDetails.push({ path: item.path, size: b64Data.length, success: false, latencyMs: totalLatencyMs, error: fileErrorMsg });
      if (onProgress) {
        onProgress({
          path: item.path,
          size: b64Data.length,
          currentFileIndex: i + 1,
          totalFiles,
          status: 'error',
          error: fileErrorMsg,
          latencyMs: totalLatencyMs
        });
      }
    }
  }

  const isOverallSuccess = failedFiles === 0 && deployedFiles > 0;
  log('====================================================', 'info');
  log(`[DIST DEPLOY] ${isOverallSuccess ? '🎉' : '⚠️'} Synchronization Finished: ${deployedFiles}/${totalFiles} files verified.`, isOverallSuccess ? 'success' : 'warn');

  return {
    success: isOverallSuccess,
    totalFiles,
    deployedFiles,
    failedFiles,
    fileDetails
  };
}
