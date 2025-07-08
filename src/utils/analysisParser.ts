import { PushupAnalysis } from '../types/media';

export const parseAnalysisResult = (result: string): PushupAnalysis | null => {
  try {
    let cleanResult = result.trim();
    
    // Remove common markdown formatting
    cleanResult = cleanResult.replace(/```json\n?|\n?```/g, '');
    cleanResult = cleanResult.replace(/^```\n?|\n?```$/g, '');
    cleanResult = cleanResult.replace(/^json\s*/, '');
    
    // Look for JSON object in the response
    const jsonMatch = cleanResult.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      cleanResult = jsonMatch[0];
    }
    
    console.log('Attempting to parse analysis JSON:', cleanResult.substring(0, 200) + '...');
    const parsedData = JSON.parse(cleanResult);
    
    // Validate structure - check if it looks like pushup analysis
    if (parsedData.summary && parsedData.timeline && parsedData.insights) {
      console.log('Successfully parsed pushup analysis:', parsedData);
      return parsedData as PushupAnalysis;
    } else {
      console.log('JSON structure does not match pushup analysis format');
      console.log('Missing fields:', {
        summary: !!parsedData.summary,
        timeline: !!parsedData.timeline,
        insights: !!parsedData.insights
      });
      return null;
    }
  } catch (error) {
    console.log('Failed to parse analysis JSON:', error);
    return null;
  }
};

// Function to re-process existing media items that might have unparsed JSON
export const reprocessAnalysis = async (
  media: any[], 
  updateCallback: (id: string, pushupData: PushupAnalysis) => void
) => {
  let reprocessedCount = 0;
  
  for (const item of media) {
    if (item.type === 'video' && 
        item.geminiAnalysis?.result && 
        !item.geminiAnalysis.pushupData &&
        !item.geminiAnalysis.isProcessing) {
      
      const pushupData = parseAnalysisResult(item.geminiAnalysis.result);
      if (pushupData) {
        updateCallback(item.id, pushupData);
        reprocessedCount++;
        console.log(`Reprocessed analysis for video ${item.id}`);
      }
    }
  }
  
  if (reprocessedCount > 0) {
    console.log(`Reprocessed ${reprocessedCount} video analysis results`);
  }
  
  return reprocessedCount;
}; 