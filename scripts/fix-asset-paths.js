import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.resolve(__dirname, '../dist');

function fixHtmlFiles(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.lstatSync(fullPath).isDirectory()) {
      fixHtmlFiles(fullPath);
    } else if (file.endsWith('.html')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      // Replace relative asset paths (src="assets/...) or (href="assets/...) with absolute paths starting with /
      content = content.replace(/(src|href)="assets\//g, '$1="/assets/');
      fs.writeFileSync(fullPath, content);
      console.log(`Fixed asset paths in: ${fullPath}`);
    }
  }
}

fixHtmlFiles(distDir);
