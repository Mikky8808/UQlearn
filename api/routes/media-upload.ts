import { Router, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import multer from 'multer';

const mediaUploadRouter = Router();
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 500 * 1024 * 1024 } // 500MB
});

function ensureDir(dirPath: string) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

// POST handler for media-upload (.php and extensionless)
mediaUploadRouter.post('/', upload.any(), (req: Request, res: Response) => {
  try {
    const userId = 
      (req.headers['x-user-id'] as string) || 
      req.body?.user_id || 
      req.body?.instructorId || 
      'anonymous';

    let rawFolder = req.body?.folder || (req.headers['x-folder'] as string) || 'assets';
    // Clean folder name
    const folder = rawFolder.replace(/[^a-zA-Z0-9_-]/g, '') || 'assets';

    let fileBuffer: Buffer | null = null;
    let originalName = 'uploaded_file';
    let mimeType = 'application/octet-stream';

    // 1. Check if uploaded via multer (multipart/form-data)
    const reqFiles = (req as any).files as Express.Multer.File[] | undefined;
    if (reqFiles && reqFiles.length > 0) {
      const primaryFile = reqFiles.find(f => f.fieldname === 'fileData' || f.fieldname === 'file') || reqFiles[0];
      fileBuffer = primaryFile.buffer;
      originalName = primaryFile.originalname || originalName;
      mimeType = primaryFile.mimetype || mimeType;
    } 
    // 2. Check if uploaded via JSON body (Base64 string in fileData or file)
    else if (req.body && (req.body.fileData || req.body.file)) {
      const fileDataStr = req.body.fileData || req.body.file;
      originalName = req.body.fileName || req.body.file_name || originalName;

      if (typeof fileDataStr === 'string' && fileDataStr.startsWith('data:')) {
        const matches = fileDataStr.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
        if (matches && matches.length === 3) {
          mimeType = matches[1];
          fileBuffer = Buffer.from(matches[2], 'base64');
        } else {
          fileBuffer = Buffer.from(fileDataStr, 'base64');
        }
      } else if (typeof fileDataStr === 'string') {
        fileBuffer = Buffer.from(fileDataStr, 'base64');
      }
    }
    // 3. Check if raw Buffer in req.body
    else if (Buffer.isBuffer(req.body)) {
      fileBuffer = req.body;
    }

    if (!fileBuffer || fileBuffer.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No file data received in request. Expected multipart form field "fileData" or Base64 JSON.'
      });
    }

    // Determine file extension
    let ext = path.extname(originalName).toLowerCase();
    if (!ext || ext === '.') {
      if (mimeType.includes('png')) ext = '.png';
      else if (mimeType.includes('webp')) ext = '.webp';
      else if (mimeType.includes('gif')) ext = '.gif';
      else if (mimeType.includes('svg')) ext = '.svg';
      else if (mimeType.includes('pdf')) ext = '.pdf';
      else if (mimeType.includes('mp4')) ext = '.mp4';
      else if (mimeType.includes('quicktime') || mimeType.includes('mov')) ext = '.mov';
      else ext = '.jpg';
    }

    // Build timestamp + random filename
    const timestamp = Math.floor(Date.now() / 1000);
    const randomHex = crypto.randomBytes(12).toString('hex');
    const finalFilename = `${timestamp}_${randomHex}${ext}`;

    // Target directories
    const publicTargetDir = path.join(process.cwd(), 'public', 'uploads', folder);
    const distTargetDir = path.join(process.cwd(), 'dist', 'uploads', folder);

    ensureDir(publicTargetDir);
    const publicFilePath = path.join(publicTargetDir, finalFilename);

    // Save to disk
    fs.writeFileSync(publicFilePath, fileBuffer);

    // Mirror to dist if dist exists
    if (fs.existsSync(path.join(process.cwd(), 'dist'))) {
      ensureDir(distTargetDir);
      fs.writeFileSync(path.join(distTargetDir, finalFilename), fileBuffer);
    }

    const publicUrl = `/uploads/${folder}/${finalFilename}`;

    return res.status(200).json({
      success: true,
      message: 'File uploaded successfully.',
      url: publicUrl,
      path: publicUrl,
      stored_path: publicUrl,
      filename: finalFilename,
      size: fileBuffer.length,
      user_id: userId,
      timestamp,
      data: [
        {
          url: publicUrl,
          path: publicUrl,
          filename: finalFilename
        }
      ]
    });
  } catch (error: any) {
    console.error('Media Upload Error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Server error during media upload processing.'
    });
  }
});

export default mediaUploadRouter;
