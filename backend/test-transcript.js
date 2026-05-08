import { YoutubeTranscript } from 'youtube-transcript';
async function test() {
  try {
    const t = await YoutubeTranscript.fetchTranscript('yaa13eehgzo');
    console.log('Success! Got ' + t.length + ' segments');
  } catch(e) {
    console.error('Error:', e.message);
  }
}
test();
