import fs from 'fs';
import path from 'path';

const copies = [
  { src: '.htaccess', dest: 'dist/.htaccess' },
];

// Copy all PHP scripts from api/v1 to dist/api/v1
const apiV1Src = path.resolve('api/v1');
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
  console.log(`Copied ${files.length} API v1 PHP files to dist/api/v1`);
}

copies.forEach(({ src, dest }) => {
  const srcPath = path.resolve(src);
  const destPath = path.resolve(dest);

  if (fs.existsSync(srcPath)) {
    const destDir = path.dirname(destPath);
    if (!fs.existsSync(destDir)) {
      fs.mkdirSync(destDir, { recursive: true });
    }
    fs.copyFileSync(srcPath, destPath);
    console.log(`Copied ${src} -> ${dest}`);
  } else {
    console.warn(`Source not found: ${src}`);
  }
});
