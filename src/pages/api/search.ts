import type { APIRoute } from 'astro';
import { sp, formatSpotifyTrack } from '../../lib/spotify';
import axios from 'axios';

export const GET: APIRoute = async ({ url }) => {
  const query = url.searchParams.get('q');
  if (!query) {
    return new Response(JSON.stringify({ status: false, message: 'Query required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    if (query.includes('open.spotify.com/track/')) {
      console.log(`[Spotify] Fetching direct track: ${query}`);
      const trackData = await sp.track(query.split('track/')[1].split('?')[0]);
      return new Response(JSON.stringify({ status: true, data: [formatSpotifyTrack(trackData)] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
      });
    }

    if (query.includes('open.spotify.com/playlist/')) {
      console.log(`[Spotify] Fetching playlist: ${query}`);
      const id = query.split('playlist/')[1].split('?')[0];
      const playlistData = await sp.playlist(id);
      const tracks = playlistData.tracks.map((t) => {
        const formatted = formatSpotifyTrack(t);
        if (!formatted.thumbnail && t.album?.images?.[0]?.url) formatted.thumbnail = t.album.images[0].url;
        return formatted;
      });
      return new Response(JSON.stringify({ status: true, data: tracks, meta: { type: 'playlist', name: playlistData.name } }), {
        status: 200,
        headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
      });
    }

    if (query.includes('open.spotify.com/album/')) {
      console.log(`[Spotify] Fetching album: ${query}`);
      const id = query.split('album/')[1].split('?')[0];
      const albumData = await sp.album(id);
      const albumThumb = albumData.images?.[0]?.url || '';
      const tracks = albumData.tracks.map((t) => {
        const formatted = formatSpotifyTrack(t);
        if (!formatted.thumbnail) formatted.thumbnail = albumThumb;
        return formatted;
      });
      return new Response(JSON.stringify({ status: true, data: tracks, meta: { type: 'album', name: albumData.name, artist: albumData.artists?.[0]?.name } }), {
        status: 200,
        headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
      });
    }

    if (query.includes('open.spotify.com/artist/')) {
      console.log(`[Spotify] Fetching artist: ${query}`);
      const id = query.split('artist/')[1].split('?')[0];
      const artistData = await sp.artist(id);
      const artistName = artistData.name || 'Unknown Artist';
      const artistImage = artistData.images?.[0]?.url || '';
      const artistId = artistData.id || id;
      const tracks = (artistData.top_tracks || []).map((t) => {
        t.artists = artistName;
        t.artistId = artistId;
        return formatSpotifyTrack(t);
      });
      return new Response(JSON.stringify({ status: true, data: tracks, meta: { type: 'artist', name: artistName, image: artistImage, followers: artistData.statistics?.followers } }), {
        status: 200,
        headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
      });
    }

    console.log(`[Search] Trying Spotify: ${query}`);
    const resV2 = await sp.query('search', {
      searchTerm: query,
      offset: 0,
      limit: 30,
      numberOfTopResults: 5,
      includeAudiobooks: true,
      includeArtistHasConcertsField: false,
      includePreReleases: true,
      includeAuthors: false,
      includeEpisodeContentRatingsV2: false,
    });
    const spotifyRes = sp.parser.parseSearch(resV2.data.searchV2);
    const tracks = spotifyRes.tracks || [];

    if (tracks.length > 0) {
      const formatted = tracks.map(formatSpotifyTrack);

      const extra = {};
      if (spotifyRes.artists?.length) {
        extra.artists = spotifyRes.artists.slice(0, 4).map((a) => ({
          id: a.id || '',
          name: a.name || '',
          image: a.images?.[0]?.url || '',
        }));
      }
      if (spotifyRes.albums?.length) {
        extra.albums = spotifyRes.albums.slice(0, 4).map((a) => ({
          id: a.id || '',
          name: a.name || '',
          artist: a.artists?.[0]?.name || '',
          image: a.images?.[0]?.url || '',
          year: a.release_year || '',
        }));
      }
      if (spotifyRes.playlists?.length) {
        extra.playlists = spotifyRes.playlists.slice(0, 4).map((p) => ({
          id: p.id || '',
          name: p.name || '',
          image: p.images?.[0]?.url || '',
          owner: p.owner?.display_name || '',
        }));
      }

      return new Response(JSON.stringify({ status: true, data: formatted, extra }), {
        status: 200,
        headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
      });
    }
    throw new Error('Spotify tidak menemukan hasil.');
  } catch (err) {
    const errorMsg = (err as any)?.message || 'Error';
    console.error(`[Search Error] ${errorMsg}`);
    return new Response(JSON.stringify({ status: false, message: errorMsg }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
