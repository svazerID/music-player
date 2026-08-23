import type { APIRoute } from 'astro';
import { sp, axios, spotyloader } from '../../lib/spotify';

export const GET: APIRoute = async ({ url }) => {
  const qUrl = url.searchParams.get('url');
  const id = url.searchParams.get('id');
  const format = url.searchParams.get('format') || 'mp3';

  const json = (body: any, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
    });

  try {
    if (id) {
      console.log(`[Download] Polling ID: ${id}`);
      const ytRes = await axios.get(`https://youtubedl.siputzx.my.id/download?id=${id}&apikey=nbteam`);
      return json(ytRes.data);
    }

    if (!qUrl) return json({ status: false, message: 'URL required' }, 400);

    if (qUrl.includes('spotify.com')) {
      try {
        console.log(`[Download] spotyloader (primary): ${qUrl}`);
        const result = await spotyloader(qUrl, format);
        if (result?.downloadLink) {
          return json({ status: true, fileUrl: result.downloadLink, source: 'spotyloader' });
        }
        throw new Error('spotyloader returned no downloadLink');
      } catch (slErr) {
        console.warn(`[Download] spotyloader failed, fallback spotify-clients: ${(slErr as any).message}`);

        try {
          const data = await sp.download(qUrl);
          if (data && data.dl) {
            return json({ status: true, fileUrl: data.dl, source: 'spotify-clients' });
          }
          throw new Error('Gagal mengekstrak link unduhan Spotify.');
        } catch (spErr) {
          console.warn(`[Download] spotify-clients failed, fallback YouTube: ${(spErr as any).message}`);

          const trackId = qUrl.split('track/')[1]?.split('?')[0];
          if (trackId) {
            const track = await sp.track(trackId);
            const queryStr = `${track.name} ${track.artists[0]?.name}`;
            const ytRes = await axios.get(
              `https://youtubedl.siputzx.my.id/download?url=${encodeURIComponent(queryStr)}&type=audio&apikey=nbteam`
            );
            return json(ytRes.data);
          }
          throw spErr;
        }
      }
    } else {
      console.log(`[Download] YouTube/Other: ${qUrl}`);
      const ytRes = await axios.get(
        `https://youtubedl.siputzx.my.id/download?url=${encodeURIComponent(qUrl)}&type=audio&apikey=nbteam`
      );
      return json(ytRes.data);
    }
  } catch (err) {
    const errorMsg =
      (err as any)?.response?.data?.message ||
      (err as any)?.response?.data?.error ||
      (err as any)?.message;
    console.error(`[Download Error] ${errorMsg}`);
    return json({ status: false, message: errorMsg }, (err as any)?.response?.status || 500);
  }
};
