import React, { useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import videojs from 'video.js';
import 'video.js/dist/video-js.css';
import 'videojs-contrib-quality-levels';

// Register custom Picture-in-Picture Button Component safely
const Button = videojs.getComponent('Button') as any;
class PiPButton extends Button {
  constructor(player: any, options: any) {
    super(player, options);
    (this as any).controlText('Picture-in-Picture');
    
    // Inject the SVG icon cleanly into the standard button's icon placeholder
    const iconPlaceholder = (this as any).el().querySelector('.vjs-icon-placeholder');
    if (iconPlaceholder) {
      iconPlaceholder.innerHTML = `
        <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" style="margin: auto; display: block; height: 100%;">
          <path d="M19 11h-8v6h8v-6zm4 8V4.98C23 3.88 22.1 3 21 3H3c-1.1 0-2 .88-2 1.98V19c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2zm-2 .02H3V4.97h18v14.05z"/>
        </svg>
      `;
    }
  }

  buildCSSClass() {
    return `vjs-picture-in-picture-control ${super.buildCSSClass()}`;
  }

  handleClick() {
    const videoEl = (this as any).player().tech().el() as HTMLVideoElement;
    if (document.pictureInPictureElement) {
      document.exitPictureInPicture().catch((err) => {
        console.error('Error exiting Picture-in-Picture:', err);
      });
    } else if (videoEl && videoEl.requestPictureInPicture) {
      videoEl.requestPictureInPicture().catch((error: any) => {
        console.error('Error enabling Picture-in-Picture:', error);
      });
    }
  }
}

// Only register if it hasn't been registered yet to avoid double-registration errors
if (!videojs.getComponent('PiPButton')) {
  videojs.registerComponent('PiPButton', PiPButton as any);
}

// Register custom Quality Level Switcher Menu Button
const MenuButton = videojs.getComponent('MenuButton') as any;
const MenuItem = videojs.getComponent('MenuItem') as any;

class QualityMenuItem extends MenuItem {
  qualityIndex: number;

  constructor(player: any, options: any) {
    super(player, options);
    this.qualityIndex = options.qualityIndex;
  }

  handleClick() {
    const qualityLevels = ((this as any).player() as any).qualityLevels();
    
    // Enable only the selected quality level, or enable all for "Auto"
    if (qualityLevels) {
      for (let i = 0; i < qualityLevels.length; i++) {
        if (this.qualityIndex === -1) {
          // Auto Quality: enable all levels
          qualityLevels[i].enabled = true;
        } else {
          // Explicit quality: enable only selected level
          qualityLevels[i].enabled = (i === this.qualityIndex);
        }
      }
    }
    
    // Set active selection state visually
    (this as any).selected(true);
    
    const parentMenu = (this as any).parentComponent_ as any;
    if (parentMenu && typeof parentMenu.update === 'function') {
      parentMenu.update();
    }
  }
}

class QualityMenuButton extends MenuButton {
  constructor(player: any, options: any) {
    super(player, options);
    (this as any).controlText('Quality');
    
    // Inject the SVG icon cleanly into the standard button's icon placeholder in the constructor
    const iconPlaceholder = (this as any).el().querySelector('.vjs-icon-placeholder');
    if (iconPlaceholder) {
      iconPlaceholder.innerHTML = `
        <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" style="margin: auto; display: block; height: 100%;">
          <path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/>
        </svg>
      `;
    }
    
    // Update the items dynamically when quality levels lists are added or modified
    const qualityLevels = ((this as any).player() as any).qualityLevels?.();
    if (qualityLevels && typeof qualityLevels.on === 'function') {
      qualityLevels.on('addqualitylevel', () => (this as any).update());
      qualityLevels.on('removequalitylevel', () => (this as any).update());
    }
  }

  buildCSSClass() {
    return `vjs-quality-selector-control ${super.buildCSSClass()}`;
  }

  createItems() {
    const items: any[] = [];
    const qualityLevels = ((this as any).player() as any).qualityLevels?.();

    if (!qualityLevels || qualityLevels.length === 0) {
      // Return a default item so the button has a dropdown structure and remains visible on MP4s
      items.push(new QualityMenuItem((this as any).player(), {
        label: 'Auto (Standard)',
        qualityIndex: -1,
        selected: true
      }));
      return items;
    }

    // 1. Calculate selection state for 'Auto'
    let isAutoSelected = true;
    for (let i = 0; i < qualityLevels.length; i++) {
      if (!qualityLevels[i].enabled) {
        isAutoSelected = false;
        break;
      }
    }

    items.push(new QualityMenuItem(this.player(), {
      label: 'Auto',
      qualityIndex: -1,
      selected: isAutoSelected
    }));

    // 2. Individual quality rendition items
    for (let i = 0; i < qualityLevels.length; i++) {
      const level = qualityLevels[i];
      const label = level.height ? `${level.height}p` : `${Math.round(level.bitrate / 1000)} kbps`;
      const isSelected = !isAutoSelected && level.enabled;

      items.push(new QualityMenuItem(this.player(), {
        label: label,
        qualityIndex: i,
        selected: isSelected
      }));
    }

    return items;
  }
}

if (!videojs.getComponent('QualityMenuButton')) {
  videojs.registerComponent('QualityMenuButton', QualityMenuButton as any);
}

export interface SubtitleTrack {
  src: string;
  label: string;
  srclang: string;
  kind?: 'subtitles' | 'captions' | 'descriptions' | 'chapters' | 'metadata';
  default?: boolean;
}

interface VideoPlayerComponentProps {
  src: string;
  poster?: string;
  tracks?: SubtitleTrack[];
  controls?: boolean;
  autoplay?: boolean | string;
  loop?: boolean;
  muted?: boolean;
  preload?: 'auto' | 'metadata' | 'none';
  playbackRates?: number[];
  onReady?: (player: any) => void;
  onPlay?: () => void;
  onPause?: () => void;
  onEnded?: () => void;
  onTimeUpdate?: (currentTime: number, duration: number) => void;
  onLoadedMetadata?: (duration: number) => void;
  className?: string;
}

export const VideoPlayerComponent = forwardRef<any, VideoPlayerComponentProps>(({
  src,
  poster,
  tracks = [],
  controls = true,
  autoplay = false,
  loop = false,
  muted = false,
  preload = 'auto',
  playbackRates = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2],
  onReady,
  onPlay,
  onPause,
  onEnded,
  onTimeUpdate,
  onLoadedMetadata,
  className = '',
}, ref) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const playerRef = useRef<any>(null);

  // Expose standard HTML5 Video element properties and methods to parent via forwardRef
  useImperativeHandle(ref, () => ({
    get currentTime() {
      return playerRef.current ? playerRef.current.currentTime() : 0;
    },
    set currentTime(val: number) {
      if (playerRef.current) {
        playerRef.current.currentTime(val);
      }
    },
    get duration() {
      return playerRef.current ? playerRef.current.duration() : 0;
    },
    get paused() {
      return playerRef.current ? playerRef.current.paused() : true;
    },
    get muted() {
      return playerRef.current ? playerRef.current.muted() : false;
    },
    set muted(val: boolean) {
      if (playerRef.current) {
        playerRef.current.muted(val);
      }
    },
    play() {
      if (playerRef.current) {
        return playerRef.current.play();
      }
      return Promise.resolve();
    },
    pause() {
      if (playerRef.current) {
        playerRef.current.pause();
      }
    },
    requestFullscreen() {
      if (playerRef.current) {
        playerRef.current.requestFullscreen();
      }
    }
  }));

  // Helper to extract YouTube video ID
  const getYouTubeId = (url: string): string | null => {
    if (!url) return null;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  const isYouTube = getYouTubeId(src) !== null;
  const ytId = getYouTubeId(src);

  // Helper to determine stream type based on source extension
  const getSourceType = (url: string): string => {
    if (!url) return 'video/mp4';
    const cleanUrl = url.split('?')[0].split('#')[0];
    if (cleanUrl.endsWith('.m3u8')) {
      return 'application/x-mpegURL';
    }
    if (cleanUrl.endsWith('.mpd')) {
      return 'application/dash+xml';
    }
    if (cleanUrl.endsWith('.webm')) {
      return 'video/webm';
    }
    if (cleanUrl.endsWith('.ogg')) {
      return 'video/ogg';
    }
    return 'video/mp4'; // Default fallback
  };

  useEffect(() => {
    // If it is YouTube, don't initialize Video.js
    if (isYouTube || !containerRef.current) return;

    // Create custom video element dynamically inside container
    const videoElement = document.createElement('video');
    videoElement.classList.add('video-js', 'vjs-big-play-centered', 'w-full', 'h-full');
    containerRef.current.appendChild(videoElement);

    const videoJsOptions = {
      autoplay,
      controls,
      preload,
      loop,
      muted,
      playbackRates,
      responsive: true,
      fluid: true,
      poster,
      sources: [
        {
          src: src,
          type: getSourceType(src),
        },
      ],
      controlBar: {
        skipButtons: {
          forward: 10,
          backward: 10,
        },
        children: [
          'playToggle',
          'skipBackward',
          'skipForward',
          'volumePanel',
          'currentTimeDisplay',
          'timeDivider',
          'durationDisplay',
          'progressControl',
          'liveDisplay',
          'playbackRateMenuButton',
          'subsCapsButton',
          'audioTrackButton',
          'QualityMenuButton',
          'PiPButton',
          'fullscreenToggle',
        ],
      },
    };

    // Initialize Video.js player
    const player = videojs(videoElement, videoJsOptions, () => {
      if (onReady) {
        onReady(player);
      }
    });

    playerRef.current = player;

    // Attach event listeners
    if (onPlay) player.on('play', onPlay);
    if (onPause) player.on('pause', onPause);
    if (onEnded) player.on('ended', onEnded);
    
    player.on('error', () => {
      const err = player.error();
      console.warn('Video.js error encountered:', err);
      if (err && err.code === 4) {
        player.src({
          src: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
          type: 'video/mp4'
        });
        player.load();
      }
    });

    player.on('timeupdate', () => {
      if (onTimeUpdate) {
        onTimeUpdate(player.currentTime(), player.duration());
      }
    });

    player.on('loadedmetadata', () => {
      if (onLoadedMetadata) {
        onLoadedMetadata(player.duration());
      }
    });

    // Clean up function
    return () => {
      if (player && !player.isDisposed()) {
        player.dispose();
        playerRef.current = null;
      }
    };
  }, [isYouTube]); // Re-run effect if source type flips between file & youtube

  // Update source dynamically without fully re-creating the player when src changes
  useEffect(() => {
    const player = playerRef.current;
    if (player && src && !isYouTube) {
      player.src({
        src: src,
        type: getSourceType(src),
      });
      if (poster) {
        player.poster(poster);
      }
      player.load(); // Reload stream cleanly
    }
  }, [src, poster, isYouTube]);

  // Synchronize remote WebVTT subtitle tracks dynamically
  useEffect(() => {
    const player = playerRef.current;
    if (player && !isYouTube) {
      // Safely clear old remote text tracks
      const oldTracks = player.remoteTextTracks();
      let i = oldTracks.length;
      while (i--) {
        player.removeRemoteTextTrack(oldTracks[i]);
      }

      // Append new text tracks
      if (tracks && tracks.length > 0) {
        tracks.forEach((track) => {
          player.addRemoteTextTrack({
            kind: track.kind || 'subtitles',
            src: track.src,
            srclang: track.srclang,
            label: track.label,
            default: track.default || false,
          }, true);
        });
      }
    }
  }, [tracks, src, isYouTube]);

  if (isYouTube && ytId) {
    return (
      <div className={`relative w-full h-full rounded-lg overflow-hidden bg-black ${className}`}>
        <iframe
          src={`https://www.youtube.com/embed/${ytId}?enablejsapi=1&rel=0&modestbranding=1`}
          className="absolute inset-0 w-full h-full border-0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          title="YouTube Video Player"
        />
      </div>
    );
  }

  return (
    <div data-vjs-player className={`w-full h-full ${className}`}>
      <div ref={containerRef} className="w-full h-full rounded-lg overflow-hidden" />
    </div>
  );
});

VideoPlayerComponent.displayName = 'VideoPlayerComponent';
export default VideoPlayerComponent;
