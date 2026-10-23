import { API_BASE_URL } from './apiConfig';

export interface ResumableUploadProgress {
  percentage: number;
  uploadedBytes: number;
  totalBytes: number;
  speedBps: number; // Bytes per second
  speedFormatted: string; // e.g. "1.2 MB/s"
  remainingSeconds: number;
  remainingFormatted: string; // e.g. "00:45 remaining"
  chunkCurrent: number;
  chunkTotal: number;
  uploadId: string;
}

export type ResumableStatus = 'idle' | 'uploading' | 'paused' | 'retrying' | 'completed' | 'error';

export interface ResumableUploaderOptions {
  file: File;
  folder?: string;
  userId?: string;
  userEmail?: string;
  chunkSize?: number; // Must be power of 2 multiple of 256KB (default: 512KB = 524,288 bytes)
  endpoint?: string;
  onProgress?: (progress: ResumableUploadProgress) => void;
  onStatusChange?: (status: ResumableStatus) => void;
  onSuccess?: (result: { url: string; file_path: string; userId?: string; userEmail?: string; total_bytes?: number; file_size?: number; }) => void;
  onError?: (error: string) => void;
}

export class ResumableChunkUploader {
  private file: File;
  private folder: string;
  private userId: string;
  private userEmail: string;
  private chunkSize: number;
  private endpoint: string;

  private uploadId: string;
  private status: ResumableStatus = 'idle';
  private currentByte: number = 0;
  private totalBytes: number = 0;

  private isPaused: boolean = false;
  private isCancelled: boolean = false;
  private activeXhr: XMLHttpRequest | null = null;

  // Speed & ETA metrics
  private startTime: number = 0;
  private lastTime: number = 0;
  private lastBytes: number = 0;

  // Callbacks
  private onProgress?: (progress: ResumableUploadProgress) => void;
  private onStatusChange?: (status: ResumableStatus) => void;
  private onSuccess?: (result: { url: string; file_path: string; userId?: string; userEmail?: string; total_bytes?: number; file_size?: number; }) => void;
  private onError?: (error: string) => void;

  constructor(options: ResumableUploaderOptions) {
    this.file = options.file;
    this.folder = options.folder || 'videos';
    this.userId = options.userId || 'anonymous';
    this.userEmail = options.userEmail || '';
    // 512 KB default (multiple of 256 KB)
    this.chunkSize = options.chunkSize || 4 * 1024 * 1024; // 4MB default for maximum throughput
    const cleanBase = API_BASE_URL.replace(/\/+$/, '');
    this.endpoint = options.endpoint || `${cleanBase}/upload-resumable.php`;

    this.totalBytes = this.file.size;
    this.uploadId = `up_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;

    this.onProgress = options.onProgress;
    this.onStatusChange = options.onStatusChange;
    this.onSuccess = options.onSuccess;
    this.onError = options.onError;
  }

  private setStatus(newStatus: ResumableStatus) {
    this.status = newStatus;
    if (typeof window !== 'undefined') {
      (window as any).__UQ_UPLOADING_ACTIVE__ = (newStatus === 'uploading');
      window.dispatchEvent(new CustomEvent('uq:upload-status', { detail: { status: newStatus, uploading: newStatus === 'uploading' } }));
    }
    if (this.onStatusChange) {
      this.onStatusChange(newStatus);
    }
  }

  public getStatus(): ResumableStatus {
    return this.status;
  }

  public getUploadId(): string {
    return this.uploadId;
  }

  /**
   * Starts or resumes the YouTube-style chunked upload flow
   */
  public async start(): Promise<void> {
    if (this.status === 'uploading') return;

    this.isPaused = false;
    this.isCancelled = false;

    this.setStatus('uploading');
    this.startTime = Date.now();
    this.lastTime = Date.now();
    this.lastBytes = this.currentByte;

    // Check if server already has partial file stored (Recovery check)
    await this.checkRemoteProgress();

    // Begin chunk loop
    this.uploadNextChunk();
  }

  /**
   * Pauses transfer safely
   */
  public pause(): void {
    if (this.status !== 'uploading') return;
    this.isPaused = true;
    if (this.activeXhr) {
      this.activeXhr.abort();
      this.activeXhr = null;
    }
    this.setStatus('paused');
  }

  /**
   * Resumes transfer from last acknowledged byte
   */
  public resume(): void {
    if (this.status !== 'paused' && this.status !== 'error') return;
    this.start();
  }

  /**
   * Cancels transfer
   */
  public cancel(): void {
    this.isCancelled = true;
    this.isPaused = false;
    if (this.activeXhr) {
      this.activeXhr.abort();
      this.activeXhr = null;
    }
    this.setStatus('idle');
    this.currentByte = 0;
  }

  /**
   * Queries endpoint for latest stored byte offset (Resume Recovery)
   */
  private async checkRemoteProgress(): Promise<void> {
    try {
      const url = `${this.endpoint}?upload_id=${encodeURIComponent(this.uploadId)}&user_id=${encodeURIComponent(this.userId)}`;
      const res = await fetch(url, {
        method: 'GET',
        headers: {
          'X-Upload-Id': this.uploadId,
          'X-User-Id': this.userId
        }
      });

      if (res.status === 308 || res.status === 200) {
        const data = await res.json();
        if (data && typeof data.bytes_uploaded === 'number') {
          this.currentByte = data.bytes_uploaded;
        }
      }
    } catch (e) {
      // Ignore network recovery error on init and proceed from currentByte
    }
  }

  /**
   * Uploads chunk sequentially with Content-Range header
   */
  private uploadNextChunk(): void {
    if (this.isPaused || this.isCancelled) return;

    if (this.currentByte >= this.totalBytes) {
      // Completed!
      return;
    }

    const start = this.currentByte;
    const end = Math.min(start + this.chunkSize, this.totalBytes);
    const chunkBlob = this.file.slice(start, end);

    const xhr = new XMLHttpRequest();
    this.activeXhr = xhr;

    xhr.open('POST', this.endpoint, true);

    // Set YouTube-style Content-Range and headers
    xhr.setRequestHeader('Content-Range', `bytes ${start}-${end - 1}/${this.totalBytes}`);
    xhr.setRequestHeader('X-Upload-Id', this.uploadId);
    xhr.setRequestHeader('X-User-Id', this.userId);
    xhr.setRequestHeader('X-User-Email', this.userEmail);
    xhr.setRequestHeader('X-File-Name', this.file.name);
    xhr.setRequestHeader('X-File-Size', this.totalBytes.toString());
    xhr.setRequestHeader('X-Folder', this.folder);

    // Track chunk upload progress
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && !this.isPaused && !this.isCancelled) {
        const currentTotalUploaded = start + e.loaded;
        this.notifyProgress(currentTotalUploaded);
      }
    };

    xhr.onload = () => {
      this.activeXhr = null;

      if (this.isPaused || this.isCancelled) return;

      // HTTP 308 (Resume Incomplete) or 200/201 (Completed)
      if (xhr.status === 308 || xhr.status === 200 || xhr.status === 201) {
        let responseJson: any = null;
        try {
          responseJson = JSON.parse(xhr.responseText);
        } catch (err) {}

        if (responseJson && responseJson.bytes_uploaded !== undefined) {
          this.currentByte = responseJson.bytes_uploaded;
        } else {
          this.currentByte = end;
        }

        this.notifyProgress(this.currentByte);

        if (this.currentByte >= this.totalBytes || (responseJson && responseJson.status === 'completed')) {
          // File fully assembled!
          this.setStatus('completed');
          if (this.onSuccess) {
            this.onSuccess({
              url: responseJson?.url || `https://uqlearn.org/uploads/${this.folder}/${this.file.name}`,
              file_path: responseJson?.file_path || responseJson?.url || `${this.folder}/${this.file.name}`,
              userId: responseJson?.user_id || responseJson?.userId || this.userId,
              total_bytes: responseJson?.total_bytes || this.totalBytes || this.file.size,
              file_size: responseJson?.total_bytes || this.totalBytes || this.file.size
            });
          }
          return;
        }

        // Send next chunk
        this.uploadNextChunk();
      } else {
        // Unexpected status code -> Retry
        this.handleChunkError(`Server responded with status ${xhr.status}`);
      }
    };

    xhr.onerror = () => {
      this.activeXhr = null;
      if (!this.isPaused && !this.isCancelled) {
        this.handleChunkError('Network error during chunk upload.');
      }
    };

    xhr.ontimeout = () => {
      this.activeXhr = null;
      if (!this.isPaused && !this.isCancelled) {
        this.handleChunkError('Chunk upload timed out.');
      }
    };

    // Send binary chunk
    xhr.send(chunkBlob);
  }

  /**
   * Handles chunk errors with auto-retry backoff
   */
  private handleChunkError(errorMessage: string): void {
    if (this.isPaused || this.isCancelled) return;

    this.setStatus('retrying');

    // Exponential backoff or simple retry after 3 seconds
    setTimeout(async () => {
      if (this.isPaused || this.isCancelled) return;
      // Re-check remote progress before retrying
      await this.checkRemoteProgress();
      this.setStatus('uploading');
      this.uploadNextChunk();
    }, 3000);
  }

  /**
   * Calculates metrics and triggers progress callback
   */
  private notifyProgress(uploadedBytes: number): void {
    const now = Date.now();
    const timeDiffSec = (now - this.lastTime) / 1000;

    let speedBps = 0;
    if (timeDiffSec >= 0.5) {
      const bytesDiff = uploadedBytes - this.lastBytes;
      speedBps = bytesDiff / timeDiffSec;
      this.lastTime = now;
      this.lastBytes = uploadedBytes;
    }

    const remainingBytes = Math.max(0, this.totalBytes - uploadedBytes);
    const remainingSeconds = speedBps > 0 ? Math.ceil(remainingBytes / speedBps) : 0;

    const percentage = Math.min(100, Math.round((uploadedBytes / this.totalBytes) * 100));
    const chunkTotal = Math.ceil(this.totalBytes / this.chunkSize);
    const chunkCurrent = Math.min(chunkTotal, Math.ceil(uploadedBytes / this.chunkSize));

    if (this.onProgress) {
      this.onProgress({
        percentage,
        uploadedBytes,
        totalBytes: this.totalBytes,
        speedBps,
        speedFormatted: this.formatSpeed(speedBps),
        remainingSeconds,
        remainingFormatted: this.formatEta(remainingSeconds),
        chunkCurrent,
        chunkTotal,
        uploadId: this.uploadId
      });
    }
  }

  private formatSpeed(bps: number): string {
    if (bps <= 0) return 'Calculating...';
    if (bps >= 1024 * 1024) {
      return `${(bps / (1024 * 1024)).toFixed(1)} MB/s`;
    }
    return `${(bps / 1024).toFixed(0)} KB/s`;
  }

  private formatEta(seconds: number): string {
    if (seconds <= 0) return 'Finalizing...';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins > 0) {
      return `${mins}m ${secs}s remaining`;
    }
    return `${secs}s remaining`;
  }
}
