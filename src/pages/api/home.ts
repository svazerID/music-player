import type { APIRoute } from 'astro';
import { sp, formatSpotifyTrack } from '../../lib/spotify';

export const GET: APIRoute = async () => {
  try {
    const [trendingRes, chillRes, newRes, top50Res, kpopRes, dangdutRes, popRes] = await Promise.allSettled([
      sp.search('lagu viral indonesia 2025'),
      sp.search('chill vibes'),
      sp.search('new release indonesia'),
      sp.search('Top 50 Indonesia'),
      sp.search('K-Pop'),
      sp.search('dangdut'),
      sp.search('pop indonesia'),
    ]);

    const sections = {};

    if (trendingRes.status === 'fulfilled' && trendingRes.value?.tracks?.length) {
      const tracks = trendingRes.value.tracks.map(formatSpotifyTrack);
      sections.spotlight = tracks.slice(0, 6);
      sections.quickPicks = tracks.slice(6, 10);
      sections.trending = tracks;
    }

    if (chillRes.status === 'fulfilled' && chillRes.value?.tracks?.length) {
      sections.chill = chillRes.value.tracks.slice(0, 6).map(formatSpotifyTrack);
    }

    if (newRes.status === 'fulfilled' && newRes.value?.tracks?.length) {
      sections.newReleases = newRes.value.tracks.slice(0, 6).map(formatSpotifyTrack);
    }

    if (top50Res.status === 'fulfilled' && top50Res.value?.tracks?.length) {
      sections.top50 = top50Res.value.tracks.slice(0, 12).map(formatSpotifyTrack);
    }

    if (kpopRes.status === 'fulfilled' && kpopRes.value?.tracks?.length) {
      sections.kpop = kpopRes.value.tracks.slice(0, 12).map(formatSpotifyTrack);
    }

    if (dangdutRes.status === 'fulfilled' && dangdutRes.value?.tracks?.length) {
      sections.dangdut = dangdutRes.value.tracks.slice(0, 12).map(formatSpotifyTrack);
    }

    if (popRes.status === 'fulfilled' && popRes.value?.tracks?.length) {
      sections.popIndo = popRes.value.tracks.slice(0, 12).map(formatSpotifyTrack);
    }

    if (trendingRes.status === 'fulfilled' && trendingRes.value?.artists?.length) {
      sections.featuredArtists = trendingRes.value.artists.slice(0, 6).map((a) => ({
        id: a.id || '',
        name: a.name || '',
        image: a.images?.[0]?.url || '',
      }));
    }

    if (trendingRes.status === 'fulfilled' && trendingRes.value?.albums?.length) {
      sections.featuredAlbums = trendingRes.value.albums.slice(0, 6).map((a) => ({
        id: a.id || '',
        name: a.name || '',
        artist: a.artists?.[0]?.name || '',
        image: a.images?.[0]?.url || '',
        year: a.release_year || '',
      }));
    }

    if (chillRes.status === 'fulfilled' && chillRes.value?.playlists?.length) {
      sections.communityPlaylists = chillRes.value.playlists.slice(0, 4).map((p) => ({
        id: p.id || '',
        name: p.name || '',
        description: p.description || '',
        image: p.images?.[0]?.url || '',
        owner: p.owner?.display_name || '',
      }));
    }

    return new Response(JSON.stringify({ status: true, data: sections }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
    });
  } catch (err) {
    console.error(`[Home Error] ${(err as any)?.message}`);
    return new Response(JSON.stringify({ status: false, message: (err as any)?.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
