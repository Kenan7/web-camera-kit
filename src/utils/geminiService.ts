import { GoogleGenerativeAI } from '@google/generative-ai';

export interface GeminiVideoProcessingOptions {
  prompt?: string;
  model?: string;
}

export interface GeminiVideoProcessingResult {
  success: boolean;
  result?: string;
  error?: string;
}

class GeminiService {
  private genAI: GoogleGenerativeAI | null = null;

  constructor() {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    if (apiKey) {
      this.genAI = new GoogleGenerativeAI(apiKey);
    } else {
      console.warn('Gemini API key not found. Set VITE_GEMINI_API_KEY environment variable.');
    }
  }

  async processVideo(
    videoBlob: Blob, 
    options: GeminiVideoProcessingOptions = {}
  ): Promise<GeminiVideoProcessingResult> {
    if (!this.genAI) {
      return {
        success: false,
        error: 'Gemini API not initialized. Check your API key configuration.'
      };
    }

    try {
      const model = this.genAI.getGenerativeModel({ 
        model: options.model || 'gemini-1.5-flash' 
      });

      // Convert Blob to base64
      const base64Data = await this.blobToBase64(videoBlob);
      
      // Default prompt if none provided
      const prompt = options.prompt || 'Analyze this video and describe what you see in detail.';

      // Create the video part for Gemini
      const videoPart = {
        inlineData: {
          data: base64Data,
          mimeType: videoBlob.type || 'video/webm'
        }
      };

      console.log('Sending video to Gemini for processing...');
      
      const result = await model.generateContent([prompt, videoPart]);
      const response = result.response;
      const text = response.text();

      console.log('Gemini processing completed successfully');
      
      return {
        success: true,
        result: text
      };

    } catch (error) {
      console.error('Error processing video with Gemini:', error);
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  private async blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        // Remove the data:video/webm;base64, prefix
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  isConfigured(): boolean {
    return this.genAI !== null;
  }
}

// Export a singleton instance
export const geminiService = new GeminiService(); 