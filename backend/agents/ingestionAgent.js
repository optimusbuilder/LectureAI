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
 * Parses WebVTT format into JSON segments
 */
const parseVTT = (vttText) => {
  const segments = [];
  const lines = vttText.split('\n');
  
  const parseTime = (timeStr) => {
    const parts = timeStr.trim().split(':');
    const secsAndMs = parts.pop().split('.');
    let total = parseInt(secsAndMs[0], 10) + (parseInt(secsAndMs[1] || '0', 10) / 1000);
    if (parts.length > 0) total += parseInt(parts.pop(), 10) * 60; // minutes
    if (parts.length > 0) total += parseInt(parts.pop(), 10) * 3600; // hours
    return total;
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line || line === 'WEBVTT') continue;
    
    if (line.includes('-->')) {
      const [startStr, endStr] = line.split('-->');
      const start = parseTime(startStr);
      const end = parseTime(endStr);
      
      let textLines = [];
      let j = i + 1;
      while (j < lines.length && lines[j].trim() !== '' && !lines[j].includes('-->')) {
        textLines.push(lines[j].replace(/<[^>]+>/g, '').trim());
        j++;
      }
      
      if (textLines.length > 0) {
        segments.push({
          start: Math.floor(start),
          duration: Math.floor(end - start),
          text: textLines.join(' ')
        });
      }
      i = j - 1;
    }
  }
  return segments;
};

/**
 * Fetches transcript from RapidAPI (primary source)
 */
const fetchTranscriptRapidAPI = async (videoId) => {
  if (!process.env.X_RAPIDAPI_KEY) {
    throw new Error('NO_RAPIDAPI_KEY');
  }

  const response = await fetch(`https://youtube-captions-transcript-subtitles-video-combiner.p.rapidapi.com/download-webvtt/${videoId}?language=en&response_mode=default`, {
    headers: {
      'x-rapidapi-key': process.env.X_RAPIDAPI_KEY,
      'x-rapidapi-host': 'youtube-captions-transcript-subtitles-video-combiner.p.rapidapi.com'
    }
  });

  if (!response.ok) {
    const text = await response.text();
    console.error('RapidAPI Error:', response.status, text);
    throw new Error('RAPIDAPI_FETCH_FAILED');
  }

  const vttText = await response.text();
  return parseVTT(vttText);
};

/**
 * Fetches transcript using youtube-transcript package (fallback)
 */
const fetchTranscriptFallback = async (videoId) => {
  const transcript = await YoutubeTranscript.fetchTranscript(videoId);

  if (!transcript || transcript.length === 0) {
    throw new Error('NO_CAPTIONS');
  }

  return transcript.map(item => ({
    start: Math.floor(item.offset / 1000),
    duration: Math.floor(item.duration / 1000),
    text: item.text.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&#39;/g, "'").trim()
  }));
};

/**
 * Tries RapidAPI first, falls back to youtube-transcript package
 */
const fetchTranscriptWithFallback = async (videoId) => {
  try {
    const segments = await fetchTranscriptRapidAPI(videoId);
    if (segments && segments.length > 0) return segments;
    throw new Error('EMPTY_RAPIDAPI_RESULT');
  } catch (primaryError) {
    console.warn(`RapidAPI transcript failed (${primaryError.message}), trying fallback...`);
    try {
      return await fetchTranscriptFallback(videoId);
    } catch (fallbackError) {
      console.error('Fallback transcript also failed:', fallbackError.message);
      if (fallbackError.message?.includes('disabled') || fallbackError.message?.includes('Transcript is disabled')) {
        throw new Error('NO_CAPTIONS');
      }
      throw primaryError;
    }
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
    const [metadata, transcriptSegments] = await Promise.all([
      fetchMetadata(youtubeUrl),
      fetchTranscriptWithFallback(videoId)
    ]);

    if (!transcriptSegments || transcriptSegments.length === 0) {
      throw new Error('NO_CAPTIONS');
    }

    const fullTranscript = transcriptSegments
      .map(segment => `[${segment.start}] ${segment.text}`)
      .join(' ');

    const lastSegment = transcriptSegments[transcriptSegments.length - 1];
    const duration = lastSegment ? Math.floor(lastSegment.start + lastSegment.duration) : 0;

    return {
      videoId,
      title: metadata.title,
      author: metadata.author,
      thumbnail: metadata.thumbnail,
      duration,
      transcriptSegments,
      fullTranscript,
      error: null
    };

  } catch (error) {
    console.error('Ingestion Agent Error:', error);
    
    if (error.message === 'NO_CAPTIONS' || error.message.includes('Could not find transcript')) {
      return { error: 'NO_CAPTIONS' };
    }
    
    return { error: 'TRANSCRIPT_ERROR', message: error.message };
  }
};
