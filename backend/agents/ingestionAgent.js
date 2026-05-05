import { Innertube } from 'youtubei.js';

// Initialize Innertube with a consistent location to avoid 400 Precondition errors on cloud IPs
const youtube = await Innertube.create({
  location: 'US',
  lang: 'en'
});

/**
 * Extracts Video ID from various YouTube URL formats
 */
export const extractVideoId = (url) => {
  const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i;
  const match = url.match(regex);
  return match ? match[1] : null;
};

/**
 * Ingestion Agent
 * Responsibility: Extract transcript and metadata from YouTube URL using Innertube
 */
export const ingestionAgent = async (youtubeUrl) => {
  const videoId = extractVideoId(youtubeUrl);
  
  if (!videoId) {
    return { error: 'INVALID_URL' };
  }

  try {
    console.log(`Fetching metadata and transcript for ${videoId} using Innertube...`);
    
    // 1. Get info and transcript
    const info = await youtube.getInfo(videoId);
    const transcriptData = await info.getTranscript();

    if (!transcriptData || !transcriptData.sections) {
      throw new Error('NO_CAPTIONS');
    }

    // 2. Format transcript segments
    const transcriptSegments = [];
    transcriptData.sections.forEach(section => {
      section.snippets.forEach(snippet => {
        transcriptSegments.push({
          text: snippet.text,
          start: Math.floor(snippet.start_ms / 1000),
          duration: Math.floor(snippet.duration_ms / 1000)
        });
      });
    });

    // 3. Format the full transcript for the Intelligence Agent
    const fullTranscript = transcriptSegments
      .map(segment => `[${segment.start}] ${segment.text}`)
      .join(' ');

    return {
      videoId,
      title: info.basic_info.title,
      author: info.basic_info.author,
      thumbnail: info.basic_info.thumbnail?.[0]?.url,
      duration: info.basic_info.duration,
      transcriptSegments,
      fullTranscript,
      error: null
    };

  } catch (error) {
    console.error('Ingestion Agent Error (Innertube):', error);
    
    if (error.message === 'NO_CAPTIONS' || error.message.includes('Transcript not available')) {
      return { error: 'NO_CAPTIONS' };
    }
    
    return { error: 'TRANSCRIPT_ERROR', message: error.message };
  }
};
