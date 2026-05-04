import { YoutubeTranscript } from 'youtube-transcript';

/**
 * Extracts Video ID from various YouTube URL formats
 * @param {string} url 
 * @returns {string|null}
 */
export const extractVideoId = (url) => {
  const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i;
  const match = url.match(regex);
  return match ? match[1] : null;
};

/**
 * Fetches video metadata using YouTube oEmbed (no API key required)
 * @param {string} url 
 * @returns {Promise<Object>}
 */
export const fetchMetadata = async (url) => {
  try {
    const response = await fetch(`https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`);
    if (!response.ok) throw new Error('METADATA_FETCH_FAILED');
    const data = await response.json();
    return {
      title: data.title,
      author: data.author_name,
      thumbnail: data.thumbnail_url
    };
  } catch (error) {
    console.error('Metadata fetch error:', error);
    return { title: 'Unknown Lecture', author: 'Unknown', thumbnail: null };
  }
};

/**
 * Ingestion Agent
 * Responsibility: Extract transcript and metadata from YouTube URL
 */
export const ingestionAgent = async (youtubeUrl) => {
  const videoId = extractVideoId(youtubeUrl);
  
  if (!videoId) {
    return { error: 'INVALID_URL' };
  }

  try {
    // 1. Fetch metadata and transcript in parallel
    const [metadata, transcriptSegments] = await Promise.all([
      fetchMetadata(youtubeUrl),
      YoutubeTranscript.fetchTranscript(videoId)
    ]);

    // 2. Format the full transcript for the Intelligence Agent
    const fullTranscript = transcriptSegments
      .map(segment => `[${Math.floor(segment.offset / 1000)}] ${segment.text}`)
      .join(' ');

    // 3. Calculate total duration (approximate from last segment)
    const lastSegment = transcriptSegments[transcriptSegments.length - 1];
    const duration = lastSegment ? Math.floor((lastSegment.offset + lastSegment.duration) / 1000) : 0;

    return {
      videoId,
      title: metadata.title,
      author: metadata.author,
      thumbnail: metadata.thumbnail,
      duration,
      transcriptSegments: transcriptSegments.map(s => ({
        text: s.text,
        start: Math.floor(s.offset / 1000),
        duration: Math.floor(s.duration / 1000)
      })),
      fullTranscript,
      error: null
    };

  } catch (error) {
    console.error('Ingestion Agent Error:', error);
    
    // Categorize common errors
    if (error.message.includes('Could not find transcript')) {
      return { error: 'NO_CAPTIONS' };
    }
    if (error.message.includes('private')) {
      return { error: 'PRIVATE_VIDEO' };
    }
    
    return { error: 'TRANSCRIPT_ERROR', message: error.message };
  }
};
