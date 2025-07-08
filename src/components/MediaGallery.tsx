import React, { useState, useEffect, useRef } from 'react';
import { Download, X, Play, Image as ImageIcon, Video, Trash2, Camera, Sparkles } from 'lucide-react';
import { CapturedMedia } from '../types/media';

interface MediaGalleryProps {
  media: CapturedMedia[];
  isLoading?: boolean;
  onDownload: (media: CapturedMedia) => void;
  onRemove: (id: string) => void;
  onClearAll: () => void;
  onMediaSelectForPreview: (media: CapturedMedia) => void;
  isMobile?: boolean;
  onBackToCamera?: () => void;
}

// Unified video thumbnail component that generates canvas-based thumbnails for all devices
const VideoThumbnail: React.FC<{ 
  src: string; 
  className?: string; 
  onClick?: () => void;
  isMobile?: boolean;
}> = ({ src, className, onClick, isMobile = false }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    // Reset states when src changes
    setThumbnailUrl(null);
    setIsLoading(true);
    setHasError(false);

    // Unified thumbnail generation for both mobile and desktop
    const generateThumbnail = async () => {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas) return;

      let cleanedUp = false;

      try {
        // Create a promise that resolves when video can play
        const videoReady = new Promise<void>((resolve, reject) => {
          const handleCanPlay = () => {
            if (cleanedUp) return;
            video.removeEventListener('canplay', handleCanPlay);
            video.removeEventListener('error', handleError);
            resolve();
          };

          const handleError = () => {
            if (cleanedUp) return;
            video.removeEventListener('canplay', handleCanPlay);
            video.removeEventListener('error', handleError);
            reject();
          };

          video.addEventListener('canplay', handleCanPlay);
          video.addEventListener('error', handleError);

          // Set video source and load
          video.src = src;
          video.load();
          
          // Try to play and immediately pause to load first frame
          video.play().catch(() => {
            // Ignore play errors, we just want to load the video
          });
          video.pause();
        });

        // Wait for video to be ready with timeout
        await Promise.race([
          videoReady,
          new Promise((_, reject) => setTimeout(reject, 8000)) // Longer timeout for better reliability
        ]);

        if (cleanedUp) return;

        // Seek to a good position for thumbnail (but not too early)
        const seekTime = Math.min(1.0, video.duration * 0.1); // Seek to 10% or 1 second, whichever is smaller
        video.currentTime = seekTime;

        // Wait for seek to complete
        await new Promise<void>((resolve) => {
          const handleSeeked = () => {
            video.removeEventListener('seeked', handleSeeked);
            resolve();
          };
          video.addEventListener('seeked', handleSeeked);
          
          // Fallback timeout in case seeked event doesn't fire
          setTimeout(resolve, 1000);
        });

        if (cleanedUp) return;

        // Ensure video is ready before drawing
        if (video.readyState < video.HAVE_CURRENT_DATA) {
          throw new Error('Video not ready for thumbnail generation');
        }

        // Draw frame to canvas
        const ctx = canvas.getContext('2d');
        if (ctx && video.videoWidth > 0 && video.videoHeight > 0) {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          
          // Clear canvas first
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          
          // Handle rotation for mobile if needed
          if (isMobile) {
            const isPortraitVideo = video.videoHeight > video.videoWidth;
            const isLandscapeOrientation = window.innerWidth > window.innerHeight;
            
            if (isPortraitVideo && isLandscapeOrientation) {
              // Rotate for mobile landscape
              ctx.save();
              ctx.translate(canvas.width / 2, canvas.height / 2);
              ctx.rotate(Math.PI / 2);
              ctx.drawImage(video, -video.videoWidth / 2, -video.videoHeight / 2, video.videoWidth, video.videoHeight);
              ctx.restore();
            } else {
              ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            }
          } else {
            // Desktop: straightforward drawing
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          }

          // Convert to blob and create URL
          canvas.toBlob((blob) => {
            if (cleanedUp || !blob) return;
            const url = URL.createObjectURL(blob);
            setThumbnailUrl(url);
            setIsLoading(false);
          }, 'image/jpeg', 0.8);
        } else {
          throw new Error('Invalid video dimensions or context');
        }
      } catch (error) {
        console.error('Failed to generate video thumbnail:', error);
        if (!cleanedUp) {
          setHasError(true);
          setIsLoading(false);
        }
      }

      return () => {
        cleanedUp = true;
      };
    };

    generateThumbnail();

    // Cleanup function
    return () => {
      if (thumbnailUrl) {
        URL.revokeObjectURL(thumbnailUrl);
      }
    };
  }, [src, isMobile]);

  // Cleanup thumbnail URL on unmount
  useEffect(() => {
    return () => {
      if (thumbnailUrl) {
        URL.revokeObjectURL(thumbnailUrl);
      }
    };
  }, [thumbnailUrl]);

  return (
    <div className={`relative ${className}`} onClick={onClick}>
      {/* Hidden video element for processing */}
      <video
        ref={videoRef}
        muted
        playsInline
        preload="metadata"
        className="absolute top-0 left-0 w-0 h-0 opacity-0 pointer-events-none"
        style={{ visibility: 'hidden' }}
      />
      
      {/* Hidden canvas for thumbnail generation */}
      <canvas
        ref={canvasRef}
        className="absolute top-0 left-0 w-0 h-0 opacity-0 pointer-events-none"
        style={{ visibility: 'hidden' }}
      />

      {/* Display content */}
      {!hasError ? (
        <>
          {/* Show generated thumbnail when available */}
          {thumbnailUrl && (
            <img
              src={thumbnailUrl}
              alt="Video thumbnail"
              className="w-full h-full object-cover"
              style={{ 
                display: isLoading ? 'none' : 'block'
              }}
            />
          )}
          
          {/* Loading state */}
          {isLoading && (
            <div className="absolute inset-0 bg-zinc-800 flex items-center justify-center">
              <div className="flex flex-col items-center justify-center space-y-1.5 px-2">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-zinc-300"></div>
                <span className="text-[10px] text-zinc-400 text-center leading-tight">Loading...</span>
              </div>
            </div>
          )}
          
          {/* Play button overlay - only when not loading and no error */}
          {!isLoading && !hasError && thumbnailUrl && (
            <div className="absolute inset-0 bg-black bg-opacity-20 flex items-center justify-center">
              <div className="bg-black/50 backdrop-blur-sm rounded-full p-2.5 border border-white/30 shadow-lg">
                <Play className="h-4 w-4 text-white fill-white ml-0.5" />
              </div>
            </div>
          )}
        </>
      ) : (
        /* Error/Fallback state */
        <>
          <div className="w-full h-full bg-zinc-800 flex items-center justify-center">
            <div className="flex flex-col items-center justify-center space-y-1 px-2">
              <Video className="h-6 w-6 text-zinc-400" />
              <span className="text-[10px] text-zinc-500 text-center">Video</span>
            </div>
          </div>
          {/* Play button still shown on error for consistency */}
          <div className="absolute inset-0 bg-black bg-opacity-20 flex items-center justify-center">
            <div className="bg-black/50 backdrop-blur-sm rounded-full p-2.5 border border-white/30 shadow-lg">
              <Play className="h-4 w-4 text-white fill-white ml-0.5" />
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export const MediaGallery: React.FC<MediaGalleryProps> = ({
  media,
  isLoading = false,
  onDownload,
  onRemove,
  onClearAll,
  onMediaSelectForPreview,
  isMobile = false,
  onBackToCamera
}) => {
  return (
    <>
      <div className={`space-y-4 ${isMobile ? 'pt-4' : ''}`}>
        {/* Mobile Header with Back Button */}
        {isMobile && onBackToCamera && (
          <div className="flex items-center justify-between mb-6">
            <div className="flex flex-col items-center w-20">
              <button
                onClick={onBackToCamera}
                className="bg-zinc-800 text-gray-100 p-3 rounded-full hover:bg-zinc-700 transition-all duration-200 backdrop-blur-xl border border-zinc-700 shadow-lg"
              >
                <Camera className="h-5 w-5" />
              </button>
              <span className="text-[10px] text-zinc-500 mt-1 font-medium">back to camera</span>
            </div>
            <h2 className="text-lg font-semibold text-gray-100 flex-1 text-center">
              Gallery ({media.length})
            </h2>
            {media.length > 0 && (
              <div className="flex flex-col items-center w-20">
                <button
                  onClick={onClearAll}
                  className="bg-zinc-800 text-gray-100 p-3 rounded-full hover:bg-red-600 transition-all duration-200 backdrop-blur-xl border border-zinc-700 shadow-lg"
                >
                  <Trash2 className="h-5 w-5" />
                </button>
                <span className="text-[10px] text-zinc-500 mt-1 font-medium">delete all</span>
              </div>
            )}
            {media.length === 0 && (
              <div className="w-20 h-12" />
            )}
          </div>
        )}
        
        {/* Header */}
        {!isMobile && (
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-100">
              Captured Media ({media.length})
            </h2>
            {media.length > 0 && (
              <button
                onClick={onClearAll}
                className="text-zinc-400 hover:text-red-500 text-sm flex items-center space-x-1 transition-colors duration-200 font-medium"
              >
                <Trash2 className="h-4 w-4" />
                <span>Clear All</span>
              </button>
            )}
          </div>
        )}

        {/* Content Area */}
        {isLoading ? (
          <div className={`text-center ${isMobile ? 'py-12' : 'py-20'}`}>
            <div className="w-20 h-20 bg-zinc-800 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-zinc-400"></div>
            </div>
            <p className="text-zinc-400 text-lg font-medium mb-2">Loading your media...</p>
            <p className="text-zinc-500 text-sm">Restoring from local storage</p>
          </div>
        ) : media.length === 0 ? (
          <div className={`text-center ${isMobile ? 'py-12' : 'py-20'}`}>
            <div className="w-20 h-20 bg-zinc-800 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <ImageIcon className="h-10 w-10 text-zinc-400" />
            </div>
            <p className="text-zinc-400 text-lg font-medium mb-2">No media captured yet</p>
            <p className="text-zinc-500 text-sm">Start capturing with the camera</p>
          </div>
        ) : (
          /* Media Grid */
          <div className="grid grid-cols-3 gap-3">
            {media.map((item) => (
              <div key={item.id} className="group relative">
                <div 
                  className={`aspect-square bg-zinc-800 rounded-xl overflow-hidden cursor-pointer shadow-lg border border-zinc-700 ${
                    !isMobile ? 'hover:scale-105 transition-transform duration-200' : 'active:scale-95 transition-transform duration-150'
                  }`}
                  onClick={() => onMediaSelectForPreview(item)}
                >
                  {item.type === 'photo' ? (
                    <img
                      src={item.url}
                      alt="Captured"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <VideoThumbnail
                      key={`video-${item.id}`}
                      src={item.url}
                      className="w-full h-full"
                      isMobile={isMobile}
                    />
                  )}

                  {/* Gemini Analysis Badge - For Videos Only */}
                  {item.type === 'video' && item.geminiAnalysis && (
                    <div className="absolute top-2 right-2 z-10">
                      {item.geminiAnalysis.isProcessing ? (
                        <div className="bg-blue-600/80 backdrop-blur-sm rounded-full p-1.5 border border-blue-400/30">
                          <div className="animate-spin rounded-full h-3 w-3 border-b border-white"></div>
                        </div>
                      ) : item.geminiAnalysis.pushupData ? (
                        <div className="bg-purple-600/80 backdrop-blur-sm rounded-lg px-2 py-1 border border-purple-400/30">
                          <div className="flex items-center space-x-1">
                            <span className="text-white text-xs">💪</span>
                            <span className="text-white text-xs font-medium">{item.geminiAnalysis.pushupData.summary.totalCount}</span>
                          </div>
                        </div>
                      ) : item.geminiAnalysis.result ? (
                        <div className="bg-green-600/80 backdrop-blur-sm rounded-full p-1.5 border border-green-400/30">
                          <Sparkles className="h-3 w-3 text-white" />
                        </div>
                      ) : item.geminiAnalysis.error ? (
                        <div className="bg-red-600/80 backdrop-blur-sm rounded-full p-1.5 border border-red-400/30">
                          <X className="h-3 w-3 text-white" />
                        </div>
                      ) : null}
                    </div>
                  )}

                  {/* Hover Actions - Desktop Only */}
                  {!isMobile && (
                    <div className="absolute inset-0 bg-gradient-to-t from-zinc-900/90 via-zinc-900/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-end justify-center pb-3">
                      <div className="flex space-x-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDownload(item);
                        }}
                        className="bg-gray-600/80 hover:bg-gray-400/90 text-white p-2.5 rounded-full transition-all duration-200 backdrop-blur-sm border border-zinc-600/30 shadow-lg hover:scale-110"
                      >
                        <Download className="h-4 w-4" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onRemove(item.id);
                        }}
                        className="bg-gray-600/80 hover:bg-gray-400/90 text-white p-2.5 rounded-full transition-all duration-200 backdrop-blur-sm border border-zinc-600/30 shadow-lg hover:scale-110"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
};