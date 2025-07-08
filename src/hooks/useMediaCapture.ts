import { useState, useCallback, useEffect } from 'react';
import { CapturedMedia, CameraMode, PushupAnalysis } from '../types/media';
import { mediaDatabase, StoredMediaData } from '../utils/indexedDb';
import { geminiService } from '../utils/geminiService';
import { parseAnalysisResult, reprocessAnalysis } from '../utils/analysisParser';

export const useMediaCapture = () => {
  const [capturedMedia, setCapturedMedia] = useState<CapturedMedia[]>([]);
  const [isCapturing, setIsCapturing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Load persisted media on initialization
  useEffect(() => {
    const loadPersistedMedia = async () => {
      try {
        console.log('Loading persisted media from IndexedDB...');
        const storedMedia = await mediaDatabase.getAllMedia();
        
        if (storedMedia.length > 0) {
          const restoredMedia: CapturedMedia[] = storedMedia.map((stored: StoredMediaData) => ({
            id: stored.id,
            type: stored.type,
            url: URL.createObjectURL(stored.blob),
            blob: stored.blob,
            timestamp: stored.timestamp,
            filename: stored.filename,
            indexedDbId: stored.id, // Store the IndexedDB ID for future reference
            geminiAnalysis: stored.geminiAnalysis
          }));
          
          // Sort by timestamp (newest first)
          restoredMedia.sort((a, b) => b.timestamp - a.timestamp);
          
          setCapturedMedia(restoredMedia);
          console.log(`Restored ${restoredMedia.length} media items from IndexedDB`);
          
          // Reprocess any analysis that might have JSON but wasn't parsed
          setTimeout(() => {
            reprocessAnalysis(restoredMedia, (id, pushupData) => {
              setCapturedMedia(prev => 
                prev.map(m => 
                  m.id === id 
                    ? { 
                        ...m, 
                        geminiAnalysis: {
                          ...m.geminiAnalysis!,
                          pushupData
                        }
                      }
                    : m
                )
              );
            });
          }, 1000);
        }
      } catch (error) {
        console.error('Failed to load persisted media:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadPersistedMedia();
  }, []);

  // Cleanup object URLs when component unmounts
  useEffect(() => {
    return () => {
      capturedMedia.forEach(media => {
        if (media.url.startsWith('blob:')) {
          URL.revokeObjectURL(media.url);
        }
      });
    };
  }, []);

  // Function to process video with Gemini
  const processVideoWithGemini = useCallback(async (media: CapturedMedia) => {
    if (media.type !== 'video' || !media.geminiAnalysis) return;

    try {
      const prompt = media.geminiAnalysis.prompt || 'Analyze this video and describe what you see in detail.';
      
      const result = await geminiService.processVideo(media.blob, { prompt });
      
      if (result.success && result.result) {
        // Parse JSON if it's a pushup analysis
        const pushupData = parseAnalysisResult(result.result) || undefined;

        // Update the media with Gemini results
        const updatedAnalysis = {
          ...media.geminiAnalysis,
          result: result.result,
          pushupData,
          isProcessing: false
        };

        // Update in state
        setCapturedMedia(prev => 
          prev.map(m => 
            m.id === media.id 
              ? { ...m, geminiAnalysis: updatedAnalysis }
              : m
          )
        );

        // Update in IndexedDB
        if (media.indexedDbId) {
          const updatedStoredData: StoredMediaData = {
            id: media.id,
            type: media.type,
            blob: media.blob,
            timestamp: media.timestamp,
            filename: media.filename,
            geminiAnalysis: updatedAnalysis
          };
          
          await mediaDatabase.storeMedia(updatedStoredData);
        }

        console.log('Gemini analysis completed for video:', media.id);
      } else {
        // Handle error
        const errorAnalysis = {
          ...media.geminiAnalysis,
          isProcessing: false,
          error: result.error || 'Analysis failed'
        };

        setCapturedMedia(prev => 
          prev.map(m => 
            m.id === media.id 
              ? { ...m, geminiAnalysis: errorAnalysis }
              : m
          )
        );

        console.error('Gemini analysis failed for video:', media.id, result.error);
      }
    } catch (error) {
      console.error('Error during Gemini processing:', error);
      
      // Update with error state
      setCapturedMedia(prev => 
        prev.map(m => 
          m.id === media.id 
            ? { 
                ...m, 
                geminiAnalysis: {
                  ...m.geminiAnalysis!,
                  isProcessing: false,
                  error: 'Processing failed'
                }
              }
            : m
        )
      );
    }
  }, []);

  const addMedia = useCallback(async (media: CapturedMedia) => {
    try {
      // For videos, start Gemini processing immediately
      let mediaWithProcessing = media;
      
      if (media.type === 'video' && geminiService.isConfigured()) {
        // Add processing indicator
        mediaWithProcessing = {
          ...media,
          geminiAnalysis: {
            result: '',
            prompt: `Analyze this pushup video and provide detailed structured information. Return ONLY a valid JSON object with this exact structure:

{
  "summary": {
    "totalCount": <number>,
    "validPushups": <number>,
    "invalidPushups": <number>,
    "duration": "<MM:SS>",
    "averageRepsPerMinute": <number>
  },
  "quality": {
    "overallScore": <1-10>,
    "formNotes": ["<note1>", "<note2>"],
    "commonIssues": ["<issue1>", "<issue2>"]
  },
  "timeline": [
    {
      "repNumber": <number>,
      "timestamp": "<MM:SS>",
      "timestampSeconds": <seconds>,
      "quality": "<excellent|good|poor|invalid>",
      "notes": "<optional notes>"
    }
  ],
  "insights": {
    "bestRep": {
      "repNumber": <number>,
      "timestamp": "<MM:SS>",
      "timestampSeconds": <seconds>,
      "reason": "<explanation>"
    },
    "improvementAreas": ["<area1>", "<area2>"],
    "strengths": ["<strength1>", "<strength2>"]
  }
}

Focus on: rep count, form quality, timestamps, and actionable feedback. Be precise with timestamps.`,
            timestamp: Date.now(),
            isProcessing: true
          }
        };
        
        console.log('Starting Gemini video analysis for:', media.id);
      }

      // Store in IndexedDB first
      const storedData: StoredMediaData = {
        id: mediaWithProcessing.id,
        type: mediaWithProcessing.type,
        blob: mediaWithProcessing.blob,
        timestamp: mediaWithProcessing.timestamp,
        filename: mediaWithProcessing.filename,
        geminiAnalysis: mediaWithProcessing.geminiAnalysis
      };
      
      const indexedDbId = await mediaDatabase.storeMedia(storedData);
      
      // Add IndexedDB ID to media object
      const mediaWithId: CapturedMedia = {
        ...mediaWithProcessing,
        indexedDbId
      };
      
      // Update state
      setCapturedMedia(prev => [mediaWithId, ...prev]);
      console.log('Media added and persisted:', media.id);

      // Process video with Gemini in background if applicable
      if (media.type === 'video' && geminiService.isConfigured()) {
        processVideoWithGemini(mediaWithId);
      }
      
    } catch (error) {
      console.error('Failed to persist media, adding to memory only:', error);
      // Still add to memory even if persistence fails
      setCapturedMedia(prev => [media, ...prev]);
    }
  }, []);

  const removeMedia = useCallback(async (id: string) => {
    setCapturedMedia(prev => {
      const mediaToRemove = prev.find(m => m.id === id);
      if (mediaToRemove) {
        // Revoke object URL
        if (mediaToRemove.url.startsWith('blob:')) {
          URL.revokeObjectURL(mediaToRemove.url);
        }
        
        // Remove from IndexedDB if it has an indexed ID
        if (mediaToRemove.indexedDbId) {
          mediaDatabase.deleteMedia(mediaToRemove.indexedDbId).catch(error => {
            console.error('Failed to delete media from IndexedDB:', error);
          });
        }
      }
      return prev.filter(m => m.id !== id);
    });
  }, []);

  const clearAllMedia = useCallback(async () => {
    try {
      // Clear from IndexedDB
      await mediaDatabase.clearAllMedia();
      console.log('All media cleared from IndexedDB');
    } catch (error) {
      console.error('Failed to clear media from IndexedDB:', error);
    }
    
    // Revoke all object URLs and clear state
    capturedMedia.forEach(media => {
      if (media.url.startsWith('blob:')) {
        URL.revokeObjectURL(media.url);
      }
    });
    setCapturedMedia([]);
  }, [capturedMedia]);

  const downloadMedia = useCallback((media: CapturedMedia) => {
    const link = document.createElement('a');
    
    if (window.innerWidth <= 768) {
      // Mobile download handling
      try {
        link.href = media.url;
        link.download = media.filename;
        link.style.display = 'none';
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        
        document.body.appendChild(link);
        setTimeout(() => {
          link.click();
          setTimeout(() => {
            document.body.removeChild(link);
          }, 100);
        }, 10);
        
      } catch (error) {
        console.error('Mobile download failed, trying fallback:', error);
        window.open(media.url, '_blank');
      }
    } else {
      // Desktop: Use standard approach
      link.href = media.url;
      link.download = media.filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  }, []);

  const downloadMediaBlob = useCallback((media: CapturedMedia) => {
    try {
      const blob = media.blob;
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.style.display = 'none';
      
    document.body.appendChild(link);
    link.click();
      
      // Clean up
      setTimeout(() => {
        URL.revokeObjectURL(url);
      }, 100);
      
    } catch (error) {
      console.error('Blob download failed, using fallback:', error);
      downloadMedia(media);
    }
  }, []);

  const createMediaFromBlob = useCallback((blob: Blob, type: CameraMode): CapturedMedia => {
    const id = `${type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    let url: string;
    try {
      url = URL.createObjectURL(blob);
    } catch (error) {
      console.error('Error creating object URL:', error);
      url = '';
    }
    
    const timestamp = Date.now();
    const extension = type === 'photo' ? 'jpg' : 'webm';
    const filename = `${type}_${new Date(timestamp).toISOString().slice(0, 19).replace(/[:.]/g, '-')}.${extension}`;

    return {
      id,
      type,
      url,
      blob,
      timestamp,
      filename
    };
  }, []);

  return {
    capturedMedia,
    isCapturing,
    isLoading,
    setIsCapturing,
    addMedia,
    removeMedia,
    clearAllMedia,
    downloadMedia,
    downloadMediaBlob,
    createMediaFromBlob
  };
};