import fs from 'fs';
import path from 'path';

const htaccessSrc = path.resolve('.htaccess');

// Target destinations for .htaccess to handle subdomains and subdirectories on shared hosting
const htaccessDestinations = [
  'dist/.htaccess',
  'dist/admin/.htaccess',
  'dist/instructor/.htaccess',
  'dist/rev/.htaccess',
];

if (fs.existsSync(htaccessSrc)) {
  htaccessDestinations.forEach(dest => {
    const destPath = path.resolve(dest);
    const destDir = path.dirname(destPath);
    if (!fs.existsSync(destDir)) {
      fs.mkdirSync(destDir, { recursive: true });
    }
    fs.copyFileSync(htaccessSrc, destPath);
    console.log(`Copied .htaccess -> ${dest}`);
  });
} else {
  console.warn(`Source .htaccess not found at: ${htaccessSrc}`);
}

// Copy api/v1/.htaccess if present
const apiHtaccessSrc = path.resolve('api/v1/.htaccess');
const apiHtaccessDest = path.resolve('dist/api/v1/.htaccess');
if (fs.existsSync(apiHtaccessSrc)) {
  const destDir = path.dirname(apiHtaccessDest);
  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
  }
  fs.copyFileSync(apiHtaccessSrc, apiHtaccessDest);
  console.log(`Copied api/v1/.htaccess -> ${apiHtaccessDest}`);
}

// Copy all PHP scripts from api/v1 to dist/api/v1
const apiV1Src = path.resolve('public/api/v1');
const apiV1Dest = path.resolve('dist/api/v1');

if (fs.existsSync(apiV1Src)) {
  if (!fs.existsSync(apiV1Dest)) {
    fs.mkdirSync(apiV1Dest, { recursive: true });
  }
  const files = fs.readdirSync(apiV1Src);
  files.forEach(file => {
    const s = path.join(apiV1Src, file);
    const d = path.join(apiV1Dest, file);
    if (fs.statSync(s).isFile()) {
      fs.copyFileSync(s, d);
    }
  });
  console.log(`Copied ${files.length} API v1 PHP files from public/api/v1 to dist/api/v1`);
}

// Copy root PHP files if present in public/
const publicDir = path.resolve('public');
const distDir = path.resolve('dist');

if (fs.existsSync(publicDir)) {
  const publicFiles = fs.readdirSync(publicDir);
  publicFiles.forEach(file => {
    const s = path.join(publicDir, file);
    const d = path.join(distDir, file);
    if (fs.statSync(s).isFile()) {
      fs.copyFileSync(s, d);
      console.log(`Copied public/${file} -> dist/${file}`);
    }
  });
}
