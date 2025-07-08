import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, TrendingUp, Clock, Target, Star } from 'lucide-react';
import { PushupAnalysis } from '../types/media';

interface PushupAnalysisOverlayProps {
  analysis: PushupAnalysis;
  videoRef: React.RefObject<HTMLVideoElement>;
  isVisible: boolean;
  onToggle: () => void;
}

export const PushupAnalysisOverlay: React.FC<PushupAnalysisOverlayProps> = ({
  analysis,
  videoRef,
  isVisible,
  onToggle
}) => {
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeRep, setActiveRep] = useState<number | null>(null);

  // Track video time
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime);
      
      // Find active rep based on current time
      const currentRep = analysis.timeline.find(rep => {
        const repTime = rep.timestampSeconds;
        const nextRep = analysis.timeline.find(r => r.repNumber === rep.repNumber + 1);
        const nextTime = nextRep ? nextRep.timestampSeconds : video.duration;
        return currentTime >= repTime && currentTime < nextTime;
      });
      
      setActiveRep(currentRep ? currentRep.repNumber : null);
    };

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);

    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
    };
  }, [analysis.timeline, currentTime, videoRef]);

  const jumpToTimestamp = (seconds: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = seconds;
    }
  };

  const getQualityColor = (quality: string) => {
    switch (quality) {
      case 'excellent': return 'bg-green-500';
      case 'good': return 'bg-blue-500';
      case 'poor': return 'bg-yellow-500';
      case 'invalid': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getQualityIcon = (quality: string) => {
    switch (quality) {
      case 'excellent': return '🔥';
      case 'good': return '💪';
      case 'poor': return '⚠️';
      case 'invalid': return '❌';
      default: return '⚫';
    }
  };

  if (!isVisible) {
    return (
      <button
        onClick={onToggle}
        className="absolute top-4 right-4 bg-blue-600/80 backdrop-blur-sm text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-blue-700/80 transition-all duration-200 border border-blue-400/30"
      >
        📊 Analysis
      </button>
    );
  }

  return (
    <div className="absolute inset-0 pointer-events-none">
      {/* Toggle Button */}
      <button
        onClick={onToggle}
        className="absolute top-4 right-4 bg-gray-800/80 backdrop-blur-sm text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-gray-700/80 transition-all duration-200 border border-gray-600/30 pointer-events-auto"
      >
        ✕ Close
      </button>

      {/* Summary Cards */}
      <div className="absolute top-4 left-4 flex space-x-2 pointer-events-auto">
        <div className="bg-black/70 backdrop-blur-sm rounded-lg px-3 py-2 text-white border border-gray-600/30">
          <div className="flex items-center space-x-2">
            <Target className="h-4 w-4 text-blue-400" />
            <div>
              <div className="text-xs text-gray-300">Total</div>
              <div className="text-lg font-bold">{analysis.summary.totalCount}</div>
            </div>
          </div>
        </div>
        
        <div className="bg-black/70 backdrop-blur-sm rounded-lg px-3 py-2 text-white border border-gray-600/30">
          <div className="flex items-center space-x-2">
            <Star className="h-4 w-4 text-yellow-400" />
            <div>
              <div className="text-xs text-gray-300">Score</div>
              <div className="text-lg font-bold">{analysis.quality.overallScore}/10</div>
            </div>
          </div>
        </div>

        <div className="bg-black/70 backdrop-blur-sm rounded-lg px-3 py-2 text-white border border-gray-600/30">
          <div className="flex items-center space-x-2">
            <TrendingUp className="h-4 w-4 text-green-400" />
            <div>
              <div className="text-xs text-gray-300">Rate</div>
              <div className="text-lg font-bold">{analysis.summary.averageRepsPerMinute}/min</div>
            </div>
          </div>
        </div>
      </div>

      {/* Timeline */}
      <div className="absolute bottom-16 left-4 right-4 pointer-events-auto">
        <div className="bg-black/80 backdrop-blur-sm rounded-lg p-4 border border-gray-600/30">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-white font-medium text-sm">Pushup Timeline</h3>
            <div className="text-xs text-gray-300">
              Rep {activeRep || '—'} • {Math.floor(currentTime / 60)}:{(Math.floor(currentTime) % 60).toString().padStart(2, '0')}
            </div>
          </div>
          
          {/* Timeline Points */}
          <div className="flex space-x-1 overflow-x-auto pb-2">
            {analysis.timeline.map((rep, index) => (
              <button
                key={rep.repNumber}
                onClick={() => jumpToTimestamp(rep.timestampSeconds)}
                className={`flex-shrink-0 w-8 h-8 rounded-full border-2 flex items-center justify-center text-xs font-medium transition-all duration-200 hover:scale-110 ${
                  activeRep === rep.repNumber 
                    ? `${getQualityColor(rep.quality)} border-white shadow-lg scale-110` 
                    : `${getQualityColor(rep.quality)} border-gray-400 hover:border-white`
                }`}
                title={`Rep ${rep.repNumber} at ${rep.timestamp} - ${rep.quality}${rep.notes ? ` (${rep.notes})` : ''}`}
              >
                <span className="text-white text-xs">
                  {getQualityIcon(rep.quality)}
                </span>
              </button>
            ))}
          </div>
          
          {/* Legend */}
          <div className="flex items-center justify-center space-x-4 mt-3 text-xs text-gray-300">
            <div className="flex items-center space-x-1">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span>Excellent</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
              <span>Good</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
              <span>Poor</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-3 h-3 bg-red-500 rounded-full"></div>
              <span>Invalid</span>
            </div>
          </div>
        </div>
      </div>

      {/* Current Rep Info */}
      {activeRep && (
        <div className="absolute bottom-40 left-4 pointer-events-auto">
          {(() => {
            const currentRepData = analysis.timeline.find(r => r.repNumber === activeRep);
            if (!currentRepData) return null;
            
            return (
              <div className="bg-black/80 backdrop-blur-sm rounded-lg p-3 text-white border border-gray-600/30 max-w-xs">
                <div className="flex items-center space-x-2 mb-2">
                  <span className="text-lg">{getQualityIcon(currentRepData.quality)}</span>
                  <div>
                    <div className="font-medium">Rep {currentRepData.repNumber}</div>
                    <div className="text-xs text-gray-300 capitalize">{currentRepData.quality}</div>
                  </div>
                </div>
                {currentRepData.notes && (
                  <div className="text-sm text-gray-200">{currentRepData.notes}</div>
                )}
              </div>
            );
          })()}
        </div>
      )}

      {/* Best Rep Indicator */}
      {analysis.insights.bestRep && currentTime >= analysis.insights.bestRep.timestampSeconds - 2 && 
       currentTime <= analysis.insights.bestRep.timestampSeconds + 2 && (
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 pointer-events-auto">
          <div className="bg-yellow-500/90 backdrop-blur-sm rounded-lg px-4 py-2 text-black font-medium text-center border border-yellow-300">
            <div className="flex items-center space-x-2">
              <Star className="h-5 w-5" />
              <span>Best Rep!</span>
            </div>
            <div className="text-xs mt-1">{analysis.insights.bestRep.reason}</div>
          </div>
        </div>
      )}
    </div>
  );
}; 