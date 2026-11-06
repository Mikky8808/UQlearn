import fs from 'fs';
import path from 'path';

const copies = [
  { src: '.htaccess', dest: 'dist/.htaccess' },
  { src: 'admin/.htaccess', dest: 'dist/admin/.htaccess' },
  { src: 'instructor/.htaccess', dest: 'dist/instructor/.htaccess' },
  { src: 'admin/admin.html', dest: 'dist/admin/admin.html' },
  { src: 'admin/index.html', dest: 'dist/admin/index.html' },
  { src: 'instructor/instructor.html', dest: 'dist/instructor/instructor.html' },
  { src: 'instructor/index.html', dest: 'dist/instructor/index.html' },
];

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
