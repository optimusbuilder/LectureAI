import https from 'https';

const options = {
  method: 'GET',
  hostname: 'youtube-captions-transcript-subtitles-video-combiner.p.rapidapi.com',
  path: '/download-webvtt/yaa13eehgzo?language=en&response_mode=default',
  headers: {
    'x-rapidapi-key': process.env.X_RAPIDAPI_KEY,
    'x-rapidapi-host': 'youtube-captions-transcript-subtitles-video-combiner.p.rapidapi.com'
  }
};

const req = https.request(options, function (res) {
  const chunks = [];
  res.on('data', function (chunk) { chunks.push(chunk); });
  res.on('end', function () {
    const body = Buffer.concat(chunks).toString();
    console.log(body.substring(0, 500));
  });
});
req.end();
