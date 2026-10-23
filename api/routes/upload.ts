import { Router, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const uploadRouter = Router();

// Helper: Ensure directory exists
function ensureDir(dirPath: string) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

// POST /api/upload & POST /api/v1/upload
// Handles image uploads, stores them in folder with random 32 chars + timestamp and returns the path
uploadRouter.post('/', (req: Request, res: Response) => {
  try {
    const { fileData, fileName, folder = 'courses' } = req.body;

    if (!fileData) {
      return res.status(400).json({ 
        success: false, 
        error: 'No file data provided. Expected base64 or DataURL in fileData field.' 
      });
    }

    // Determine MIME type and clean Base64 data
    let base64Data = fileData;
    let extension = '.jpg';
    let mimeType = 'image/jpeg';

    if (typeof fileData === 'string' && fileData.startsWith('data:')) {
      const matches = fileData.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
      if (matches && matches.length === 3) {
        mimeType = matches[1];
        base64Data = matches[2];
        if (mimeType.includes('png')) extension = '.png';
        else if (mimeType.includes('webp')) extension = '.webp';
        else if (mimeType.includes('gif')) extension = '.gif';
        else if (mimeType.includes('svg')) extension = '.svg';
        else if (mimeType.includes('jpeg') || mimeType.includes('jpg')) extension = '.jpg';
      }
    } else if (fileName) {
      const rawExt = path.extname(fileName).toLowerCase();
      if (['.jpg', '.jpeg', '.png', '.webp', '.gif', '.svg'].includes(rawExt)) {
        extension = rawExt === '.jpeg' ? '.jpg' : rawExt;
      }
    }

    // Generate random 32 characters + timestamp (discards original filename)
    const random32 = crypto.randomBytes(16).toString('hex'); // 32 hex characters
    const timestamp = Math.floor(Date.now() / 1000);
    const finalFilename = `${timestamp}_${random32}${extension}`;

    // Target storage folders
    const subFolder = folder === 'avatars' ? 'avatars' : 'courses';
    const publicTargetDir = path.join(process.cwd(), 'public', 'uploads', subFolder);
    const distTargetDir = path.join(process.cwd(), 'dist', 'uploads', subFolder);

    ensureDir(publicTargetDir);
    const publicFilePath = path.join(publicTargetDir, finalFilename);

    // Write binary buffer to public folder
    const buffer = Buffer.from(base64Data, 'base64');
    fs.writeFileSync(publicFilePath, buffer);

    // Also mirror to dist folder if dist exists for static production serve
    if (fs.existsSync(path.join(process.cwd(), 'dist'))) {
      ensureDir(distTargetDir);
      const distFilePath = path.join(distTargetDir, finalFilename);
      fs.writeFileSync(distFilePath, buffer);
    }

    const relativeUrl = `/uploads/${subFolder}/${finalFilename}`;

    return res.status(201).json({
      success: true,
      url: relativeUrl,
      path: relativeUrl,
      stored_path: relativeUrl,
      filename: finalFilename,
      size: buffer.length,
      timestamp,
      mimeType,
      message: 'Course image uploaded and saved with timestamped path.'
    });
  } catch (error: any) {
    console.error('Upload Error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to process and store image upload.'
    });
  }
});

// GET /api/upload/list - List stored course images
uploadRouter.get('/list', (req: Request, res: Response) => {
  try {
    const subFolder = req.query.folder === 'avatars' ? 'avatars' : 'courses';
    const targetDir = path.join(process.cwd(), 'public', 'uploads', subFolder);

    if (!fs.existsSync(targetDir)) {
      return res.json({ success: true, files: [] });
    }

    const files = fs.readdirSync(targetDir).map(file => {
      const filePath = path.join(targetDir, file);
      const stats = fs.statSync(filePath);
      return {
        name: file,
        url: `/uploads/${subFolder}/${file}`,
        path: `/uploads/${subFolder}/${file}`,
        size: stats.size,
        modifiedAt: stats.mtime.toISOString(),
      };
    }).sort((a, b) => new Date(b.modifiedAt).getTime() - new Date(a.modifiedAt).getTime());

    return res.json({ success: true, files });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

export default uploadRouter;
