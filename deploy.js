#!/usr/bin/env node

/**
 * Production CLI Dist Deployer Script
 * 
 * Executes a strict sequential file-by-file transmission pattern using individual
 * HTTP POST requests for every file in the dist/ directory to https://uqlearn.org/deploy.php
 * 
 * Usage:
 *   node deploy.js
 *   node deploy.js https://uqlearn.org/deploy.php cubiclink_sync_secret_2026
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const DEFAULT_ENDPOINT = process.env.REMOTE_URL || 'https://uqlearn.org/deploy.php';
const DEFAULT_KEY = process.env.DEPLOY_KEY || 'cubiclink_sync_secret_2026';

const targetUrl = process.argv[2] || DEFAULT_ENDPOINT;
const deployKey = process.argv[3] || DEFAULT_KEY;
const distDir = path.join(process.cwd(), 'dist');

// Helper: Binary extensions list
const BINARY_EXTS = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.ico', '.woff', '.woff2', '.ttf', '.eot', '.mp4', '.mp3', '.pdf'];

// Helper: Recursively discover all files in dist/
function scanDistDirectory(dir, baseDir = dir) {
  let files = [];
  if (!fs.existsSync(dir)) return files;

  const entries = fs.readdirSync(dir);
  for (const entry of entries) {
    const fullPath = path.join(dir, entry);
    const relPath = path.relative(baseDir, fullPath).replace(/\\/g, '/');
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      if (entry === '.git' || entry === 'node_modules' || entry === 'uploads') continue;
      files = files.concat(scanDistDirectory(fullPath, baseDir));
    } else {
      if (relPath === 'server.cjs' || relPath === 'server.cjs.map') continue;

      const ext = path.extname(entry).toLowerCase();
      const isBinary = BINARY_EXTS.includes(ext);

      files.push({
        fullPath,
        relPath,
        size: stat.size,
        ext,
        isBinary
      });
    }
  }
  return files;
}

async function main() {
  console.log('====================================================');
  console.log(`🚀 CLI Dist Deployer: Starting Sequential Dist Synchronization`);
  console.log(`📍 Web Root Target: ${targetUrl}`);
  console.log(`📁 Source Directory: ${distDir}`);
  console.log('====================================================\n');

  if (!fs.existsSync(distDir)) {
    console.error(`❌ Error: 'dist' directory not found at ${distDir}. Run 'npm run build' first.`);
    process.exit(1);
  }

  // 1. Discover dist files
  const allFiles = scanDistDirectory(distDir, distDir);

  if (allFiles.length === 0) {
    console.error(`❌ Error: No deployable files found in ${distDir}.`);
    process.exit(1);
  }

  // 2. Sort files sequentially so assets upload first and index.html / .htaccess upload last
  allFiles.sort((a, b) => {
    const aIsEntry = a.relPath === 'index.html' || a.relPath === '.htaccess' ? 1 : 0;
    const bIsEntry = b.relPath === 'index.html' || b.relPath === '.htaccess' ? 1 : 0;
    if (aIsEntry !== bIsEntry) return aIsEntry - bIsEntry;
    return a.size - b.size;
  });

  console.log(`📋 Found ${allFiles.length} dist files in queue. Transmitting 1 file per POST request...\n`);

  const startTime = Date.now();
  let uploadedCount = 0;
  let failedCount = 0;
  const maxChunkSize = 300000; // ~225 KB per chunk slice

  // 3. Process sequential queue 1 file at a time
  for (let i = 0; i < allFiles.length; i++) {
    const file = allFiles[i];
    const rawBuffer = fs.readFileSync(file.fullPath);
    const b64Data = rawBuffer.toString('base64');
    const utf8Text = !file.isBinary ? rawBuffer.toString('utf-8') : '';
    const totalChunks = Math.ceil(b64Data.length / maxChunkSize) || 1;
    const fileKb = (file.size / 1024).toFixed(2);

    console.log(`[${i + 1}/${allFiles.length}] Transmitting dist/${file.relPath} (${fileKb} KB)...`);

    let fileSuccess = true;
    const fileStart = Date.now();

    for (let c = 0; c < totalChunks; c++) {
      const chunkStr = b64Data.slice(c * maxChunkSize, (c + 1) * maxChunkSize);
      const isText = !file.isBinary && totalChunks === 1;

      const payload = {
        files: isText ? { [file.relPath]: utf8Text } : {},
        dist_files: isText ? { [file.relPath]: utf8Text } : {},
        base64_files: (!isText && totalChunks === 1) ? { [file.relPath]: b64Data } : {},
        chunk_file: file.relPath,
        chunk_data: chunkStr,
        chunk_index: c,
        total_chunks: totalChunks,
        clean_assets: (i === 0 && c === 0),
        deploy_key: deployKey
      };

      const chunkStart = Date.now();
      try {
        const response = await fetch(targetUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Deploy-Key': deployKey
          },
          body: JSON.stringify(payload)
        });

        const elapsedMs = Date.now() - chunkStart;

        if (!response.ok) {
          fileSuccess = false;
          console.error(`  └── ❌ Chunk ${c + 1}/${totalChunks} failed with HTTP ${response.status} (${elapsedMs}ms)`);
          break;
        }

        if (totalChunks > 1) {
          console.log(`  └── Chunk ${c + 1}/${totalChunks} synced (${elapsedMs}ms)`);
        }
      } catch (err) {
        fileSuccess = false;
        console.error(`  └── ❌ Network error on chunk ${c + 1}/${totalChunks}: ${err.message}`);
        break;
      }
    }

    const totalMs = Date.now() - fileStart;
    if (fileSuccess) {
      uploadedCount++;
      console.log(`  └── ✓ Fully written dist/${file.relPath} (${totalMs}ms)\n`);
    } else {
      failedCount++;
      console.error(`  └── ❌ Failed to write dist/${file.relPath}\n`);
    }
  }

  const durationSec = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log('====================================================');
  if (failedCount === 0) {
    console.log(`🎉 SUCCESS: All ${uploadedCount}/${allFiles.length} dist files uploaded successfully in ${durationSec}s!`);
    console.log(`🌐 Live Application: ${targetUrl.replace('/deploy.php', '')}`);
  } else {
    console.log(`⚠️ COMPLETED WITH ERRORS: ${uploadedCount} uploaded, ${failedCount} failed in ${durationSec}s.`);
  }
  console.log('====================================================\n');
}

main().catch(err => {
  console.error('Fatal deployment error:', err);
  process.exit(1);
});
