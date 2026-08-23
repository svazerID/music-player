import type { APIRoute } from 'astro';
import { sp, formatPlaylist } from '../../lib/spotify';

export const GET: APIRoute = async ({ params }) => {
  try {
    const playlistData = await sp.playlist(params.id);
    if (!playlistData) {
      return new Response(JSON.stringify({ status: false, message: 'Playlist not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    return new Response(JSON.stringify({ status: true, data: formatPlaylist(playlistData) }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
    });
  } catch (err) {
    console.error(`[Playlist Error] ${(err as any)?.message}`);
    return new Response(JSON.stringify({ status: false, message: (err as any)?.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
