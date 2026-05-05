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
        textLines.push(lines[j].replace(/<[^>]+>/g, '').trim()); // Strip HTML/formatting tags
        j++;
      }
      
      if (textLines.length > 0) {
        segments.push({
          start: Math.floor(start),
          duration: Math.floor(end - start),
          text: textLines.join(' ')
        });
      }
      i = j - 1; // Skip the text lines we just processed
    }
  }
  return segments;
};

/**
 * Fetches transcript from RapidAPI
 */
const fetchTranscriptRapidAPI = async (videoId) => {
  if (!process.env.X_RAPIDAPI_KEY) {
    throw new Error('Missing X_RAPIDAPI_KEY in environment variables');
  }

  const response = await fetch(`https://youtube-captions-transcript-subtitles-video-combiner.p.rapidapi.com/download-webvtt/${videoId}?language=en&response_mode=default`, {
    headers: {
      'x-rapidapi-key': process.env.X_RAPIDAPI_KEY,
      'x-rapidapi-host': 'youtube-captions-transcript-subtitles-video-combiner.p.rapidapi.com'
    }
  });

  if (!response.ok) {
    const text = await response.text();
    console.error('RapidAPI Error:', text);
    throw new Error('RAPIDAPI_FETCH_FAILED');
  }

  const vttText = await response.text();
  return parseVTT(vttText);
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
      fetchTranscriptRapidAPI(videoId)
    ]);

    if (!transcriptSegments || transcriptSegments.length === 0) {
      throw new Error('NO_CAPTIONS');
    }

    // 2. Format the full transcript for the Intelligence Agent
    const fullTranscript = transcriptSegments
      .map(segment => `[${segment.start}] ${segment.text}`)
      .join(' ');

    // 3. Calculate total duration (approximate from last segment)
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
    
    // Categorize common errors
    if (error.message === 'NO_CAPTIONS' || error.message.includes('Could not find transcript')) {
      return { error: 'NO_CAPTIONS' };
    }
    
    return { error: 'TRANSCRIPT_ERROR', message: error.message };
  }
};
