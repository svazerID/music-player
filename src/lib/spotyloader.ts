import axios from 'axios';

const FORMATS = ['mp3', 'flac', 'm4a'];
const UA = 'Neo/1.0';
const BASE = 'https://spotyloader.com';

// Download a single Spotify track. Returns { status, downloadLink, ... }.
// PRIMARY source in /api/download (spotify-clients is the fallback).
export default async function spotyloaderTrack(url: string, format = 'mp3') {
  if (!url) throw new Error('Invalid url.');
  const audioFormat = FORMATS.includes(String(format).toLowerCase()) ? format.toLowerCase() : 'mp3';

  const { headers } = await axios.get(BASE, { headers: { 'user-agent': UA } });
  const cookie = headers['set-cookie']
    ? headers['set-cookie'].map((c: string) => c.split(';')[0]).join('; ')
    : 'NEXT_LOCALE=en';

  const reqHeaders = {
    origin: BASE,
    referer: `${BASE}/track`,
    cookie,
    'user-agent': UA,
    accept: 'application/json, text/plain, */*',
  };

  const { data: job } = await axios.post(
    `${BASE}/api/spotify/track`,
    { url, format: audioFormat },
    { headers: { ...reqHeaders, 'content-type': 'application/json' } }
  );

  if (!job?.jobId) throw new Error((job as any)?.message || 'Failed to create job.');

  for (let i = 0; i < 80; i++) {
    if (i > 0) await new Promise((r) => setTimeout(r, 2500));
    const { data: status } = await axios.get(`${BASE}/api/spotify/track/status/${job.jobId}`, { headers: reqHeaders });
    if (status?.status === 'ready' && status?.downloadLink) return status;
    if (status?.status === 'error') throw new Error('Download failed.');
  }
  throw new Error('Timeout waiting for download.');
}
