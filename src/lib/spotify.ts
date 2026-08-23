// @ts-nocheck
import spotifyClients from 'spotify-clients';
import axios from 'axios';
import spotyloader from './spotyloader';

const sp = spotifyClients.default || spotifyClients;

export { sp, axios, spotyloader };

// Helper to format track
export function formatSpotifyTrack(item) {
  let artists = 'Unknown Artist';
  let artistId = '';

  if (item.artists) {
    if (Array.isArray(item.artists)) {
      artists = item.artists.map((a) => a.name).join(', ');
      artistId = (item.artists[0]?.id || item.artists[0]?.uri?.split(':')?.[2]) || '';
    } else {
      artists = item.artists;
      artistId = item.artistId || '';
    }
  }

  return {
    id: item.id,
    title: item.name || item.title || 'Unknown Title',
    artist: artists,
    artistId: String(artistId).replace('undefined', ''),
    album: item.album?.name || '',
    albumId: String(item.album?.id || '').replace('undefined', ''),
    thumbnail: item.album?.images?.[0]?.url || item.images?.[0]?.url || item.thumbnail || '',
    duration: item.duration_ms ? Math.floor(item.duration_ms / 1000) : 0,
    timestamp: item.duration_ms ? new Date(item.duration_ms).toISOString().substr(14, 5) : '0:00',
    videoUrl: item.url || (item.id ? `https://open.spotify.com/track/${item.id}` : ''),
    source: 'spotify',
  };
}

// Helper to format artist
export function formatArtist(item) {
  return {
    id: item.id || '',
    name: item.name || 'Unknown Artist',
    image: item.images?.[0]?.url || '',
    followers: item.statistics?.followers || 0,
    monthlyListeners: item.statistics?.monthly_listeners || 0,
    verified: item.verified || false,
    topTracks: (item.top_tracks || []).map((t) => {
      const formatted = formatSpotifyTrack(t);
      if (!formatted.artist || formatted.artist === 'Unknown Artist') formatted.artist = item.name;
      if (!formatted.artistId) formatted.artistId = item.id;
      return formatted;
    }),
  };
}

// Helper to format album
export function formatAlbum(item) {
  const albumThumb = item.images?.[0]?.url || '';
  return {
    id: item.id || '',
    name: item.name || 'Unknown Album',
    type: item.type || 'album',
    releaseDate: item.release_date || '',
    artist: item.artists?.[0]?.name || '',
    artistId: item.artists?.[0]?.id || '',
    image: albumThumb,
    tracks: (item.tracks || []).map((t) => {
      const formatted = formatSpotifyTrack(t);
      if (!formatted.thumbnail) formatted.thumbnail = albumThumb;
      return formatted;
    }),
  };
}

// Helper to format playlist
export function formatPlaylist(item) {
  return {
    id: item.id || '',
    name: item.name || 'Unknown Playlist',
    description: item.description || '',
    image: item.images?.[0]?.url || '',
    owner: item.owner?.display_name || '',
    trackCount: item.tracks?.length || 0,
    tracks: (item.tracks || []).map((t) => {
      const formatted = formatSpotifyTrack(t);
      if (!formatted.thumbnail && t.album?.images?.[0]?.url) {
        formatted.thumbnail = t.album.images[0].url;
      }
      return formatted;
    }),
  };
}
