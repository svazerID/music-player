import type { APIRoute } from 'astro';
import { sp, formatSpotifyTrack } from '../../lib/spotify';

export const GET: APIRoute = async ({ params }) => {
  try {
    const trackData = await sp.track(params.id);
    if (!trackData) {
      return new Response(JSON.stringify({ status: false, message: 'Track not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    return new Response(JSON.stringify({ status: true, data: formatSpotifyTrack(trackData) }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
    });
  } catch (err) {
    console.error(`[Track Error] ${(err as any)?.message}`);
    return new Response(JSON.stringify({ status: false, message: (err as any)?.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
