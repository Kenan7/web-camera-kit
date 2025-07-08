import React, { useState, useEffect } from 'react';
import { useRef } from 'react';
import { Camera, Image, Settings, Info, ArrowLeft } from 'lucide-react';
import { gsap } from 'gsap';
import { LoadingScreen } from './components/LoadingScreen';
import { CameraPreview } from './components/CameraPreview';
import { MediaGallery } from './components/MediaGallery';
import { MediaPreviewModal } from './components/MediaPreviewModal';
import { InstallPrompt } from './components/InstallPrompt';
import { useMediaCapture } from './hooks/useMediaCapture';
import { useMobileDetection } from './hooks/useMobileDetection';
import { CameraMode, CameraFacing, CapturedMedia } from './types/media';
import './utils/testGemini'; // Import test utility for console access

type View = 'camera' | 'gallery' | 'settings';

function App() {
  const { isMobile, isMobileUserAgent, isMobileScreen, viewportHeight, isPWA } = useMobileDetection();
  
  // Detect if running in an iframe
  const [isInIframe, setIsInIframe] = useState(false);
  
  useEffect(() => {
    // Check if the app is running inside an iframe
    const inIframe = window.self !== window.top;
    setIsInIframe(inIframe);
    console.log('App running in iframe:', inIframe);
  }, []);
  
  // Helper function to determine if front camera should be used
  const shouldUseFrontCamera = (isMobileUserAgent: boolean, isMobileScreen: boolean): boolean => {
    return !isMobileUserAgent && isMobileScreen;
  };
  
  // Set initial camera facing based on device type and screen size
  const initialCameraFacing = (isInIframe && shouldUseFrontCamera(isMobileUserAgent, isMobileScreen))
    ? 'user' 
    : 'environment';

  const [currentView, setCurrentView] = useState<View>('camera');
  const [cameraMode, setCameraMode] = useState<CameraMode>('photo');
  const [cameraFacing, setCameraFacing] = useState<CameraFacing>(initialCameraFacing);
  const [permissionState, setPermissionState] = useState<'loading' | 'granted' | 'denied'>('loading');
  const [initialPermissionChecked, setInitialPermissionChecked] = useState(false);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
  const [selectedMediaForPreview, setSelectedMediaForPreview] = useState<CapturedMedia | null>(null);
  const mainContentRef = useRef<HTMLDivElement>(null);
  const [shouldShowCameraOverlay, setShouldShowCameraOverlay] = useState(false);
  
  // Check if loading screen is disabled via environment variable
  const isLoadingScreenDisabled = import.meta.env.VITE_APP_DISABLE_LOADING_SCREEN === 'true';
  
  // Dynamic camera facing: update when device type or screen size changes
  useEffect(() => {
    // Only apply special camera facing logic when running in an iframe
    if (!isInIframe) return;
    
    const newCameraFacing = shouldUseFrontCamera(isMobileUserAgent, isMobileScreen) 
      ? 'user' 
      : 'environment';
    
    // Only update if the camera facing should actually change
    if (newCameraFacing !== cameraFacing) {
      setCameraFacing(newCameraFacing);
    }
  }, [isInIframe, isMobileUserAgent, isMobileScreen, cameraFacing]);
  
  const {
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
  } = useMediaCapture();

  // Initial permission check - runs once when app mounts
  useEffect(() => {
    const checkInitialPermissions = async () => {
      try {
        // Check if the Permissions API is available
        if ('permissions' in navigator) {
          console.log('PWA: Checking initial camera permissions...');
          
          const permission = await navigator.permissions.query({ name: 'camera' as PermissionName });
          
          console.log('PWA: Initial camera permission state:', permission.state);
          
          switch (permission.state) {
            case 'granted':
              // Permission already granted, bypass loading screen
              setPermissionState('granted');
              break;
            case 'denied':
              // Permission denied, show denial screen
              setPermissionState('denied');
              break;
            case 'prompt':
            default:
              // Permission needs to be requested, keep loading state
              setPermissionState('loading');
              break;
          }
        } else {
          // Permissions API not available, fall back to getUserMedia test
          console.log('PWA: Permissions API not available, testing with getUserMedia...');
          
          try {
            const stream = await (navigator as any).mediaDevices.getUserMedia({ 
              video: true, 
              audio: false 
            });
            
            // If we get here, permission is granted
            stream.getTracks().forEach((track: MediaStreamTrack) => track.stop());
            setPermissionState('granted');
            
          } catch (error) {
            // Permission might be denied or need prompting
            const errorName = (error as any)?.name;
            if (errorName === 'NotAllowedError' || errorName === 'PermissionDeniedError') {
              setPermissionState('denied');
            } else {
              // Other errors (like device not found) - still need to prompt
              setPermissionState('loading');
            }
          }
        }
      } catch (error) {
        console.error('PWA: Error checking initial permissions:', error);
        // On error, default to loading state to show permission prompt
        setPermissionState('loading');
      } finally {
        setInitialPermissionChecked(true);
      }
    };

    checkInitialPermissions();
  }, []); // Run only once on mount
  // Animate view transitions
  useEffect(() => {
    if (mainContentRef.current) {
      gsap.fromTo(mainContentRef.current, 
        { 
          opacity: 0, 
          y: 20,
          scale: 0.98
        },
        { 
          opacity: 1, 
          y: 0,
          scale: 1,
          duration: 0.5, 
          ease: "power2.out" 
        }
      );
    }
  }, [currentView]);

  // If loading screen is disabled, automatically request permissions
  useEffect(() => {
    if (isLoadingScreenDisabled && permissionState === 'loading' && initialPermissionChecked) {
      const requestPermissions = async () => {
        try {
          // Add a longer delay for PWA to ensure proper initialization
          await new Promise(resolve => setTimeout(resolve, isPWA ? 500 : 100));
          
          const stream = await navigator.mediaDevices.getUserMedia({ 
            video: true, 
            audio: false 
          });
          stream.getTracks().forEach(track => track.stop());
          handlePermissionGranted();
        } catch (error) {
          console.error('Permission denied:', error);
          handlePermissionDenied();
        }
      };
      
      requestPermissions();
    }
  }, [isLoadingScreenDisabled, permissionState, isPWA, initialPermissionChecked]);

  const toggleCameraFacing = () => {
    setCameraFacing(prev => prev === 'user' ? 'environment' : 'user');
  };

  const handlePermissionGranted = () => {
    setPermissionState('granted');
  };

  const handlePermissionDenied = () => {
    setPermissionState('denied');
  };

  // Show loading screen until permission is checked and granted
  if ((!initialPermissionChecked || permissionState === 'loading') && !isLoadingScreenDisabled) {
    return (
      <LoadingScreen
        onPermissionGranted={handlePermissionGranted}
        onPermissionDenied={handlePermissionDenied}
        isPWA={isPWA}
        isInitialCheck={!initialPermissionChecked}
      />
    );
  }

  // Show permission denied state
  if (permissionState === 'denied') {
    return (
      <div className="bg-zinc-950 flex items-center justify-center p-6" style={{ height: viewportHeight }}>
        <div className="text-center text-gray-100 max-w-md">
          <Camera className="h-16 w-16 mx-auto mb-6 text-zinc-400" />
          <h1 className="text-2xl font-bold mb-4">Camera Access Required</h1>
          <p className="text-zinc-400 mb-6">
            This app needs access to your camera and microphone to capture photos and videos. 
            Please enable permissions in your browser settings and refresh the page.
          </p>
          <button
            onClick={() => setPermissionState('loading')}
            className="bg-[#FF4D00] hover:bg-[#E63E00] text-white px-6 py-3 rounded-xl transition-colors duration-200"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div 
      className={`text-gray-100 ${isMobile ? 'flex flex-col' : ''} ${currentView === 'gallery' ? 'overflow-auto' : 'overflow-hidden'}`} 
      style={{ 
        height: isMobile ? viewportHeight : 'auto', 
        minHeight: isMobile ? 'auto' : '100vh',
        background: !isMobile && (currentView === 'camera' || currentView === 'gallery')
          ? `
            radial-gradient(ellipse at 20% 80%, rgba(59, 130, 246, 0.12) 0%, transparent 50%),
            radial-gradient(ellipse at 80% 20%, rgba(139, 92, 246, 0.10) 0%, transparent 50%),
            radial-gradient(ellipse at 40% 40%, rgba(6, 182, 212, 0.06) 0%, transparent 50%),
            linear-gradient(135deg, #0a0a0a 0%, #111111 25%, #0f0f0f 50%, #0d0d0d 75%, #0a0a0a 100%)
          `
          : '#09090b' // Default zinc-950 color for mobile and other views
      }}
    >
      {/* Desktop Navigation - Fixed at top */}
      {!isMobile && (
        <div className="flex justify-center py-6 relative z-20">
            <nav className="flex space-x-2 bg-zinc-900/80 rounded-2xl p-2 backdrop-blur-xl border border-zinc-700 shadow-lg">
              <button
                onClick={() => setCurrentView('camera')}
                className={`px-6 py-3 rounded-xl transition-all duration-200 text-sm font-medium ${
                  currentView === 'camera'
                    ? 'bg-zinc-700 text-gray-100 shadow-lg'
                    : 'text-zinc-400 hover:text-gray-100 hover:bg-zinc-800'
                }`}
              >
                Camera
              </button>
              <button
                onClick={() => setCurrentView('gallery')}
                className={`px-6 py-3 rounded-xl transition-all duration-200 relative text-sm font-medium ${
                  currentView === 'gallery'
                    ? 'bg-zinc-700 text-gray-100 shadow-lg'
                    : 'text-zinc-400 hover:text-gray-100 hover:bg-zinc-800'
                }`}
              >
                Gallery
                {capturedMedia.length > 0 && (
                  <span className="absolute -top-1 -right-1 bg-[#FF4D00] text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-medium shadow-md">
                    {capturedMedia.length}
                  </span>
                )}
              </button>
            </nav>
        </div>
      )}

      {/* Main Content */}
      <main className={`${isMobile ? 'relative flex-1' : ''} ${
        !isMobile ? (
          currentView === 'camera' 
            ? 'flex items-center justify-center min-h-[calc(100vh-120px)]' 
            : 'pt-8 min-h-[calc(100vh-120px)]'
        ) : ''
      }`}>
        <div className={`${isMobile ? 'h-full flex flex-col' : 'w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'}`}>

          {currentView === 'camera' && (
            <div 
              ref={mainContentRef}
              key={currentView}
              className={isMobile ? 'h-full flex flex-col' : 'h-full flex flex-col space-y-6'}
            >
              {/* Camera Preview */}
              <div className={`${isMobile ? 'flex-1' : 'w-full'} ${
                isMobile
                  ? 'h-full' 
                  : 'flex-grow'
              }`}>
                <CameraPreview
                  mode={cameraMode}
                  facing={cameraFacing}
                  selectedDeviceId={selectedDeviceId}
                  setSelectedDeviceId={setSelectedDeviceId}
                  onCapture={addMedia}
                  onModeChange={setCameraMode}
                  onFacingChange={toggleCameraFacing}
                  isCapturing={isCapturing}
                  setIsCapturing={setIsCapturing}
                  createMediaFromBlob={createMediaFromBlob}
                  onGalleryClick={() => setCurrentView('gallery')}
                  capturedMediaCount={capturedMedia.length}
                  isPWA={isPWA}
                />
              </div>
            </div>
          )}

          {currentView === 'gallery' && (
            <div 
              ref={mainContentRef}
              key={currentView}
              className={`${isMobile ? 'flex-1 overflow-y-auto px-4 py-4' : 'max-w-6xl mx-auto w-full'}`}
            >
              <MediaGallery
                media={capturedMedia}
                onDownload={downloadMedia}
                onRemove={removeMedia}
                onClearAll={clearAllMedia}
                onMediaSelectForPreview={setSelectedMediaForPreview}
                isMobile={isMobile}
                onBackToCamera={() => {
                  setShouldShowCameraOverlay(true);
                  setCurrentView('camera');
                }}
              />
            </div>
          )}
        </div>
      </main>

      {/* Preview Modal - Rendered at App level for proper full-screen positioning */}
      {selectedMediaForPreview && (
        <MediaPreviewModal
          media={selectedMediaForPreview}
          onClose={() => setSelectedMediaForPreview(null)}
          onDownload={downloadMedia}
          onDownloadBlob={downloadMediaBlob}
          onRemove={(id) => {
            removeMedia(id);
            setSelectedMediaForPreview(null);
          }}
        />
      )}

      {/* PWA Install Prompt */}
      <InstallPrompt />
    </div>
  );
}

export default App;