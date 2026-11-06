#!/usr/bin/env node
/**
 * UQlearn Production Pre-flight Diagnostic & Sync-Deploy Engine
 * 
 * Usage:
 *   npx tsx sync-deploy.ts [options]
 *   npm run deploy:check
 * 
 * Flags:
 *   --dry-run       Perform complete pre-flight check without uploading (default)
 *   --deploy        Perform pre-flight check and push build to remote deploy worker
 *   --build         Force clean rebuild (npm run build:shared-host) before checking
 *   --url <url>     Override target deploy worker URL (default: https://uqlearn.org/deploy.php)
 *   --key <secret>  Override deploy authentication key
 *   --check-json    Run JSON syntax & BOM diagnostic only
 *   --check-dist    Run dist/ production file verification only
 *   --probe-remote  Run remote deploy worker health check only
 *   --verbose       Show detailed file-by-file diagnostic output
 *   --help, -h      Show command-line documentation
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

// ANSI Colors for clean terminal UI
const C = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  bgRed: '\x1b[41m',
  bgGreen: '\x1b[42m',
};

const ROOT_DIR = process.cwd();
const DEFAULT_REMOTE_URL = process.env.DEPLOY_URL || 'https://uqlearn.org/deploy.php';
const DEFAULT_DEPLOY_KEY = process.env.DEPLOY_KEY || 'cubiclink_sync_secret_2026';

// Parsed CLI Arguments
const args = process.argv.slice(2);
const isDeploy = args.includes('--deploy') || args.includes('--push');
const isForceBuild = args.includes('--build') || args.includes('--fix-build');
const isVerbose = args.includes('--verbose') || args.includes('-v');
const checkJsonOnly = args.includes('--check-json');
const checkDistOnly = args.includes('--check-dist');
const probeRemoteOnly = args.includes('--probe-remote');
const showHelp = args.includes('--help') || args.includes('-h');

// Custom URL and Key flags
let customUrl = DEFAULT_REMOTE_URL;
const urlIdx = args.indexOf('--url');
if (urlIdx !== -1 && args[urlIdx + 1]) {
  customUrl = args[urlIdx + 1];
}

let deployKey = DEFAULT_DEPLOY_KEY;
const keyIdx = args.indexOf('--key');
if (keyIdx !== -1 && args[keyIdx + 1]) {
  deployKey = args[keyIdx + 1];
}

interface JsonDiagnosticResult {
  filePath: string;
  relativePath: string;
  valid: boolean;
  hasBom: boolean;
  size: number;
  error?: string;
  errorLine?: number;
  errorCol?: number;
  errorSnippet?: string;
}

interface DistVerificationResult {
  hasDist: boolean;
  requiredFilesMissing: string[];
  totalFiles: number;
  totalBytes: number;
  files: Array<{ path: string; size: number; isBinary: boolean; extension: string }>;
}

interface RemoteWorkerResult {
  reachable: boolean;
  httpStatus?: number;
  isJson: boolean;
  latencyMs: number;
  data?: any;
  error?: string;
  rawSnippet?: string;
}

function printHeader() {
  console.log('\n' + C.cyan + C.bold + '╔══════════════════════════════════════════════════════════════════════════════╗' + C.reset);
  console.log(C.cyan + C.bold + '║           UQlearn Production Pre-flight & Sync-Deploy Engine v3.1            ║' + C.reset);
  console.log(C.cyan + C.bold + '╚══════════════════════════════════════════════════════════════════════════════╝' + C.reset);
  console.log(` ${C.dim}Mode:${C.reset} ${isDeploy ? C.yellow + C.bold + 'LIVE DEPLOYMENT' : C.green + C.bold + 'PRE-FLIGHT DRY-RUN (Safe)'}${C.reset}  │  ${C.dim}Target:${C.reset} ${C.white}${customUrl}${C.reset}`);
  console.log(C.dim + '────────────────────────────────────────────────────────────────────────────────' + C.reset);
}

function printHelp() {
  console.log(`
${C.bold}UQlearn Deployment & Diagnostic Utility Script${C.reset}

${C.bold}COMMANDS:${C.reset}
  npx tsx sync-deploy.ts             Run full pre-flight verification (Dry-run mode)
  npx tsx sync-deploy.ts --deploy    Run pre-flight checks and push dist files to remote
  npm run deploy:check               Run automated local integrity & pre-flight diagnostics

${C.bold}OPTIONS:${C.reset}
  --dry-run          Verify local files, dist assets, JSON syntax, and worker connectivity without deploying
  --deploy           Trigger remote worker upload to live cPanel web root if all checks pass
  --build            Execute production build (npm run build:shared-host) before diagnostics
  --url <url>        Specify remote deploy.php URL (default: https://uqlearn.org/deploy.php)
  --key <secret>     Specify deploy secret authentication key
  --check-json       Run deep JSON syntax and Byte-Order-Mark (BOM) validator only
  --check-dist       Verify dist/ entry points and generated bundles only
  --probe-remote     Ping and validate remote worker JSON response without local file checks
  --verbose, -v      Show every file examined and detailed diagnostics
  --help, -h         Display this manual
`);
}

/**
 * PHASE 1: Deep JSON Syntax & BOM Diagnostics
 * Detects byte-level defects, trailing commas, BOM headers, and syntax errors
 * that trigger "Expected property name or '}' in JSON at position 1 (line 1 column 2)".
 */
function runJsonDiagnostics(dir: string = ROOT_DIR): JsonDiagnosticResult[] {
  const results: JsonDiagnosticResult[] = [];
  const ignoredDirs = new Set(['node_modules', '.git', 'dist', '.aistudio']);

  function walk(currentDir: string) {
    let entries: fs.Dirent[] = [];
    try {
      entries = fs.readdirSync(currentDir, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      if (entry.isDirectory()) {
        if (!ignoredDirs.has(entry.name)) {
          walk(path.join(currentDir, entry.name));
        }
      } else if (entry.isFile() && entry.name.toLowerCase().endsWith('.json')) {
        const fullPath = path.join(currentDir, entry.name);
        const relPath = path.relative(ROOT_DIR, fullPath).replace(/\\/g, '/');
        
        let rawBuffer: Buffer;
        try {
          rawBuffer = fs.readFileSync(fullPath);
        } catch (e: any) {
          results.push({
            filePath: fullPath,
            relativePath: relPath,
            valid: false,
            hasBom: false,
            size: 0,
            error: `Failed to read file: ${e.message}`,
          });
          continue;
        }

        // Check for UTF-8 Byte Order Mark (BOM: 0xEF, 0xBB, 0xBF)
        const hasBom = rawBuffer.length >= 3 && rawBuffer[0] === 0xEF && rawBuffer[1] === 0xBB && rawBuffer[2] === 0xBF;
        const text = hasBom ? rawBuffer.slice(3).toString('utf-8') : rawBuffer.toString('utf-8');

        try {
          JSON.parse(text);
          results.push({
            filePath: fullPath,
            relativePath: relPath,
            valid: true,
            hasBom,
            size: rawBuffer.length,
          });
        } catch (err: any) {
          const errMsg = err?.message || 'Syntax error in JSON';
          
          // Calculate line and column of syntax error
          let line = 1;
          let col = 1;
          const posMatch = errMsg.match(/position\s+(\d+)/i);
          if (posMatch) {
            const pos = parseInt(posMatch[1], 10);
            const sliceBefore = text.slice(0, pos);
            const lines = sliceBefore.split('\n');
            line = lines.length;
            col = lines[lines.length - 1].length + 1;
          }

          // Build context snippet
          const allLines = text.split('\n');
          const startLine = Math.max(0, line - 3);
          const endLine = Math.min(allLines.length, line + 2);
          const snippetLines: string[] = [];
          for (let i = startLine; i < endLine; i++) {
            const lineNum = (i + 1).toString().padStart(4, ' ');
            const pointer = i + 1 === line ? ' > ' : '   ';
            snippetLines.push(`${pointer}${lineNum} | ${allLines[i]}`);
            if (i + 1 === line && col > 0) {
              snippetLines.push(`        | ${' '.repeat(Math.max(0, col - 1))}^--- [ERROR HERE]`);
            }
          }

          results.push({
            filePath: fullPath,
            relativePath: relPath,
            valid: false,
            hasBom,
            size: rawBuffer.length,
            error: errMsg,
            errorLine: line,
            errorCol: col,
            errorSnippet: snippetLines.join('\n'),
          });
        }
      }
    }
  }

  walk(dir);
  return results;
}

/**
 * PHASE 2: Inspect and Verify Dist Files
 * Ensures all required entry points (index.html, admin.html, instructor.html, rev.html)
 * and .htaccess files exist.
 */
function inspectDistDirectory(): DistVerificationResult {
  const distDir = path.join(ROOT_DIR, 'dist');
  const requiredFiles = [
    'index.html',
    'admin/admin.html',
    'instructor/instructor.html',
    'rev/rev.html',
    '.htaccess',
    'admin/.htaccess',
    'instructor/.htaccess',
    'rev/.htaccess',
  ];

  if (!fs.existsSync(distDir)) {
    return {
      hasDist: false,
      requiredFilesMissing: requiredFiles,
      totalFiles: 0,
      totalBytes: 0,
      files: [],
    };
  }

  const missing: string[] = [];
  for (const req of requiredFiles) {
    const full = path.join(distDir, req);
    if (!fs.existsSync(full)) {
      missing.push(req);
    }
  }

  // Recursively collect all dist files
  const files: Array<{ path: string; size: number; isBinary: boolean; extension: string }> = [];
  let totalBytes = 0;

  function collect(dir: string) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        const rel = path.relative(distDir, full).replace(/\\/g, '/');
        if (rel === 'assets/aistudio' || rel === 'uploads' || rel === '.git') continue;
        collect(full);
      } else if (entry.isFile()) {
        const relPath = path.relative(distDir, full).replace(/\\/g, '/');
        if (relPath.startsWith('server.cjs') || relPath === 'deploy.php') continue;

        const stat = fs.statSync(full);
        const ext = path.extname(entry.name).toLowerCase();
        const binaryExts = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.ico', '.woff', '.woff2', '.ttf', '.eot', '.mp4', '.mp3', '.pdf'];
        const isBinary = binaryExts.includes(ext);

        files.push({
          path: relPath,
          size: stat.size,
          isBinary,
          extension: ext.replace('.', ''),
        });
        totalBytes += stat.size;
      }
    }
  }

  collect(distDir);

  // Check if assets folder has bundled output
  const hasAssets = files.some(f => f.path.startsWith('assets/') && (f.extension === 'js' || f.extension === 'css'));
  if (!hasAssets) {
    missing.push('assets/*.js bundle');
  }

  return {
    hasDist: true,
    requiredFilesMissing: missing,
    totalFiles: files.length,
    totalBytes,
    files,
  };
}

/**
 * Execute production build using npm run build:shared-host
 */
function runProductionBuild(): boolean {
  console.log(`\n${C.yellow}${C.bold}[BUILD]${C.reset} Triggering production build: ${C.bold}npm run build:shared-host${C.reset} ...`);
  try {
    const stdout = execSync('npm run build:shared-host', {
      cwd: ROOT_DIR,
      stdio: ['ignore', 'pipe', 'pipe'],
      encoding: 'utf-8',
      timeout: 180000,
    });
    console.log(`${C.green}✓ Build completed successfully!${C.reset}`);
    if (isVerbose) {
      console.log(C.dim + stdout + C.reset);
    }
    return true;
  } catch (err: any) {
    console.error(`${C.red}✕ Build failed:${C.reset}`, err.message);
    if (err.stdout) console.error(C.dim + err.stdout.toString() + C.reset);
    if (err.stderr) console.error(C.red + err.stderr.toString() + C.reset);
    return false;
  }
}

/**
 * PHASE 3: Remote Deploy Worker Health Check & Content Diagnostic
 * Validates endpoint readiness and detects non-JSON or HTML/PHP errors
 */
async function probeRemoteDeployWorker(url: string, key: string): Promise<RemoteWorkerResult> {
  const start = Date.now();
  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'X-Deploy-Key': key,
        'User-Agent': 'UQlearn-Sync-Deploy/3.1',
      },
    });

    const latencyMs = Date.now() - start;
    const rawText = await res.text();
    const isHtml = rawText.startsWith('<') || rawText.includes('<!DOCTYPE') || rawText.includes('<html');

    if (!rawText || !rawText.trim()) {
      return {
        reachable: res.ok,
        httpStatus: res.status,
        isJson: false,
        latencyMs,
        error: 'Remote worker returned empty response.',
      };
    }

    try {
      const data = JSON.parse(rawText);
      return {
        reachable: true,
        httpStatus: res.status,
        isJson: true,
        latencyMs,
        data,
      };
    } catch (parseErr: any) {
      // Diagnosing root cause of "Expected property name or '}' in JSON at position 1 (line 1 column 2)"
      return {
        reachable: false,
        httpStatus: res.status,
        isJson: false,
        latencyMs,
        error: isHtml
          ? `Remote endpoint returned HTML (HTTP ${res.status}) instead of JSON. Ensure deploy.php exists at web root.`
          : `Invalid JSON returned by remote endpoint: ${parseErr.message}`,
        rawSnippet: rawText.substring(0, 180).replace(/\r?\n/g, ' '),
      };
    }
  } catch (netErr: any) {
    return {
      reachable: false,
      isJson: false,
      latencyMs: Date.now() - start,
      error: `Network error connecting to ${url}: ${netErr.message}`,
    };
  }
}

/**
 * PHASE 4: Execute Live Deployment
 * Prepares payload and pushes to remote deploy worker
 */
async function executeRemoteDeploy(
  url: string,
  key: string,
  distFiles: Array<{ path: string; size: number; isBinary: boolean; extension: string }>
): Promise<boolean> {
  console.log(`\n${C.yellow}${C.bold}[DEPLOY]${C.reset} Preparing payload for ${distFiles.length} files...`);

  const distDir = path.join(ROOT_DIR, 'dist');
  const textFiles: Record<string, string> = {};
  const base64Files: Record<string, string> = {};

  for (const file of distFiles) {
    const fullPath = path.join(distDir, file.path);
    try {
      if (file.isBinary) {
        base64Files[file.path] = fs.readFileSync(fullPath).toString('base64');
      } else {
        textFiles[file.path] = fs.readFileSync(fullPath, 'utf-8');
      }
    } catch (readErr: any) {
      console.error(`${C.red}✕ Failed to read dist file ${file.path}:${C.reset}`, readErr.message);
      return false;
    }
  }

  const payload = {
    clean_assets: true,
    deploy_key: key,
    files: textFiles,
    base64_files: base64Files,
  };

  const payloadJson = JSON.stringify(payload);
  const payloadMb = (Buffer.byteLength(payloadJson) / (1024 * 1024)).toFixed(2);
  console.log(`[DEPLOY] Payload generated: ${C.bold}${payloadMb} MB${C.reset} across ${Object.keys(textFiles).length} text and ${Object.keys(base64Files).length} binary assets.`);

  // Self-test JSON payload validity to guarantee zero client-side JSON malformations
  try {
    JSON.parse(payloadJson);
    console.log(`[DEPLOY] Payload JSON integrity check: ${C.green}✓ 100% VALID${C.reset}`);
  } catch (err: any) {
    console.error(`${C.red}✕ Generated payload failed JSON serialization test:${C.reset}`, err.message);
    return false;
  }

  console.log(`[DEPLOY] Pushing payload to ${C.cyan}${url}${C.reset} ...`);
  const deployStart = Date.now();

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Deploy-Key': key,
      },
      body: payloadJson,
    });

    const elapsed = ((Date.now() - deployStart) / 1000).toFixed(2);
    const rawText = await response.text();

    let resultData: any;
    try {
      resultData = JSON.parse(rawText);
    } catch {
      console.error(`${C.red}✕ Deployment failed: Server returned non-JSON response (HTTP ${response.status})${C.reset}`);
      console.error(C.dim + rawText.substring(0, 300) + C.reset);
      return false;
    }

    if (response.ok && resultData.success) {
      console.log(`\n${C.green}${C.bold}✓ DEPLOYMENT SUCCEEDED in ${elapsed}s!${C.reset}`);
      console.log(`  ├── Message: ${C.white}${resultData.message || 'Production files updated'}${C.reset}`);
      console.log(`  ├── Web root: ${C.white}${resultData.web_root || '/home/uqlearno/public_html'}${C.reset}`);
      console.log(`  └── Updated Files: ${C.green}${resultData.updated_files_count || distFiles.length}${C.reset}`);
      return true;
    } else {
      console.error(`\n${C.red}${C.bold}✕ Deployment rejected by remote server:${C.reset} ${resultData.message || 'Unknown error'}`);
      if (resultData.errors && Array.isArray(resultData.errors)) {
        resultData.errors.forEach((e: string) => console.error(`  └── ${e}`));
      }
      return false;
    }
  } catch (err: any) {
    console.error(`\n${C.red}✕ Network error during deployment:${C.reset}`, err.message);
    return false;
  }
}

/**
 * Main Orchestration Flow
 */
async function main() {
  if (showHelp) {
    printHelp();
    process.exit(0);
  }

  printHeader();

  let hasErrors = false;
  let jsonResults: JsonDiagnosticResult[] = [];

  // -------------------------------------------------------------------------
  // STEP 1: JSON Syntax & BOM Integrity Check
  // -------------------------------------------------------------------------
  if (!checkDistOnly && !probeRemoteOnly) {
    console.log(`\n${C.bold}[1/4] Scanning Workspace JSON Files for Syntax Errors & BOM...${C.reset}`);
    jsonResults = runJsonDiagnostics();
    const invalidJson = jsonResults.filter(r => !r.valid);
    const bomFiles = jsonResults.filter(r => r.hasBom);

    console.log(`  ✓ Checked ${jsonResults.length} JSON files across project.`);

    if (bomFiles.length > 0) {
      console.log(`  ${C.yellow}⚠ Warning: ${bomFiles.length} file(s) contain UTF-8 Byte Order Mark (BOM):${C.reset}`);
      bomFiles.forEach(f => console.log(`    ├── ${f.relativePath}`));
    }

    if (invalidJson.length > 0) {
      hasErrors = true;
      console.log(`\n${C.bgRed}${C.white}${C.bold} CRITICAL JSON SYNTAX ERRORS DETECTED ${C.reset}`);
      invalidJson.forEach(f => {
        console.log(`\n${C.red}✕ File:${C.reset} ${C.bold}${f.relativePath}${C.reset} (line ${f.errorLine}, col ${f.errorCol})`);
        console.log(`  Error: ${f.error}`);
        if (f.errorSnippet) {
          console.log(C.yellow + f.errorSnippet + C.reset);
        }
      });
      console.log(`\n${C.red}Resolve the JSON syntax error(s) above before deploying.${C.reset}`);
    } else {
      console.log(`  ${C.green}✓ All ${jsonResults.length} JSON files parsed cleanly without syntax errors.${C.reset}`);
    }

    if (checkJsonOnly) {
      process.exit(hasErrors ? 1 : 0);
    }
  }

  // -------------------------------------------------------------------------
  // STEP 2: Production dist/ Files Verification
  // -------------------------------------------------------------------------
  let distState = inspectDistDirectory();

  if (!checkJsonOnly && !probeRemoteOnly) {
    console.log(`\n${C.bold}[2/4] Verifying Production Build Output in /dist/...${C.reset}`);

    if (isForceBuild || !distState.hasDist || distState.requiredFilesMissing.length > 0) {
      if (distState.requiredFilesMissing.length > 0 && !isForceBuild) {
        console.log(`  ${C.yellow}Missing required entry points:${C.reset} ${distState.requiredFilesMissing.join(', ')}`);
      }
      const buildOk = runProductionBuild();
      if (!buildOk) {
        console.error(`${C.red}Build failed. Halting deployment check.${C.reset}`);
        process.exit(1);
      }
      distState = inspectDistDirectory();
    }

    if (distState.requiredFilesMissing.length > 0) {
      hasErrors = true;
      console.error(`  ${C.red}✕ Missing required files after build:${C.reset} ${distState.requiredFilesMissing.join(', ')}`);
    } else {
      const kb = (distState.totalBytes / 1024).toFixed(1);
      console.log(`  ${C.green}✓ Production build verified:${C.reset} ${C.bold}${distState.totalFiles} files${C.reset} (${kb} KB total).`);
      console.log(`    ├── Learner Root:    dist/index.html + dist/.htaccess`);
      console.log(`    ├── Admin Portal:    dist/admin/admin.html + dist/admin/.htaccess`);
      console.log(`    ├── Instructor:      dist/instructor/instructor.html + dist/instructor/.htaccess`);
      console.log(`    ├── Reviewer:        dist/rev/rev.html + dist/rev/.htaccess`);
      console.log(`    └── Assets:          Bundled JS/CSS under dist/assets/`);
    }

    if (isVerbose && distState.files.length > 0) {
      console.log(`\n  ${C.dim}Built Files Manifest:${C.reset}`);
      distState.files.forEach((f, idx) => {
        console.log(`    ${C.dim}[${idx + 1}/${distState.files.length}]${C.reset} dist/${f.path} (${(f.size / 1024).toFixed(1)} KB)`);
      });
    }

    if (checkDistOnly) {
      process.exit(hasErrors ? 1 : 0);
    }
  }

  // -------------------------------------------------------------------------
  // STEP 3: Remote Deploy Worker Connectivity & Health Check
  // -------------------------------------------------------------------------
  let remoteInfo: RemoteWorkerResult | null = null;
  if (!checkJsonOnly && !checkDistOnly) {
    console.log(`\n${C.bold}[3/4] Probing Remote Deploy Worker: ${C.cyan}${customUrl}${C.reset} ...`);
    remoteInfo = await probeRemoteDeployWorker(customUrl, deployKey);

    if (remoteInfo.reachable && remoteInfo.isJson) {
      console.log(`  ${C.green}✓ Remote worker online${C.reset} (${remoteInfo.latencyMs}ms response time)`);
      if (remoteInfo.data) {
        console.log(`    ├── Worker:       ${C.white}${remoteInfo.data.worker || 'Active'}${C.reset}`);
        console.log(`    ├── PHP Version:  ${C.white}${remoteInfo.data.php_version || 'Unknown'}${C.reset}`);
        console.log(`    ├── Web Root:     ${C.white}${remoteInfo.data.web_root || 'cPanel public_html'}${C.reset}`);
        console.log(`    ├── Writable:     ${remoteInfo.data.is_writable ? C.green + 'Yes (755/775)' : C.red + 'No'}${C.reset}`);
        console.log(`    └── Server Time:  ${C.white}${remoteInfo.data.server_time || 'N/A'}${C.reset}`);
      }
    } else {
      console.log(`  ${C.yellow}⚠ Remote Deploy Worker Notice:${C.reset} ${remoteInfo.error}`);
      if (remoteInfo.rawSnippet) {
        console.log(`    ${C.dim}Raw Response Sample:${C.reset} ${C.dim}${remoteInfo.rawSnippet}${C.reset}`);
      }
      console.log(`    ${C.dim}To enable remote deployment, ensure deploy.php (from api/v1/root_deploy.php) is uploaded to your cPanel web root.${C.reset}`);
    }

    if (probeRemoteOnly) {
      process.exit(remoteInfo.reachable ? 0 : 1);
    }
  }

  // -------------------------------------------------------------------------
  // STEP 4: Pre-flight Summary & Optional Live Deployment
  // -------------------------------------------------------------------------
  console.log(`\n${C.bold}[4/4] Pre-flight Diagnostic Summary${C.reset}`);
  console.log('────────────────────────────────────────────────────────────────────────────────');
  console.log(` • JSON Syntax Integrity:    ${invalidJsonCount(jsonResults) === 0 ? C.green + 'PASSED (0 syntax errors)' : C.red + 'FAILED'}${C.reset}`);
  console.log(` • Dist Entry Points:        ${distState.requiredFilesMissing.length === 0 ? C.green + `PASSED (${distState.totalFiles} files ready)` : C.red + 'MISSING FILES'}${C.reset}`);
  console.log(` • Remote Worker Status:     ${remoteInfo?.reachable && remoteInfo?.isJson ? C.green + 'READY' : C.yellow + 'WORKER PENDING / OFFLINE'}${C.reset}`);
  console.log('────────────────────────────────────────────────────────────────────────────────');

  if (hasErrors) {
    console.log(`\n${C.red}${C.bold}✕ Pre-flight checks failed. Please fix the highlighted issues above.${C.reset}\n`);
    process.exit(1);
  }

  if (isDeploy) {
    if (!remoteInfo?.reachable || !remoteInfo?.isJson) {
      console.error(`\n${C.red}Cannot deploy: Remote deploy worker at ${customUrl} is not answering with valid JSON.${C.reset}`);
      console.error(`Please upload api/v1/root_deploy.php to /home/uqlearno/public_html/deploy.php on cPanel first.`);
      process.exit(1);
    }

    const deploySuccess = await executeRemoteDeploy(customUrl, deployKey, distState.files);
    process.exit(deploySuccess ? 0 : 1);
  } else {
    console.log(`\n${C.green}${C.bold}✓ All Pre-flight Checks Passed! Ready for deployment.${C.reset}`);
    console.log(`\nTo push this production build to live cPanel (${customUrl}), run:\n`);
    console.log(`  ${C.cyan}${C.bold}npx tsx sync-deploy.ts --deploy${C.reset}\n`);
    process.exit(0);
  }
}

function invalidJsonCount(results: JsonDiagnosticResult[]): number {
  return results.filter(r => !r.valid).length;
}

main().catch(err => {
  console.error(`${C.red}Unhandled error:${C.reset}`, err);
  process.exit(1);
});
