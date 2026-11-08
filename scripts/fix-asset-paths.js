import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.resolve(__dirname, '../dist');

function fixHtmlFiles(dir) {
  if (!fs.existsSync(dir)) return;
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.lstatSync(fullPath).isDirectory()) {
      fixHtmlFiles(fullPath);
    } else if (file.endsWith('.html')) {
      let content = fs.readFileSync(fullPath, 'utf8');

      // Replace relative & root-relative asset, logo, and upload paths with absolute https://uqlearn.org/ URLs
      content = content.replace(/(src|href)=["']\/?assets\//g, '$1="https://uqlearn.org/assets/');
      content = content.replace(/(src|href)=["']\/?logo\//g, '$1="https://uqlearn.org/logo/');
      content = content.replace(/(src|href)=["']\/?uploads\//g, '$1="https://uqlearn.org/uploads/');
      content = content.replace(/(src|href)=["']\.\.\/assets\//g, '$1="https://uqlearn.org/assets/');
      content = content.replace(/(src|href)=["']\.\.\/logo\//g, '$1="https://uqlearn.org/logo/');
      content = content.replace(/(src|href)=["']\.\.\/uploads\//g, '$1="https://uqlearn.org/uploads/');

      fs.writeFileSync(fullPath, content);
      console.log(`Fixed asset paths in: ${fullPath}`);
    }
  }
}

fixHtmlFiles(distDir);
