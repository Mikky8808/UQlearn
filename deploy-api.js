#!/usr/bin/env node

/**
 * Backend API Deployer Script
 * 
 * Synchronizes all PHP files from the local api/v1 directory to the live server.
 */

import fs from 'fs';
import path from 'path';

const TARGET_URL = 'https://uqlearn.org/api/v1/deploy.php';
const DEPLOY_KEY = 'cubiclink_sync_secret_2026';
const API_DIR = path.join(process.cwd(), 'api', 'v1');

// Helper: Recursively discover all files in api/v1/
function scanApiDirectory(dir, baseDir = dir) {
  let files = [];
  if (!fs.existsSync(dir)) return files;

  const entries = fs.readdirSync(dir);
  for (const entry of entries) {
    const fullPath = path.join(dir, entry);
    const relPath = path.relative(baseDir, fullPath).replace(/\\/g, '/');
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      files = files.concat(scanApiDirectory(fullPath, baseDir));
    } else {
      // Skip protected files and current script
      if (['deploy.php', 'db.php', 'root_deploy.php'].includes(entry)) continue;
      
      files.push({
        fullPath,
        relPath,
        size: stat.size
      });
    }
  }
  return files;
}

async function main() {
  console.log('====================================================');
  console.log(`🚀 API Deployer: Synchronizing Backend Endpoints`);
  console.log(`📍 Target: ${TARGET_URL}`);
  console.log(`📁 Source: ${API_DIR}`);
  console.log('====================================================\n');

  const allFiles = scanApiDirectory(API_DIR, API_DIR);
  console.log(`📋 Found ${allFiles.length} API files to deploy.\n`);

  for (let i = 0; i < allFiles.length; i++) {
    const file = allFiles[i];
    const content = fs.readFileSync(file.fullPath, 'utf-8');
    const fileKb = (file.size / 1024).toFixed(2);

    console.log(`[${i + 1}/${allFiles.length}] Deploying api/v1/${file.relPath} (${fileKb} KB)...`);

    try {
      const response = await fetch(TARGET_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Deploy-Key': DEPLOY_KEY
        },
        body: JSON.stringify({
          files: { [file.relPath]: content },
          deploy_key: DEPLOY_KEY
        })
      });

      if (response.ok) {
        console.log(`  └── ✓ Success\n`);
      } else {
        const errData = await response.text();
        console.error(`  └── ❌ Failed (HTTP ${response.status}): ${errData}\n`);
      }
    } catch (err) {
      console.error(`  └── ❌ Network Error: ${err.message}\n`);
    }
  }

  console.log('🎉 API Deployment Finished.');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
