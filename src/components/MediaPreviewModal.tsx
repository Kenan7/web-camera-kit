import React, { useState, useEffect, useRef } from 'react';
import { Download, X, Trash2, Share2, ArrowLeft } from 'lucide-react';
import { useMobileDetection } from '../hooks/useMobileDetection';
import { CapturedMedia } from '../types/media';
import { PushupAnalysisOverlay } from './PushupAnalysisOverlay';

interface MediaPreviewModalProps {
  media: CapturedMedia;
  onClose: () => void;
  onDownload: (media: CapturedMedia) => void;
  onDownloadBlob?: (media: CapturedMedia) => void;
  onRemove: (id: string) => void;
}

export const MediaPreviewModal: React.FC<MediaPreviewModalProps> = ({ 
  media, 
  onClose, 
  onDownload, 
  onDownloadBlob,
  onRemove 
}) => {
  const [showControls, setShowControls] = useState(false);
  const [showAnalysisOverlay, setShowAnalysisOverlay] = useState(false);
  
  const { isMobile } = useMobileDetection();
  const imageRef = useRef<HTMLImageElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const handleVideoClick = (e: React.MouseEvent<HTMLVideoElement>) => {
    const video = e.target as HTMLVideoElement;
    if (!showControls) {
      video.controls = true;
      setShowControls(true);
    }
  };

  // Simplified mobile download function
  const triggerMobileDownload = async (media: CapturedMedia) => {
    try {
      // Method 1: Try native share API first (most reliable on mobile)
      if (isMobile && 'share' in navigator && navigator.canShare) {
        const file = new File([media.blob], media.filename, { 
          type: media.blob.type 
        });
        
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: 'Download Image',
            text: `Image from CameraApp`
          });
          return;
        }
      }

      // Method 2: Create a download link with proper blob handling
      const url = URL.createObjectURL(media.blob);
      const link = document.createElement('a');
      
      // Set attributes for better mobile compatibility
      link.href = url;
      link.download = media.filename;
      link.style.display = 'none';
      link.setAttribute('target', '_blank');
      link.setAttribute('rel', 'noopener noreferrer');
      
      // Add to DOM, click, then remove
      document.body.appendChild(link);
      
      // Use a timeout to ensure the link is properly added to DOM
      setTimeout(() => {
        link.click();
        
        // Clean up after a delay
        setTimeout(() => {
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
        }, 100);
      }, 10);
      
    } catch (error) {
      console.error('Download failed:', error);
      
      // Fallback: Open in new tab
      try {
        const url = URL.createObjectURL(media.blob);
        window.open(url, '_blank');
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      } catch (fallbackError) {
        console.error('Fallback also failed:', fallbackError);
      }
    }
  };

  // Regular download for desktop or button press
  const handleDownload = () => {
    if (isMobile) {
      triggerMobileDownload(media);
    } else {
      if (onDownloadBlob) {
        onDownloadBlob(media);
      } else {
        onDownload(media);
      }
    }
  };

  // Share functionality for mobile (now handles download + share)
  const handleShareDownload = async () => {
    if (!isMobile) {
      // Desktop: just download
      handleDownload();
      return;
    }
    
    // Mobile: try to share, fallback to download
    try {
      if ('share' in navigator) {
        const file = new File([media.blob], media.filename, { 
          type: media.blob.type 
        });
        
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: 'Shared from CameraApp',
            text: `Check out this ${media.type === 'photo' ? 'photo' : 'video'} I captured!`
          });
          return;
        }
      }
      
      // Fallback to download if sharing isn't supported
      handleDownload();
    } catch (error) {
      console.log('Sharing failed, falling back to download:', error);
      handleDownload();
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{
        background: !isMobile 
          ? `
            radial-gradient(ellipse at 20% 80%, rgba(59, 130, 246, 0.12) 0%, transparent 50%),
            radial-gradient(ellipse at 80% 20%, rgba(139, 92, 246, 0.10) 0%, transparent 50%),
            radial-gradient(ellipse at 40% 40%, rgba(6, 182, 212, 0.06) 0%, transparent 50%),
            linear-gradient(135deg, rgba(9, 9, 11, 0.95) 0%, rgba(17, 17, 17, 0.95) 25%, rgba(15, 15, 15, 0.95) 50%, rgba(13, 13, 13, 0.95) 75%, rgba(9, 9, 11, 0.95) 100%)
          `
          : 'rgba(9, 9, 11, 0.95)'
      }}
    >
      <div className="relative max-w-4xl max-h-full w-full flex flex-col">
        {/* Media Display Container */}
        <div className="relative overflow-hidden flex-1 flex items-center justify-center">
          {/* Close X Button - Desktop Only */}
          {!isMobile && (
            <button
              onClick={onClose}
              className="absolute top-4 left-4 z-10 text-white hover:text-zinc-300 p-2 transition-all duration-200 hover:scale-110 focus:outline-none"
            >
              <X className="h-6 w-6" />
            </button>
          )}

          {/* Media Content */}
          {media.type === 'photo' ? (
            <div className="relative w-full h-full flex items-center justify-center p-4">
              <img
                ref={imageRef}
                src={media.url}
                alt="Captured photo"
                className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
                draggable={false}
                style={{
                  objectFit: 'contain',
                  width: 'auto',
                  height: 'auto',
                  maxWidth: '100%',
                  maxHeight: isMobile ? 'calc(85vh - 2rem)' : 'calc(80vh - 2rem)',
                  userSelect: 'none',
                  WebkitUserSelect: 'none',
                  touchAction: 'manipulation',
                  pointerEvents: 'auto'
                }}
              />
            </div>
          ) : (
            <div className="w-full h-full flex items-center justify-center p-4 relative">
              <video
                ref={videoRef}
                src={media.url}
                controls={showControls}
                onClick={handleVideoClick}
                className="w-full h-full max-w-full object-contain cursor-pointer rounded-lg shadow-2xl"
                autoPlay
                playsInline
                muted
                style={{
                  maxHeight: isMobile ? 'calc(78vh - 4rem)' : 'calc(80vh - 2rem)',
                  maxWidth: '100%',
                  objectFit: 'contain'
                }}
              />
              
              {/* Pushup Analysis Overlay */}
              {media.geminiAnalysis?.pushupData && (
                <PushupAnalysisOverlay
                  analysis={media.geminiAnalysis.pushupData}
                  videoRef={videoRef}
                  isVisible={showAnalysisOverlay}
                  onToggle={() => setShowAnalysisOverlay(!showAnalysisOverlay)}
                />
              )}
            </div>
          )}
        </div>

        {/* Gemini Analysis Section - For Videos Only (fallback for raw text) */}
        {media.type === 'video' && media.geminiAnalysis && !media.geminiAnalysis.pushupData && (
          <div className="mt-4 mb-2 mx-4 p-4 bg-zinc-800/50 backdrop-blur-sm rounded-lg border border-zinc-700">
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                  <span className="text-white text-sm font-bold">AI</span>
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium text-gray-100">Gemini Analysis</h3>
                  {media.geminiAnalysis.result && (
                    <div className="flex space-x-2">
                      <button
                        onClick={() => {
                          console.log('Raw analysis result:', media.geminiAnalysis?.result);
                          console.log('Pushup data parsed:', media.geminiAnalysis?.pushupData);
                          
                          // Try to reparse the result
                          if (media.geminiAnalysis?.result) {
                            import('../utils/analysisParser').then(({ parseAnalysisResult }) => {
                              const parsed = parseAnalysisResult(media.geminiAnalysis!.result);
                              console.log('Reparse attempt result:', parsed);
                              if (parsed) {
                                alert('JSON parsing successful! Refresh the page to see the interactive overlay.');
                              } else {
                                alert('JSON parsing failed. Check console for details.');
                              }
                            });
                          }
                        }}
                        className="text-xs text-blue-400 hover:text-blue-300"
                      >
                        🔄 Reparse
                      </button>
                      <button
                        onClick={() => {
                          console.log('Raw analysis result:', media.geminiAnalysis?.result);
                          console.log('Pushup data parsed:', media.geminiAnalysis?.pushupData);
                        }}
                        className="text-xs text-gray-400 hover:text-gray-300"
                      >
                        Debug
                      </button>
                    </div>
                  )}
                </div>
                
                {media.geminiAnalysis.isProcessing ? (
                  <div className="flex items-center space-x-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-400"></div>
                    <span className="text-sm text-zinc-400">Analyzing video...</span>
                  </div>
                ) : media.geminiAnalysis.error ? (
                  <div className="text-sm text-red-400">
                    <span className="font-medium">Analysis failed:</span> {media.geminiAnalysis.error}
                  </div>
                ) : media.geminiAnalysis.result ? (
                  <div className="text-sm text-zinc-300 leading-relaxed">
                    {media.geminiAnalysis.result}
                  </div>
                ) : (
                  <div className="text-sm text-zinc-500 italic">
                    No analysis available
                  </div>
                )}
                
                {!media.geminiAnalysis.isProcessing && (
                  <div className="mt-2 text-xs text-zinc-500">
                    Analyzed on {new Date(media.geminiAnalysis.timestamp).toLocaleDateString()}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Controls - Fixed position below media */}
        <div className="mt-6 flex-shrink-0">
          {isMobile ? (
            /* Mobile Layout - Back button on left, actions on right */
            <div className="flex items-center justify-between px-4">
              {/* Back button */}
              <button
                onClick={onClose}
                className="bg-zinc-800/80 text-gray-100 p-4 rounded-full flex items-center justify-center transition-all duration-200 font-medium hover:bg-zinc-700 hover:scale-110 shadow-lg backdrop-blur-xl border border-zinc-700"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              
              {/* Action buttons */}
              <div className="flex items-center space-x-4">
                <button
                  onClick={handleShareDownload}
                  className="bg-gray-600 hover:bg-gray-400 text-white p-4 rounded-full flex items-center justify-center transition-all duration-200 font-medium hover:scale-110 shadow-lg backdrop-blur-xl border border-zinc-700"
                >
                  <Download className="h-5 w-5" />
                </button>
                
                <button
                  onClick={() => onRemove(media.id)}
                  className="bg-gray-600 hover:bg-gray-400 text-white p-4 rounded-full flex items-center justify-center transition-all duration-200 font-medium hover:scale-110 shadow-lg border border-zinc-700"
                >
                  <Trash2 className="h-5 w-5" />
                </button>
              </div>
            </div>
          ) : (
            /* Desktop Layout - Centered actions only */
            <div className="flex justify-center items-center space-x-4">
              <button
                onClick={handleShareDownload}
                className="bg-gray-600 hover:bg-gray-400 text-white p-4 rounded-full flex items-center justify-center transition-all duration-200 font-medium hover:scale-110 shadow-lg backdrop-blur-xl border border-zinc-700"
              >
                <Download className="h-5 w-5" />
              </button>
              
              <button
                onClick={() => onRemove(media.id)}
                className="bg-gray-600 hover:bg-gray-400 text-white p-4 rounded-full flex items-center justify-center transition-all duration-200 font-medium hover:scale-110 shadow-lg border border-zinc-700"
              >
                <Trash2 className="h-5 w-5" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};