const express = require('express');
const path = require('path');
const axios = require('axios');
const sp = require('spotify-clients');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, 'public')));

// Helper to format track
function formatSpotifyTrack(item) {
  let artists = 'Unknown Artist';
  let artistId = '';
  
  if (item.artists) {
    if (Array.isArray(item.artists)) {
      artists = item.artists.map(a => a.name).join(', ');
      // Pastikan ID tidak undefined
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
    source: 'spotify'
  };
}

// Helper to format artist
function formatArtist(item) {
  return {
    id: item.id || '',
    name: item.name || 'Unknown Artist',
    image: item.images?.[0]?.url || '',
    followers: item.statistics?.followers || 0,
    monthlyListeners: item.statistics?.monthly_listeners || 0,
    verified: item.verified || false,
    topTracks: (item.top_tracks || []).map(t => {
      const formatted = formatSpotifyTrack(t);
      if (!formatted.artist || formatted.artist === 'Unknown Artist') formatted.artist = item.name;
      if (!formatted.artistId) formatted.artistId = item.id;
      return formatted;
    })
  };
}

// Helper to format album
function formatAlbum(item) {
  const albumThumb = item.images?.[0]?.url || '';
  return {
    id: item.id || '',
    name: item.name || 'Unknown Album',
    type: item.type || 'album',
    releaseDate: item.release_date || '',
    artist: item.artists?.[0]?.name || '',
    artistId: item.artists?.[0]?.id || '',
    image: albumThumb,
    tracks: (item.tracks || []).map(t => {
      const formatted = formatSpotifyTrack(t);
      if (!formatted.thumbnail) formatted.thumbnail = albumThumb;
      return formatted;
    })
  };
}

// Helper to format playlist
function formatPlaylist(item) {
  return {
    id: item.id || '',
    name: item.name || 'Unknown Playlist',
    description: item.description || '',
    image: item.images?.[0]?.url || '',
    owner: item.owner?.display_name || '',
    trackCount: item.tracks?.length || 0,
    tracks: (item.tracks || []).map(t => {
      const formatted = formatSpotifyTrack(t);
      if (!formatted.thumbnail && t.album?.images?.[0]?.url) {
        formatted.thumbnail = t.album.images[0].url;
      }
      return formatted;
    })
  };
}

// ============================
// API: Home (Aggregated Data)
// ============================
app.get('/api/home', async (req, res) => {
  try {
    // Run multiple searches in parallel for different sections
    const [trendingRes, chillRes, newRes] = await Promise.allSettled([
      sp.search('lagu viral indonesia 2025'),
      sp.search('chill vibes'),
      sp.search('new release indonesia'),
    ]);

    const sections = {};

    // Spotlight & Quick Picks from trending
    if (trendingRes.status === 'fulfilled' && trendingRes.value?.tracks?.length) {
      const tracks = trendingRes.value.tracks.map(formatSpotifyTrack);
      sections.spotlight = tracks.slice(0, 3);
      sections.quickPicks = tracks.slice(3, 7);
      sections.trending = tracks;
    }

    // Chill section
    if (chillRes.status === 'fulfilled' && chillRes.value?.tracks?.length) {
      sections.chill = chillRes.value.tracks.slice(0, 6).map(formatSpotifyTrack);
    }

    // New releases
    if (newRes.status === 'fulfilled' && newRes.value?.tracks?.length) {
      sections.newReleases = newRes.value.tracks.slice(0, 6).map(formatSpotifyTrack);
    }

    // Artists from search results
    if (trendingRes.status === 'fulfilled' && trendingRes.value?.artists?.length) {
      sections.featuredArtists = trendingRes.value.artists.slice(0, 6).map(a => ({
        id: a.id || '',
        name: a.name || '',
        image: a.images?.[0]?.url || '',
      }));
    }

    // Albums from search results
    if (trendingRes.status === 'fulfilled' && trendingRes.value?.albums?.length) {
      sections.featuredAlbums = trendingRes.value.albums.slice(0, 6).map(a => ({
        id: a.id || '',
        name: a.name || '',
        artist: a.artists?.[0]?.name || '',
        image: a.images?.[0]?.url || '',
        year: a.release_year || '',
      }));
    }

    // Playlists from search results
    if (chillRes.status === 'fulfilled' && chillRes.value?.playlists?.length) {
      sections.communityPlaylists = chillRes.value.playlists.slice(0, 4).map(p => ({
        id: p.id || '',
        name: p.name || '',
        description: p.description || '',
        image: p.images?.[0]?.url || '',
        owner: p.owner?.display_name || '',
      }));
    }

    return res.json({ status: true, data: sections });
  } catch (err) {
    console.error(`[Home Error] ${err.message}`);
    return res.status(500).json({ status: false, message: err.message });
  }
});

// ============================
// API: Artist Details
// ============================
app.get('/api/artist/:id', async (req, res) => {
  try {
    const artistData = await sp.artist(req.params.id);
    if (!artistData) return res.status(404).json({ status: false, message: 'Artist not found' });
    return res.json({ status: true, data: formatArtist(artistData) });
  } catch (err) {
    console.error(`[Artist Error] ${err.message}`);
    return res.status(500).json({ status: false, message: err.message });
  }
});

// ============================
// API: Album Details
// ============================
app.get('/api/album/:id', async (req, res) => {
  try {
    const albumData = await sp.album(req.params.id);
    if (!albumData) return res.status(404).json({ status: false, message: 'Album not found' });
    return res.json({ status: true, data: formatAlbum(albumData) });
  } catch (err) {
    console.error(`[Album Error] ${err.message}`);
    return res.status(500).json({ status: false, message: err.message });
  }
});

// ============================
// API: Playlist Details
// ============================
app.get('/api/playlist/:id', async (req, res) => {
  try {
    const playlistData = await sp.playlist(req.params.id);
    if (!playlistData) return res.status(404).json({ status: false, message: 'Playlist not found' });
    return res.json({ status: true, data: formatPlaylist(playlistData) });
  } catch (err) {
    console.error(`[Playlist Error] ${err.message}`);
    return res.status(500).json({ status: false, message: err.message });
  }
});

// ============================
// API: Track Details
// ============================
app.get('/api/track/:id', async (req, res) => {
  try {
    const trackData = await sp.track(req.params.id);
    if (!trackData) return res.status(404).json({ status: false, message: 'Track not found' });
    return res.json({ status: true, data: formatSpotifyTrack(trackData) });
  } catch (err) {
    console.error(`[Track Error] ${err.message}`);
    return res.status(500).json({ status: false, message: err.message });
  }
});

// ============================
// API: Search (existing, enhanced)
// ============================
app.get('/api/search', async (req, res) => {
  const query = req.query.q;
  if (!query) return res.status(400).json({ status: false, message: 'Query required' });

  try {
    // 1. Direct Spotify Track URL
    if (query.includes('open.spotify.com/track/')) {
      console.log(`[Spotify] Fetching direct track: ${query}`);
      const trackData = await sp.track(query.split('track/')[1].split('?')[0]);
      return res.json({ status: true, data: [formatSpotifyTrack(trackData)] });
    }

    // 2. Spotify Playlist URL
    if (query.includes('open.spotify.com/playlist/')) {
      console.log(`[Spotify] Fetching playlist: ${query}`);
      const id = query.split('playlist/')[1].split('?')[0];
      const playlistData = await sp.playlist(id);
      const tracks = playlistData.tracks.map(t => {
        const formatted = formatSpotifyTrack(t);
        if (!formatted.thumbnail && t.album?.images?.[0]?.url) {
          formatted.thumbnail = t.album.images[0].url;
        }
        return formatted;
      });
      return res.json({ status: true, data: tracks, meta: { type: 'playlist', name: playlistData.name } });
    }

    // 3. Spotify Album URL
    if (query.includes('open.spotify.com/album/')) {
      console.log(`[Spotify] Fetching album: ${query}`);
      const id = query.split('album/')[1].split('?')[0];
      const albumData = await sp.album(id);
      const albumThumb = albumData.images?.[0]?.url || '';
      const tracks = albumData.tracks.map(t => {
        const formatted = formatSpotifyTrack(t);
        if (!formatted.thumbnail) formatted.thumbnail = albumThumb;
        return formatted;
      });
      return res.json({ status: true, data: tracks, meta: { type: 'album', name: albumData.name, artist: albumData.artists?.[0]?.name } });
    }

    // 4. Spotify Artist URL
    if (query.includes('open.spotify.com/artist/')) {
      console.log(`[Spotify] Fetching artist: ${query}`);
      const id = query.split('artist/')[1].split('?')[0];
      const artistData = await sp.artist(id);
      const artistName = artistData.name || 'Unknown Artist';
      const artistImage = artistData.images?.[0]?.url || '';
      const artistId = artistData.id || id;
      const tracks = (artistData.top_tracks || []).map(t => {
        t.artists = artistName;
        t.artistId = artistId;
        return formatSpotifyTrack(t);
      });
      return res.json({ status: true, data: tracks, meta: { type: 'artist', name: artistName, image: artistImage, followers: artistData.statistics?.followers } });
    }

    // 5. Normal Search (returns full results including artists, albums, playlists)
    console.log(`[Search] Trying Spotify: ${query}`);
    const resV2 = await sp.query("search", {
        searchTerm: query,
        offset: 0,
        limit: 30,
        numberOfTopResults: 5,
        includeAudiobooks: true,
        includeArtistHasConcertsField: false,
        includePreReleases: true,
        includeAuthors: false,
        includeEpisodeContentRatingsV2: false
    });
    const spotifyRes = sp.parser.parseSearch(resV2.data.searchV2);
    const tracks = spotifyRes.tracks || [];
    
    if (tracks.length > 0) {
      const formatted = tracks.map(formatSpotifyTrack);
      
      // Also include artists, albums, playlists in the response
      const extra = {};
      if (spotifyRes.artists?.length) {
        extra.artists = spotifyRes.artists.slice(0, 4).map(a => ({
          id: a.id || '', name: a.name || '', image: a.images?.[0]?.url || ''
        }));
      }
      if (spotifyRes.albums?.length) {
        extra.albums = spotifyRes.albums.slice(0, 4).map(a => ({
          id: a.id || '', name: a.name || '', artist: a.artists?.[0]?.name || '', image: a.images?.[0]?.url || '', year: a.release_year || ''
        }));
      }
      if (spotifyRes.playlists?.length) {
        extra.playlists = spotifyRes.playlists.slice(0, 4).map(p => ({
          id: p.id || '', name: p.name || '', image: p.images?.[0]?.url || '', owner: p.owner?.display_name || ''
        }));
      }

      return res.json({ status: true, data: formatted, extra });
    }
    throw new Error('Spotify tidak menemukan hasil.');
  } catch (err) {
    console.error(`[Search Error] ${err.message}`);
    return res.status(500).json({ status: false, message: err.message });
  }
});

// API Download
app.get('/api/download', async (req, res) => {
  const { url, id } = req.query;
  
  try {
    if (id) {
      console.log(`[Download] Polling ID: ${id}`);
      const ytRes = await axios.get(`https://youtubedl.siputzx.my.id/download?id=${id}&apikey=nbteam`);
      return res.json(ytRes.data);
    }

    if (!url) return res.status(400).json({ status: false, message: 'URL required' });

    if (url.includes('spotify.com')) {
      console.log(`[Download] Spotify: ${url}`);
      try {
        const data = await sp.download(url);
        if (data && data.dl) {
          return res.json({ status: true, fileUrl: data.dl });
        }
        throw new Error('Gagal mengekstrak link unduhan Spotify.');
      } catch (spErr) {
        console.warn(`[Download] Spotify direct failed, falling back to YouTube: ${spErr.message}`);
        const trackId = url.split('track/')[1]?.split('?')[0];
        if (trackId) {
            const track = await sp.track(trackId);
            const query = `${track.name} ${track.artists[0]?.name}`;
            const ytRes = await axios.get(`https://youtubedl.siputzx.my.id/download?url=${encodeURIComponent(query)}&type=audio&apikey=nbteam`);
            return res.json(ytRes.data);
        }
        throw spErr;
      }
    } else {
      console.log(`[Download] YouTube/Other: ${url}`);
      const ytRes = await axios.get(`https://youtubedl.siputzx.my.id/download?url=${encodeURIComponent(url)}&type=audio&apikey=nbteam`);
      return res.json(ytRes.data);
    }
  } catch (err) {
    const errorMsg = err.response?.data?.message || err.response?.data?.error || err.message;
    console.error(`[Download Error] ${errorMsg}`);
    return res.status(err.response?.status || 500).json({ 
      status: false, 
      message: errorMsg 
    });
  }
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Use a more forceful port clearing or dynamic port
const startServer = (port) => {
  app.listen(port, () => {
    console.log(`
  ================================================
  🎵 AXD Player Server (v3.0 FULL FEATURES)
  🚀 Spotify Search, Artist, Album, Playlist, Track
  📦 Home API with aggregated sections
  🔗 URL: http://localhost:${port}
  ================================================
    `);
  }).on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.log(`Port ${port} in use, trying ${port + 1}...`);
      startServer(port + 1);
    } else {
      console.error(err);
    }
  });
};

startServer(PORT);

module.exports = app;