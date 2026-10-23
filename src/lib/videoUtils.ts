export const generateVideoThumbnailFile = (file: File): Promise<File> => {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.playsInline = true;
    video.muted = true;
    const url = URL.createObjectURL(file);
    video.src = url;

    video.onloadeddata = () => {
      // Seek to 1 second, or half the duration if very short
      video.currentTime = Math.min(1, video.duration / 2 || 0);
    };

    video.onseeked = () => {
      const canvas = document.createElement('canvas');
      // Scale down to a reasonable thumbnail size while keeping aspect ratio
      const MAX_WIDTH = 640;
      let width = video.videoWidth;
      let height = video.videoHeight;
      
      if (width > MAX_WIDTH) {
        height = Math.floor(height * (MAX_WIDTH / width));
        width = MAX_WIDTH;
      }
      
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        canvas.toBlob((blob) => {
          if (blob) {
            const thumbFile = new File([blob], `${file.name.replace(/\.[^/.]+$/, "")}_thumb.jpg`, { type: 'image/jpeg' });
            resolve(thumbFile);
          } else {
            reject(new Error('Failed to generate blob'));
          }
          URL.revokeObjectURL(url);
        }, 'image/jpeg', 0.7);
      } else {
        URL.revokeObjectURL(url);
        reject(new Error('Failed to get canvas context'));
      }
    };

    video.onerror = (err) => {
      URL.revokeObjectURL(url);
      reject(err);
    };
  });
};
