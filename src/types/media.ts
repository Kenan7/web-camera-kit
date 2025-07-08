export interface CapturedMedia {
  id: string;
  type: 'photo' | 'video';
  url: string;
  blob: Blob;
  timestamp: number;
  filename: string;
  indexedDbId?: string; // ID used for IndexedDB storage
  geminiAnalysis?: {
    result: string;
    prompt: string;
    timestamp: number;
    isProcessing?: boolean;
    error?: string;
    pushupData?: PushupAnalysis; // Structured pushup analysis
  };
}

export interface PushupAnalysis {
  summary: {
    totalCount: number;
    validPushups: number;
    invalidPushups: number;
    duration: string; // "2:34"
    averageRepsPerMinute: number;
  };
  quality: {
    overallScore: number; // 1-10
    formNotes: string[];
    commonIssues: string[];
  };
  timeline: Array<{
    repNumber: number;
    timestamp: string; // "0:15"
    timestampSeconds: number; // 15
    quality: "excellent" | "good" | "poor" | "invalid";
    notes?: string;
  }>;
  insights: {
    bestRep: {
      repNumber: number;
      timestamp: string;
      timestampSeconds: number;
      reason: string;
    };
    improvementAreas: string[];
    strengths: string[];
  };
}

export type CameraMode = 'photo' | 'video';
export type CameraFacing = 'user' | 'environment';