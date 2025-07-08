import { geminiService } from './geminiService';

/**
 * Test function to verify Gemini integration
 * This can be called from the browser console for testing
 */
export const testGeminiIntegration = async () => {
  console.log('Testing Gemini integration...');
  
  // Check if Gemini is configured
  if (!geminiService.isConfigured()) {
    console.error('❌ Gemini API is not configured. Please set VITE_GEMINI_API_KEY in your .env file.');
    return false;
  }
  
  console.log('✅ Gemini API is configured');
  
  // Create a test video blob (1x1 pixel WebM)
  const testVideoBlob = new Blob([
    new Uint8Array([
      0x1a, 0x45, 0xdf, 0xa3, 0x9f, 0x42, 0x86, 0x81, 0x01, 0x42, 0xf7, 0x81, 0x01, 0x42, 0xf2, 0x81,
      0x04, 0x42, 0xf3, 0x81, 0x08, 0x42, 0x82, 0x84, 0x77, 0x65, 0x62, 0x6d, 0x42, 0x87, 0x81, 0x02,
      0x42, 0x85, 0x81, 0x02, 0x18, 0x53, 0x80, 0x67, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00
    ])
  ], { type: 'video/webm' });
  
  try {
    console.log('🔄 Testing video processing...');
    const result = await geminiService.processVideo(testVideoBlob, {
      prompt: `Analyze this pushup video and provide detailed structured information. Return ONLY a valid JSON object with this exact structure:

{
  "summary": {
    "totalCount": 5,
    "validPushups": 4,
    "invalidPushups": 1,
    "duration": "1:30",
    "averageRepsPerMinute": 20
  },
  "quality": {
    "overallScore": 7,
    "formNotes": ["Good form overall", "Maintain straight back"],
    "commonIssues": ["Partial range of motion on rep 3"]
  },
  "timeline": [
    {
      "repNumber": 1,
      "timestamp": "0:05",
      "timestampSeconds": 5,
      "quality": "excellent",
      "notes": "Perfect form"
    }
  ],
  "insights": {
    "bestRep": {
      "repNumber": 1,
      "timestamp": "0:05",
      "timestampSeconds": 5,
      "reason": "Perfect form and full range of motion"
    },
    "improvementAreas": ["Consistency in range of motion"],
    "strengths": ["Good pace", "Straight back"]
  }
}

This is a test - please return a sample JSON structure like above for testing.`
    });
    
    if (result.success) {
      console.log('✅ Gemini video processing test successful!');
      console.log('Response:', result.result);
      return true;
    } else {
      console.error('❌ Gemini video processing test failed:', result.error);
      return false;
    }
  } catch (error) {
    console.error('❌ Gemini test error:', error);
    return false;
  }
};

// Make it available globally for console testing
if (typeof window !== 'undefined') {
  (window as any).testGemini = testGeminiIntegration;
  console.log('💡 Gemini test function available as window.testGemini()');
} 