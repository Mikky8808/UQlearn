import { Router, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const resumableRouter = Router();

resumableRouter.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Content-Range, Range, X-Upload-Id, X-User-Id, X-File-Name, X-File-Size, X-Folder');
  res.header('Access-Control-Expose-Headers', 'Content-Range, Range, Location, X-Upload-Id, Content-Length');

  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

const tempUploadDir = path.join(process.cwd(), 'public', 'uploads', 'temp');
if (!fs.existsSync(tempUploadDir)) {
  fs.mkdirSync(tempUploadDir, { recursive: true });
}

async function extractChunkBuffer(req: Request): Promise<Buffer> {
  const anyReq = req as any;
  if (anyReq.file && anyReq.file.buffer) {
    return anyReq.file.buffer;
  }
  if (Buffer.isBuffer(req.body)) {
    return req.body;
  }
  if (typeof req.body === 'string' && req.body.length > 0) {
    return Buffer.from(req.body, 'binary');
  }
  if (req.body && req.body.chunkData) {
    return Buffer.from(req.body.chunkData, 'base64');
  }

  // Read incoming stream if not pre-parsed
  return new Promise<Buffer>((resolve) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk: Buffer) => {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    });
    req.on('end', () => {
      resolve(Buffer.concat(chunks));
    });
    req.on('error', () => {
      resolve(Buffer.concat(chunks));
    });
  });
}

// GET /api/v1/upload-resumable (or ?action=status)
resumableRouter.get('/', (req: Request, res: Response) => {
  const uploadId = (req.query.upload_id as string) || (req.headers['x-upload-id'] as string) || '';

  if (!uploadId) {
    return res.status(400).json({ success: false, error: 'Missing upload_id parameter.' });
  }

  const cleanUploadId = uploadId.replace(/[^a-zA-Z0-9_-]/g, '');
  const partFilePath = path.join(tempUploadDir, `${cleanUploadId}.part`);
  const metaFilePath = path.join(tempUploadDir, `${cleanUploadId}.json`);

  if (!fs.existsSync(partFilePath)) {
    return res.status(404).json({ success: false, error: 'Upload session not found.', bytes_uploaded: 0 });
  }

  const uploadedBytes = fs.statSync(partFilePath).size;
  let totalBytes = 0;

  if (fs.existsSync(metaFilePath)) {
    try {
      const meta = JSON.parse(fs.readFileSync(metaFilePath, 'utf8'));
      totalBytes = meta.total_bytes || 0;
    } catch (e) {}
  }

  if (totalBytes > 0 && uploadedBytes >= totalBytes) {
    return res.status(200).json({
      success: true,
      status: 'completed',
      bytes_uploaded: uploadedBytes,
      total_bytes: totalBytes
    });
  }

  const lastByte = Math.max(0, uploadedBytes - 1);
  res.setHeader('Range', `bytes=0-${lastByte}`);
  return res.status(308).json({
    success: true,
    status: 'incomplete',
    bytes_uploaded: uploadedBytes,
    total_bytes: totalBytes,
    range: `bytes=0-${lastByte}`
  });
});

// POST or PUT /api/v1/upload-resumable (Upload chunk)
const handleChunkUpload = async (req: Request, res: Response) => {
  try {
    const uploadId =
      (req.headers['x-upload-id'] as string) ||
      (req.body && req.body.upload_id) ||
      (req.query.upload_id as string) ||
      `up_${Date.now()}_${crypto.randomBytes(6).toString('hex')}`;

    const fileName =
      (req.headers['x-file-name'] as string) ||
      (req.body && req.body.file_name) ||
      `video_${Date.now()}.mp4`;

    const folder =
      ((req.headers['x-folder'] as string) ||
      (req.body && req.body.folder) ||
      'videos').replace(/[^a-zA-Z0-9_-]/g, '') || 'videos';

    const userId =
      (req.headers['x-user-id'] as string) ||
      (req.body && req.body.user_id) ||
      (req.query.user_id as string) ||
      'anonymous';

    const contentRange = (req.headers['content-range'] as string) || (req.headers['HTTP_CONTENT_RANGE'] as string) || '';

    const cleanUploadId = uploadId.replace(/[^a-zA-Z0-9_-]/g, '');
    const partFilePath = path.join(tempUploadDir, `${cleanUploadId}.part`);
    const metaFilePath = path.join(tempUploadDir, `${cleanUploadId}.json`);

    let rangeStart = 0;
    let rangeEnd = 0;
    let totalBytes = 0;

    if (contentRange) {
      const matches = contentRange.match(/bytes\s+(\d+)-(\d+)\/(\d+|\*)/i);
      if (matches) {
        rangeStart = parseInt(matches[1], 10);
        rangeEnd = parseInt(matches[2], 10);
        if (matches[3] !== '*') {
          totalBytes = parseInt(matches[3], 10);
        }
      }
    } else if (req.body) {
      rangeStart = parseInt(req.body.range_start || '0', 10);
      totalBytes = parseInt(req.body.total_bytes || '0', 10);
    }

    // Extract binary buffer for this chunk
    const chunkBuffer = await extractChunkBuffer(req);

    // Save/update metadata
    if (totalBytes > 0 || !fs.existsSync(metaFilePath)) {
      const metaData = {
        upload_id: cleanUploadId,
        file_name: fileName,
        folder,
        user_id: userId,
        total_bytes: totalBytes,
        created_at: Date.now()
      };
      fs.writeFileSync(metaFilePath, JSON.stringify(metaData));
    } else if (fs.existsSync(metaFilePath)) {
      try {
        const meta = JSON.parse(fs.readFileSync(metaFilePath, 'utf8'));
        totalBytes = meta.total_bytes || totalBytes;
      } catch (e) {}
    }

    // Write chunk buffer to part file at rangeStart
    if (chunkBuffer && chunkBuffer.length > 0) {
      const fd = fs.openSync(partFilePath, 'a+');
      fs.writeSync(fd, chunkBuffer, 0, chunkBuffer.length, rangeStart);
      fs.closeSync(fd);
    }

    const currentBytesStored = fs.existsSync(partFilePath) ? fs.statSync(partFilePath).size : 0;

    // Check if fully uploaded
    if (totalBytes > 0 && currentBytesStored >= totalBytes) {
      const targetFolderDir = path.join(process.cwd(), 'public', 'uploads', folder);
      if (!fs.existsSync(targetFolderDir)) {
        fs.mkdirSync(targetFolderDir, { recursive: true });
      }

      const ext = path.extname(fileName) || '.mp4';
      const finalFilename = `${Date.now()}_${crypto.randomBytes(12).toString('hex')}${ext.toLowerCase()}`;
      const finalPath = path.join(targetFolderDir, finalFilename);

      fs.renameSync(partFilePath, finalPath);
      if (fs.existsSync(metaFilePath)) {
        fs.unlinkSync(metaFilePath);
      }

      // Mirror to dist if dist directory exists
      const distFolderDir = path.join(process.cwd(), 'dist', 'uploads', folder);
      if (fs.existsSync(path.join(process.cwd(), 'dist'))) {
        if (!fs.existsSync(distFolderDir)) {
          fs.mkdirSync(distFolderDir, { recursive: true });
        }
        try {
          fs.copyFileSync(finalPath, path.join(distFolderDir, finalFilename));
        } catch (e) {}
      }

      const publicUrl = `/uploads/${folder}/${finalFilename}`;

      return res.status(200).json({
        success: true,
        status: 'completed',
        message: 'File upload completed and assembled successfully.',
        url: publicUrl,
        file_path: publicUrl,
        filename: finalFilename,
        user_id: userId,
        bytes_uploaded: currentBytesStored,
        total_bytes: totalBytes,
        data: [
          {
            url: publicUrl,
            file_path: publicUrl,
            filename: finalFilename
          }
        ]
      });
    }

    // Resume Incomplete status (HTTP 308)
    const lastByteStored = Math.max(0, currentBytesStored - 1);
    res.setHeader('Range', `bytes=0-${lastByteStored}`);
    res.setHeader('X-Upload-Id', cleanUploadId);

    return res.status(308).json({
      success: true,
      status: 'incomplete',
      upload_id: cleanUploadId,
      bytes_uploaded: currentBytesStored,
      total_bytes: totalBytes,
      range: `bytes=0-${lastByteStored}`,
      next_offset: currentBytesStored
    });
  } catch (error: any) {
    console.error('Resumable Upload Error:', error);
    return res.status(500).json({ success: false, error: error.message || 'Server error during chunk upload' });
  }
};

resumableRouter.post('/', handleChunkUpload);
resumableRouter.put('/', handleChunkUpload);

export default resumableRouter;
