import type { APIRoute } from 'astro';
import { sp, formatArtist } from '../../lib/spotify';

export const GET: APIRoute = async ({ params }) => {
  try {
    const artistData = await sp.artist(params.id);
    if (!artistData) {
      return new Response(JSON.stringify({ status: false, message: 'Artist not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    return new Response(JSON.stringify({ status: true, data: formatArtist(artistData) }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
    });
  } catch (err) {
    console.error(`[Artist Error] ${(err as any)?.message}`);
    return new Response(JSON.stringify({ status: false, message: (err as any)?.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
