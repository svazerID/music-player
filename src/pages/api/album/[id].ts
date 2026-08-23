import type { APIRoute } from 'astro';
import { sp, formatAlbum } from '../../lib/spotify';

export const GET: APIRoute = async ({ params }) => {
  try {
    const albumData = await sp.album(params.id);
    if (!albumData) {
      return new Response(JSON.stringify({ status: false, message: 'Album not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    return new Response(JSON.stringify({ status: true, data: formatAlbum(albumData) }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
    });
  } catch (err) {
    console.error(`[Album Error] ${(err as any)?.message}`);
    return new Response(JSON.stringify({ status: false, message: (err as any)?.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
