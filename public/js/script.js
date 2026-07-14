/**
 * AXD Music Player - Full Featured
 * Uses /api/home for aggregated sections: spotlight, quick picks, artists, albums, playlists, chill, new releases
 */

// DOM
const searchInputs = document.querySelectorAll('.search-input');
const resultsContainer = document.getElementById('results');
const searchResultTitle = document.getElementById('searchResultTitle');
const loadingElement = document.querySelector('.loading');
const noResultsElement = document.querySelector('.no-results');
const audioPlayer = document.getElementById('audioPlayer');
const historySection = document.getElementById('historySection');
const historyList = document.getElementById('historyList');
const spotlightSlides = document.getElementById('spotlightSlides');
const spotlightDots = document.getElementById('spotlightDots');
const mainPlayerBar = document.getElementById('mainPlayerBar');
const playerMini = document.getElementById('playerMini');
const playerFull = document.getElementById('playerFull');
const minimizeBtn = document.getElementById('minimizeBtn');
const miniThumbnail = document.getElementById('miniThumbnail');
const miniTitle = document.getElementById('miniTitle');
const miniArtist = document.getElementById('miniArtist');
const miniTitleMobile = document.getElementById('miniTitleMobile');
const miniArtistMobile = document.getElementById('miniArtistMobile');
const playBtnLarge = document.getElementById('playBtnLarge');
const fullThumbnail = document.getElementById('fullThumbnail');
const fullTitle = document.getElementById('fullTitle');
const fullArtist = document.getElementById('fullArtist');
const fullBgImage = document.getElementById('fullBgImage');
const playBtnFull = document.getElementById('playBtnFull');
const prevBtnLarge = document.getElementById('prevBtnLarge');
const nextBtnLarge = document.getElementById('nextBtnLarge');
const prevBtnFull = document.getElementById('prevBtnFull');
const nextBtnFull = document.getElementById('nextBtnFull');
const shuffleBtn = document.getElementById('shuffleBtn');
const repeatBtn = document.getElementById('repeatBtn');
const progressBarLarge = document.getElementById('progressBarLarge');
const progressLarge = document.getElementById('progressLarge');
const currentTimeLarge = document.getElementById('currentTimeLarge');
const totalTimeLarge = document.getElementById('totalTimeLarge');
const progressBarFull = document.getElementById('progressBarFull');
const progressFull = document.getElementById('progressFull');
const currentTimeFull = document.getElementById('currentTimeFull');
const totalTimeFull = document.getElementById('totalTimeFull');
const downloadBtnLarge = document.getElementById('downloadBtnLarge');
const queueList = document.getElementById('queueList');

// State
let currentPlaylist = [];
let currentSongIndex = 0;
let isPlaying = false;
let isShuffle = false;
let isRepeat = false;
let recentlyPlayed = [];
let currentPlayingSong = null;
let spotlightIndex = 0;
let spotlightInterval = null;
let homeDataCache = null;

// =====================================================
// VIEWS
// =====================================================
function switchView(name) {
    document.querySelectorAll('.view-container').forEach(v => v.classList.add('hidden'));
    const map = { home:'viewHome', search:'viewSearch', library:'viewLibrary', settings:'viewSettings', searchResults:'viewSearchResults' };
    const el = document.getElementById(map[name]);
    if (el) el.classList.remove('hidden');
    updateNavActive(name);
    document.getElementById('mainContent').scrollTop = 0;
    if (window.lucide) window.lucide.createIcons();
}

function updateNavActive(name) {
    document.querySelectorAll('.mobile-nav-item').forEach(i => { i.classList.remove('text-white'); i.classList.add('text-gray-500'); });
    const m = document.querySelector(`.mobile-nav-item[data-view="${name}"]`);
    if (m) { m.classList.add('text-white'); m.classList.remove('text-gray-500'); }
    document.querySelectorAll('.sidebar-nav-item').forEach(i => { i.classList.remove('active','text-white','font-bold','bg-white/5'); i.classList.add('text-gray-400','font-medium'); });
    const s = document.querySelector(`.sidebar-nav-item[data-view="${name}"]`);
    if (s) { s.classList.add('active','text-white','font-bold','bg-white/5'); s.classList.remove('text-gray-400','font-medium'); }
}

// =====================================================
// GREETING
// =====================================================
function setGreeting() {
    const el = document.getElementById('greetingText');
    if (!el) return;
    const h = new Date().getHours();
    el.textContent = h < 6 ? 'Selamat Malam' : h < 11 ? 'Selamat Pagi' : h < 15 ? 'Selamat Siang' : h < 18 ? 'Selamat Sore' : 'Selamat Malam';
}

// =====================================================
// HOME PAGE - /api/home
// =====================================================
async function loadHomePage() {
    const homeLoading = document.getElementById('homeLoading');
    if (homeLoading) homeLoading.classList.remove('hidden');

    // Hide all sections initially
    ['spotlightSection','quickPicksSection','featuredArtistsSection','featuredAlbumsSection','communitySection','chillSection','newReleasesSection'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.add('hidden');
    });

    try {
        const res = await fetch('/api/home');
        const json = await res.json();
        if (homeLoading) homeLoading.classList.add('hidden');

        if (!json.status || !json.data) return;
        const d = json.data;
        homeDataCache = d;

        // Store trending tracks as currentPlaylist for playback
        if (d.trending) currentPlaylist = d.trending;

        // Spotlight
        if (d.spotlight?.length) buildSpotlight(d.spotlight);

        // Quick Picks
        if (d.quickPicks?.length) buildQuickPicks(d.quickPicks);

        // Featured Artists
        if (d.featuredArtists?.length) buildFeaturedArtists(d.featuredArtists);

        // Featured Albums
        if (d.featuredAlbums?.length) buildFeaturedAlbums(d.featuredAlbums);

        // Community Playlists
        if (d.communityPlaylists?.length) buildCommunityPlaylists(d.communityPlaylists);

        // Chill Vibes
        if (d.chill?.length) buildSongGrid(d.chill, 'chillSection', 'chillList');

        // New Releases
        if (d.newReleases?.length) buildSongGrid(d.newReleases, 'newReleasesSection', 'newReleasesList');

        // Artist sections from trending
        if (d.trending?.length > 7) buildArtistSections(d.trending);

        updateRecentlyPlayed();
    } catch (err) {
        console.error('Home load error:', err);
        if (homeLoading) homeLoading.classList.add('hidden');
        // Fallback: use search API
        searchSongs(APP_DEFAULTS.DEFAULT_SEARCH, false);
    }
}

// =====================================================
// SPOTLIGHT
// =====================================================
function buildSpotlight(songs) {
    if (!spotlightSlides) return;
    const section = document.getElementById('spotlightSection');
    if (section) section.classList.remove('hidden');
    spotlightSlides.innerHTML = '';

    songs.forEach(song => {
        const card = document.createElement('div');
        card.className = 'spotlight-card';
        card.innerHTML = `
            <img src="${song.thumbnail}" alt="${song.title}" loading="lazy">
            <div class="spotlight-overlay"></div>
            <div class="spotlight-content">
                <h3 class="text-lg font-black text-white leading-tight mb-0.5 truncate-2">${song.title}</h3>
                <p class="text-xs text-gray-300">${song.artist}</p>
            </div>
            <button class="spotlight-play-btn"><svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg></button>
        `;
        card.addEventListener('click', () => playSongDirect(song));
        spotlightSlides.appendChild(card);
    });

    spotlightIndex = 0;
    updateSpotlightDots(songs.length);
    if (spotlightInterval) clearInterval(spotlightInterval);
    if (songs.length > 1) spotlightInterval = setInterval(() => { spotlightIndex = (spotlightIndex + 1) % songs.length; spotlightSlides.style.transform = `translateX(-${spotlightIndex * 100}%)`; updateSpotlightDots(songs.length); }, 5000);
}

function updateSpotlightDots(total) {
    if (!spotlightDots) return;
    spotlightDots.innerHTML = '';
    for (let i = 0; i < total; i++) {
        const d = document.createElement('span');
        d.className = `inline-block h-1.5 rounded-full transition-all duration-300 cursor-pointer ${i === spotlightIndex ? 'bg-white w-4' : 'bg-white/30 w-1.5'}`;
        d.addEventListener('click', () => { spotlightIndex = i; spotlightSlides.style.transform = `translateX(-${i * 100}%)`; updateSpotlightDots(total); });
        spotlightDots.appendChild(d);
    }
}

// =====================================================
// QUICK PICKS
// =====================================================
function buildQuickPicks(songs) {
    const section = document.getElementById('quickPicksSection');
    const list = document.getElementById('quickPicksList');
    if (!list) return;
    section.classList.remove('hidden');
    list.innerHTML = '';
    songs.forEach(song => {
        const item = document.createElement('div');
        item.className = 'quick-pick-item flex items-center space-x-3 p-2.5 cursor-pointer group';
        item.innerHTML = `
            <img src="${song.thumbnail}" alt="" class="w-11 h-11 rounded-md object-cover flex-shrink-0">
            <div class="flex-1 min-w-0"><p class="text-sm font-semibold text-white truncate">${song.title}</p><p class="text-xs text-gray-400 truncate">${song.artist}</p></div>
            <button class="text-gray-500 hover:text-white p-1 flex-shrink-0"><i data-lucide="more-vertical" class="w-4 h-4"></i></button>
        `;
        item.addEventListener('click', (e) => { if (!e.target.closest('button')) playSongDirect(song); });
        list.appendChild(item);
    });
    if (window.lucide) window.lucide.createIcons();
}

// =====================================================
// FEATURED ARTISTS
// =====================================================
function buildFeaturedArtists(artists) {
    const section = document.getElementById('featuredArtistsSection');
    const list = document.getElementById('featuredArtistsList');
    if (!list) return;
    section.classList.remove('hidden');
    list.innerHTML = '';
    artists.forEach(a => {
        const item = document.createElement('div');
        item.className = 'artist-circle flex flex-col items-center space-y-1.5 flex-shrink-0';
        item.innerHTML = `
            <img src="${a.image || placeholderImg()}" alt="${a.name}">
            <p class="text-[10px] text-white font-semibold text-center w-16 truncate">${a.name}</p>
            <p class="text-[9px] text-gray-500">Artis</p>
        `;
        item.addEventListener('click', () => {
            if (a.id) doSearch(`https://open.spotify.com/artist/${a.id}`);
            else doSearch(a.name);
        });
        list.appendChild(item);
    });
}

// =====================================================
// FEATURED ALBUMS
// =====================================================
function buildFeaturedAlbums(albums) {
    const section = document.getElementById('featuredAlbumsSection');
    const list = document.getElementById('featuredAlbumsList');
    if (!list) return;
    section.classList.remove('hidden');
    list.innerHTML = '';
    albums.forEach(a => {
        const card = document.createElement('div');
        card.className = 'flex-shrink-0 w-36 cursor-pointer group';
        card.innerHTML = `
            <div class="w-36 h-36 rounded-xl overflow-hidden mb-2 shadow-lg"><img src="${a.image || placeholderImg()}" alt="${a.name}" class="w-full h-full object-cover group-hover:scale-105 transition duration-300"></div>
            <p class="text-xs font-bold text-white truncate">${a.name}</p>
            <p class="text-[10px] text-gray-400 truncate">${a.artist} ${a.year ? '• ' + a.year : ''}</p>
        `;
        card.addEventListener('click', () => {
            if (a.id) doSearch(`https://open.spotify.com/album/${a.id}`);
        });
        list.appendChild(card);
    });
}

// =====================================================
// COMMUNITY PLAYLISTS
// =====================================================
function buildCommunityPlaylists(playlists) {
    const section = document.getElementById('communitySection');
    const list = document.getElementById('communityList');
    if (!list) return;
    section.classList.remove('hidden');
    list.innerHTML = '';
    playlists.forEach(p => {
        const card = document.createElement('div');
        card.className = 'flex-shrink-0 w-40 cursor-pointer group';
        card.innerHTML = `
            <div class="w-40 h-40 rounded-xl overflow-hidden mb-2 shadow-lg relative">
                <img src="${p.image || placeholderImg()}" alt="${p.name}" class="w-full h-full object-cover group-hover:scale-105 transition duration-300">
                <div class="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                <div class="absolute bottom-2 left-2 right-2">
                    <p class="text-xs font-bold text-white truncate">${p.name}</p>
                    <p class="text-[9px] text-gray-300 truncate">${p.owner}</p>
                </div>
            </div>
        `;
        card.addEventListener('click', () => {
            if (p.id) doSearch(`https://open.spotify.com/playlist/${p.id}`);
        });
        list.appendChild(card);
    });
}

// =====================================================
// SONG GRID (Chill / New Releases)
// =====================================================
function buildSongGrid(songs, sectionId, listId) {
    const section = document.getElementById(sectionId);
    const list = document.getElementById(listId);
    if (!list) return;
    section.classList.remove('hidden');
    list.innerHTML = '';
    songs.forEach(song => {
        const card = document.createElement('div');
        card.className = 'speed-dial-card';
        card.innerHTML = `
            <div class="card-img-wrapper"><img src="${song.thumbnail}" alt="${song.title}" loading="lazy"><button class="card-play-btn"><svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg></button></div>
            <p class="text-[11px] font-semibold text-white truncate mt-1">${song.title}</p>
            <p class="text-[10px] text-gray-500 truncate">${song.artist}</p>
        `;
        card.addEventListener('click', () => playSongDirect(song));
        list.appendChild(card);
    });
}

// =====================================================
// ARTIST SECTIONS ("Serupa dengan")
// =====================================================
function buildArtistSections(songs) {
    const container = document.getElementById('artistSections');
    if (!container) return;
    container.innerHTML = '';
    const remaining = songs.slice(7);
    const groups = {};
    remaining.forEach(s => { if (!groups[s.artist]) groups[s.artist] = []; if (groups[s.artist].length < 3) groups[s.artist].push(s); });

    let count = 0;
    for (const [artist, tracks] of Object.entries(groups)) {
        if (count >= 3 || tracks.length < 1) continue;
        const section = document.createElement('section');
        section.className = 'mb-7';
        section.innerHTML = `
            <div class="flex items-center space-x-3 mb-3">
                <img src="${tracks[0].thumbnail}" alt="" class="w-8 h-8 rounded-full object-cover">
                <div><p class="text-[11px] text-gray-400">Serupa dengan</p><h2 class="text-base font-black">${artist}</h2></div>
            </div>
            <div class="grid grid-cols-3 gap-3"></div>
        `;
        const grid = section.querySelector('.grid');
        tracks.forEach(song => {
            const card = document.createElement('div');
            card.className = 'artist-song-card';
            card.innerHTML = `<div class="card-img"><img src="${song.thumbnail}" alt="" loading="lazy"></div><p class="text-xs font-semibold text-white truncate">${song.title}</p><p class="text-[10px] text-gray-500">${song.timestamp || '0:00'}</p>`;
            card.addEventListener('click', () => playSongDirect(song));
            grid.appendChild(card);
        });
        container.appendChild(section);
        count++;
    }
}

// =====================================================
// KEEP LISTENING (Mencari view)
// =====================================================
function buildKeepListening() {
    const list = document.getElementById('keepListeningList');
    if (!list) return;
    list.innerHTML = '';
    const seen = new Set();
    const artists = [];
    recentlyPlayed.forEach(s => { if (!seen.has(s.artist) && artists.length < 6) { seen.add(s.artist); artists.push(s); } });
    if (artists.length === 0 && homeDataCache?.featuredArtists) {
        homeDataCache.featuredArtists.slice(0, 4).forEach(a => artists.push({ artist: a.name, thumbnail: a.image, artistId: a.id }));
    }
    artists.forEach(a => {
        const item = document.createElement('div');
        item.className = 'artist-circle flex flex-col items-center space-y-1.5 flex-shrink-0';
        item.innerHTML = `<img src="${a.thumbnail || a.image || placeholderImg()}" alt="${a.artist || a.name}"><p class="text-[10px] text-gray-400 text-center w-16 truncate">${a.artist || a.name}</p><p class="text-[9px] text-gray-600">Artis</p>`;
        item.addEventListener('click', () => { if (a.artistId) doSearch(`https://open.spotify.com/artist/${a.artistId}`); else doSearch(a.artist || a.name); });
        list.appendChild(item);
    });
}

function placeholderImg() { return 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 64 64%22%3E%3Crect fill=%22%23282828%22 width=%2264%22 height=%2264%22/%3E%3Ctext x=%2232%22 y=%2236%22 text-anchor=%22middle%22 fill=%22%23555%22 font-size=%2220%22%3E♪%3C/text%3E%3C/svg%3E'; }

// =====================================================
// SEARCH
// =====================================================
async function searchSongs(query, pushHistory = true) {
    if (!query) return;
    if (pushHistory && query !== APP_DEFAULTS.DEFAULT_SEARCH) history.pushState({ view: 'searchResults', query }, '');

    if (query === APP_DEFAULTS.DEFAULT_SEARCH) {
        switchView('home');
        loadHomePage();
        return;
    }

    switchView('searchResults');
    if (searchResultTitle) { searchResultTitle.classList.remove('hidden'); searchResultTitle.textContent = `Hasil: "${query}"`; }

    const skeletonLoader = document.getElementById('skeletonLoader');
    const headerResultCard = document.getElementById('headerResultCard');
    if (skeletonLoader) skeletonLoader.classList.remove('hidden');
    if (noResultsElement) noResultsElement.classList.add('hidden');

    // Hide extra sections initially
    ['searchArtists','searchAlbums','searchPlaylists'].forEach(id => { const el = document.getElementById(id); if (el) el.classList.add('hidden'); });
    const tracksLabel = document.getElementById('tracksLabel');

    try {
        const response = await fetch(`${API_URL.SEARCH}?q=${encodeURIComponent(query)}`);
        const data = await response.json();
        if (skeletonLoader) skeletonLoader.classList.add('hidden');

        if (!data.status || !data.data?.length) { if (noResultsElement) noResultsElement.classList.remove('hidden'); return; }

        // Meta header
        if (data.meta && headerResultCard) {
            headerResultCard.classList.remove('hidden');
            const hImg = document.getElementById('headerResultImg'), hType = document.getElementById('headerResultType'), hName = document.getElementById('headerResultName'), hExtra = document.getElementById('headerResultExtra');
            if (hName) hName.textContent = data.meta.name;
            if (hType) hType.textContent = data.meta.type.toUpperCase();
            if (hImg) { hImg.src = data.meta.image || data.data[0]?.thumbnail || ''; hImg.classList.toggle('rounded-full', data.meta.type === 'artist'); }
            if (hExtra) { if (data.meta.type === 'artist') hExtra.textContent = `${(data.meta.followers || 0).toLocaleString()} Followers`; else if (data.meta.type === 'album') hExtra.textContent = `Album oleh ${data.meta.artist || ''}`; else hExtra.textContent = `${data.data.length} lagu`; }
            if (searchResultTitle) searchResultTitle.classList.add('hidden');
        } else {
            if (headerResultCard) headerResultCard.classList.add('hidden');
        }

        // Extra: artists, albums, playlists from search
        if (data.extra) {
            if (data.extra.artists?.length) buildSearchArtists(data.extra.artists);
            if (data.extra.albums?.length) buildSearchAlbums(data.extra.albums);
            if (data.extra.playlists?.length) buildSearchPlaylists(data.extra.playlists);
        }

        currentPlaylist = UTILS.formatSearchResults(data.data);
        if (tracksLabel && !data.meta) { tracksLabel.classList.remove('hidden'); }
        displayResults(currentPlaylist);
    } catch (err) {
        console.error('Search error:', err);
        if (skeletonLoader) skeletonLoader.classList.add('hidden');
        if (noResultsElement) noResultsElement.classList.remove('hidden');
    }
}

function doSearch(q) { searchSongs(q, true); }

// =====================================================
// SEARCH EXTRAS (Artists, Albums, Playlists in search results)
// =====================================================
function buildSearchArtists(artists) {
    const section = document.getElementById('searchArtists');
    const list = document.getElementById('searchArtistsList');
    if (!list) return;
    section.classList.remove('hidden');
    list.innerHTML = '';
    artists.forEach(a => {
        const item = document.createElement('div');
        item.className = 'artist-circle flex flex-col items-center space-y-1.5 flex-shrink-0';
        item.innerHTML = `<img src="${a.image || placeholderImg()}" alt="${a.name}"><p class="text-[10px] text-white font-semibold text-center w-16 truncate">${a.name}</p>`;
        item.addEventListener('click', () => { if (a.id) doSearch(`https://open.spotify.com/artist/${a.id}`); });
        list.appendChild(item);
    });
}

function buildSearchAlbums(albums) {
    const section = document.getElementById('searchAlbums');
    const list = document.getElementById('searchAlbumsList');
    if (!list) return;
    section.classList.remove('hidden');
    list.innerHTML = '';
    albums.forEach(a => {
        const card = document.createElement('div');
        card.className = 'flex-shrink-0 w-32 cursor-pointer group';
        card.innerHTML = `<div class="w-32 h-32 rounded-lg overflow-hidden mb-1.5 shadow-md"><img src="${a.image || placeholderImg()}" alt="" class="w-full h-full object-cover group-hover:scale-105 transition"></div><p class="text-[11px] font-bold text-white truncate">${a.name}</p><p class="text-[10px] text-gray-400 truncate">${a.artist || ''}</p>`;
        card.addEventListener('click', () => { if (a.id) doSearch(`https://open.spotify.com/album/${a.id}`); });
        list.appendChild(card);
    });
}

function buildSearchPlaylists(playlists) {
    const section = document.getElementById('searchPlaylists');
    const list = document.getElementById('searchPlaylistsList');
    if (!list) return;
    section.classList.remove('hidden');
    list.innerHTML = '';
    playlists.forEach(p => {
        const card = document.createElement('div');
        card.className = 'flex-shrink-0 w-32 cursor-pointer group';
        card.innerHTML = `<div class="w-32 h-32 rounded-lg overflow-hidden mb-1.5 shadow-md"><img src="${p.image || placeholderImg()}" alt="" class="w-full h-full object-cover group-hover:scale-105 transition"></div><p class="text-[11px] font-bold text-white truncate">${p.name}</p><p class="text-[10px] text-gray-400 truncate">${p.owner || 'Playlist'}</p>`;
        card.addEventListener('click', () => { if (p.id) doSearch(`https://open.spotify.com/playlist/${p.id}`); });
        list.appendChild(card);
    });
}

// =====================================================
// DISPLAY RESULTS (Track list)
// =====================================================
function displayResults(songs) {
    if (!resultsContainer) return;
    resultsContainer.innerHTML = '';
    songs.forEach((song, i) => {
        const row = document.createElement('div');
        row.className = 'track-row flex items-center p-2.5 rounded-lg cursor-pointer group';
        row.innerHTML = `
            <div class="w-7 text-center text-gray-500 text-xs group-hover:hidden">${i + 1}</div>
            <div class="w-7 text-center text-sp-green hidden group-hover:flex items-center justify-center"><svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg></div>
            <div class="flex items-center flex-1 min-w-0 space-x-3">
                <img src="${song.thumbnail}" alt="" class="w-10 h-10 rounded-md object-cover flex-shrink-0">
                <div class="flex-1 min-w-0"><p class="text-white text-sm font-semibold truncate">${song.title}</p><p class="text-gray-400 text-xs truncate mt-0.5"><span class="hover:underline hover:text-white artist-link cursor-pointer" data-id="${song.artistId}">${song.artist}</span></p></div>
            </div>
            <div class="hidden md:block w-40 text-gray-400 text-xs truncate px-3"><span class="hover:underline hover:text-white album-link cursor-pointer" data-id="${song.albumId}">${song.album || ''}</span></div>
            <div class="w-12 text-right text-gray-500 text-xs">${song.timestamp || '0:00'}</div>
        `;
        row.addEventListener('click', () => { playSong(currentPlaylist.findIndex(s => s.id === song.id)); updateQueue(); });
        const al = row.querySelector('.artist-link');
        if (al && song.artistId && song.artistId !== 'undefined') al.addEventListener('click', e => { e.stopPropagation(); doSearch(`https://open.spotify.com/artist/${song.artistId}`); });
        const abl = row.querySelector('.album-link');
        if (abl && song.albumId && song.albumId !== 'undefined') abl.addEventListener('click', e => { e.stopPropagation(); doSearch(`https://open.spotify.com/album/${song.albumId}`); });
        resultsContainer.appendChild(row);
    });
    if (window.lucide) window.lucide.createIcons();
}

// =====================================================
// PLAYBACK
// =====================================================
function playSongDirect(song) {
    if (!currentPlaylist.some(s => s.id === song.id)) currentPlaylist.unshift(song);
    playSong(currentPlaylist.findIndex(s => s.id === song.id));
    updateQueue();
}

async function requestDownload(videoUrl, onProgress) {
    const url = `${API_URL.DOWNLOAD_MP3}?url=${encodeURIComponent(videoUrl)}&type=audio&apikey=nbteam`;
    async function fetchData(u) { try { const r = await fetch(u); if (!r.ok) return { error: `${r.status}` }; const ct = r.headers.get("content-type"); if (ct?.includes("application/json")) return await r.json(); return { error: 'Non-JSON' }; } catch (e) { return { error: e.message }; } }
    let data = await fetchData(url);
    if (data.error) throw new Error(data.error);
    let retries = 0;
    while (!data.fileUrl && !data.file_url && retries < 60) {
        retries++;
        if (onProgress) onProgress(Math.min(10 + retries * 2.5, 90));
        await new Promise(r => setTimeout(r, 3000));
        const id = (data.id && data.id !== 'pending') ? data.id : '';
        data = await fetchData(id ? `${API_URL.DOWNLOAD_MP3}?id=${id}&apikey=nbteam` : url);
        if (data.fileUrl || data.file_url) break;
    }
    const dl = UTILS.getDownloadUrl(data);
    if (!dl) throw new Error('Gagal mendapatkan link download.');
    return dl;
}

async function playSong(index) {
    if (index < 0 || index >= currentPlaylist.length) return;
    currentSongIndex = index;
    const song = currentPlaylist[index];
    currentPlayingSong = song;
    const bar = document.getElementById('loadingBarFill');
    if (bar) { bar.classList.remove('transition-none'); bar.style.width = '10%'; bar.style.opacity = '1'; }
    try {
        const dl = await requestDownload(song.videoUrl, p => { if (bar) bar.style.width = `${p}%`; });
        if (bar) bar.style.width = '100%';
        if (miniThumbnail) miniThumbnail.src = song.thumbnail;
        if (miniTitle) miniTitle.textContent = song.title;
        if (miniArtist) { miniArtist.textContent = song.artist; miniArtist.dataset.artistId = song.artistId; }
        if (miniTitleMobile) miniTitleMobile.textContent = song.title;
        if (miniArtistMobile) miniArtistMobile.textContent = song.artist;
        if (fullThumbnail) fullThumbnail.src = song.thumbnail;
        if (fullTitle) fullTitle.textContent = song.title;
        if (fullArtist) { fullArtist.textContent = song.artist; fullArtist.dataset.artistId = song.artistId; }
        if (fullBgImage) fullBgImage.src = song.thumbnail;
        audioPlayer.src = dl;
        audioPlayer.play().then(() => {
            isPlaying = true; updatePlayIcons();
            if (mainPlayerBar) mainPlayerBar.classList.remove('hidden');
            addToRecentlyPlayed(song); updateQueue();
            setTimeout(() => { if (bar) { bar.style.opacity = '0'; setTimeout(() => { bar.classList.add('transition-none'); bar.style.width = '0%'; }, 300); } }, 500);
        }).catch(() => { if (bar) bar.style.opacity = '0'; });
    } catch (err) { if (bar) bar.style.opacity = '0'; alert('Error: ' + err.message); }
}

function updatePlayIcons() {
    const icon = isPlaying ? 'pause' : 'play';
    const m = document.getElementById('playIconMain'), f = document.getElementById('playIconFull');
    if (m) { m.setAttribute('data-lucide', icon); m.classList.toggle('ml-0.5', !isPlaying); }
    if (f) { f.setAttribute('data-lucide', icon); f.classList.toggle('ml-1', !isPlaying); }
    if (window.lucide) window.lucide.createIcons();
}

function togglePlay() { if (audioPlayer.paused) { audioPlayer.play(); isPlaying = true; } else { audioPlayer.pause(); isPlaying = false; } updatePlayIcons(); }
function playNextSong() { playSong(isShuffle ? Math.floor(Math.random() * currentPlaylist.length) : (currentSongIndex + 1) % currentPlaylist.length); updateQueue(); }
function playPreviousSong() { playSong((currentSongIndex - 1 + currentPlaylist.length) % currentPlaylist.length); updateQueue(); }
function updateProgressBar() { const ct = audioPlayer.currentTime, d = audioPlayer.duration || 1, p = (ct / d) * 100; if (progressLarge) progressLarge.style.width = `${p}%`; if (currentTimeLarge) currentTimeLarge.textContent = UTILS.formatTime(ct); if (totalTimeLarge) totalTimeLarge.textContent = UTILS.formatTime(d); if (progressFull) progressFull.style.width = `${p}%`; if (currentTimeFull) currentTimeFull.textContent = UTILS.formatTime(ct); if (totalTimeFull) totalTimeFull.textContent = UTILS.formatTime(d); }
function setProgress(e) { const r = e.currentTarget.getBoundingClientRect(); audioPlayer.currentTime = ((e.clientX - r.left) / r.width) * audioPlayer.duration; }
function toggleShuffle() { isShuffle = !isShuffle; [shuffleBtn, document.getElementById('shuffleBtnFull')].forEach(b => { if (b) { b.classList.toggle('text-green-500', isShuffle); b.classList.toggle('text-gray-400', !isShuffle && b.id !== 'shuffleBtnFull'); } }); }
function toggleRepeat() { isRepeat = !isRepeat; [repeatBtn, document.getElementById('repeatBtnFull')].forEach(b => { if (b) { b.classList.toggle('text-green-500', isRepeat); b.classList.toggle('text-gray-400', !isRepeat && b.id !== 'repeatBtnFull'); } }); }

// =====================================================
// RECENTLY PLAYED
// =====================================================
function addToRecentlyPlayed(song) {
    recentlyPlayed = recentlyPlayed.filter(s => s.id !== song.id);
    recentlyPlayed.unshift(song);
    if (recentlyPlayed.length > APP_DEFAULTS.MAX_RECENT_ITEMS) recentlyPlayed = recentlyPlayed.slice(0, APP_DEFAULTS.MAX_RECENT_ITEMS);
    updateRecentlyPlayed();
    localStorage.setItem(APP_DEFAULTS.STORAGE_KEY, JSON.stringify(recentlyPlayed));
}

function updateRecentlyPlayed() {
    if (!historyList) return;
    if (!recentlyPlayed.length) { historyList.innerHTML = ''; if (historySection) historySection.style.display = 'none'; return; }
    if (historySection) historySection.style.display = '';
    historyList.innerHTML = '';
    recentlyPlayed.forEach(song => {
        const card = document.createElement('div');
        card.className = 'speed-dial-card';
        card.innerHTML = `<div class="card-img-wrapper"><img src="${song.thumbnail}" alt="" loading="lazy"><button class="card-play-btn"><svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg></button></div><p class="text-[11px] font-semibold text-white truncate mt-1">${song.title}</p><p class="text-[10px] text-gray-500 truncate">${song.artist}</p>`;
        card.addEventListener('click', () => playSongDirect(song));
        historyList.appendChild(card);
    });
}

function updateQueue() {
    if (!queueList) return;
    queueList.innerHTML = '';
    let c = 0;
    for (let i = 0; i < currentPlaylist.length && c < APP_DEFAULTS.MAX_QUEUE_ITEMS; i++) {
        const idx = (currentSongIndex + i + 1) % currentPlaylist.length;
        if (idx !== currentSongIndex) {
            const s = currentPlaylist[idx];
            const item = document.createElement('div');
            item.className = 'flex items-center space-x-3 p-2.5 rounded-lg hover:bg-white/5 transition cursor-pointer group';
            item.innerHTML = `<img src="${s.thumbnail}" alt="" class="w-10 h-10 rounded-md object-cover"><div class="flex-1 min-w-0"><p class="text-white text-sm truncate group-hover:underline">${s.title}</p><p class="text-gray-400 text-xs truncate">${s.artist}</p></div>`;
            item.addEventListener('click', () => { playSong(idx); updateQueue(); });
            queueList.appendChild(item);
            c++;
        }
    }
}

async function downloadCurrentSong() {
    if (!currentPlayingSong) return;
    const song = currentPlayingSong, bar = document.getElementById('loadingBarFill');
    if (bar) { bar.style.opacity = '1'; bar.style.width = '10%'; }
    try {
        const url = await requestDownload(song.videoUrl, p => { if (bar) bar.style.width = `${p}%`; });
        const resp = await fetch(url), blob = await resp.blob(), blobUrl = URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = blobUrl; a.download = `${song.title.replace(/[\\/:\"*?<>|]/g, '_')}.mp3`;
        document.body.appendChild(a); a.click(); URL.revokeObjectURL(blobUrl); document.body.removeChild(a);
    } catch (e) { alert('Gagal mengunduh: ' + e.message); }
    finally { if (bar) { bar.style.width = '100%'; setTimeout(() => bar.style.opacity = '0', 500); } }
}

function loadRecentlyPlayed() { const s = localStorage.getItem(APP_DEFAULTS.STORAGE_KEY); if (s) { try { recentlyPlayed = JSON.parse(s); updateRecentlyPlayed(); } catch (e) {} } }

// =====================================================
// CATEGORY PILLS
// =====================================================
function setupCategoryPills() {
    document.querySelectorAll('.category-pill').forEach(pill => {
        pill.addEventListener('click', () => {
            document.querySelectorAll('.category-pill').forEach(p => { p.classList.remove('active','bg-white','text-black'); p.classList.add('bg-sp-light','text-white'); });
            pill.classList.add('active'); pill.classList.remove('bg-sp-light','text-white');
            // For categories, search with that term
            const cat = pill.textContent.trim();
            // Reload home with different query by fetching search results
            loadHomeWithCategory(cat);
        });
    });
}

async function loadHomeWithCategory(category) {
    const homeLoading = document.getElementById('homeLoading');
    if (homeLoading) homeLoading.classList.remove('hidden');
    ['spotlightSection','quickPicksSection','featuredArtistsSection','featuredAlbumsSection','communitySection','chillSection','newReleasesSection'].forEach(id => { const el = document.getElementById(id); if (el) el.classList.add('hidden'); });
    const container = document.getElementById('artistSections');
    if (container) container.innerHTML = '';

    try {
        const response = await fetch(`${API_URL.SEARCH}?q=${encodeURIComponent(category)}`);
        const data = await response.json();
        if (homeLoading) homeLoading.classList.add('hidden');
        if (!data.status || !data.data?.length) return;

        const songs = UTILS.formatSearchResults(data.data);
        currentPlaylist = songs;
        if (songs.length >= 3) buildSpotlight(songs.slice(0, 3));
        if (songs.length >= 7) buildQuickPicks(songs.slice(3, 7));
        if (songs.length > 7) buildArtistSections(songs);

        // Show extras
        if (data.extra?.artists?.length) buildFeaturedArtists(data.extra.artists);
        if (data.extra?.albums?.length) buildFeaturedAlbums(data.extra.albums);
        if (data.extra?.playlists?.length) buildCommunityPlaylists(data.extra.playlists);
    } catch (err) {
        console.error(err);
        if (homeLoading) homeLoading.classList.add('hidden');
    }
}

// =====================================================
// EVENTS
// =====================================================
function setupEventListeners() {
    const searchOverlay = document.getElementById('searchOverlay');
    const toggleSearch = (show) => { if (show) { searchOverlay.classList.remove('hidden'); const i = searchOverlay.querySelector('.search-input'); if (i) setTimeout(() => i.focus(), 100); } else searchOverlay.classList.add('hidden'); };

    document.getElementById('closeSearchBtn')?.addEventListener('click', () => toggleSearch(false));
    searchInputs.forEach(input => input.addEventListener('keypress', e => { if (e.key === 'Enter') { doSearch(input.value.trim()); toggleSearch(false); } }));
    document.querySelectorAll('.trend-search').forEach(b => b.addEventListener('click', () => { doSearch(b.textContent.trim()); toggleSearch(false); }));
    document.querySelectorAll('.trending-item').forEach(i => i.addEventListener('click', () => doSearch(i.dataset.query)));
    document.getElementById('searchPageSearchBtn')?.addEventListener('click', () => toggleSearch(true));

    // Nav
    document.querySelectorAll('.mobile-nav-item, .sidebar-nav-item').forEach(item => {
        item.addEventListener('click', e => {
            e.preventDefault();
            const v = item.dataset.view;
            if (v === 'search') { switchView('search'); buildKeepListening(); }
            else if (v === 'home') { switchView('home'); if (!homeDataCache) loadHomePage(); }
            else switchView(v);
        });
    });
    document.querySelectorAll('.settings-back-btn').forEach(b => b.addEventListener('click', () => { switchView('home'); if (!homeDataCache) loadHomePage(); }));
    document.getElementById('quickPicksPlayAll')?.addEventListener('click', () => { if (currentPlaylist.length > 3) playSong(3); });

    // Library filters
    document.querySelectorAll('.lib-filter').forEach(p => p.addEventListener('click', () => { document.querySelectorAll('.lib-filter').forEach(x => { x.classList.remove('active','bg-white','text-black'); x.classList.add('bg-sp-light','text-white'); }); p.classList.add('active'); p.classList.remove('bg-sp-light','text-white'); }));

    // Player
    playBtnLarge?.addEventListener('click', togglePlay);
    playBtnFull?.addEventListener('click', togglePlay);
    prevBtnLarge?.addEventListener('click', playPreviousSong);
    nextBtnLarge?.addEventListener('click', playNextSong);
    prevBtnFull?.addEventListener('click', playPreviousSong);
    nextBtnFull?.addEventListener('click', playNextSong);
    shuffleBtn?.addEventListener('click', toggleShuffle);
    document.getElementById('shuffleBtnFull')?.addEventListener('click', toggleShuffle);
    repeatBtn?.addEventListener('click', toggleRepeat);
    document.getElementById('repeatBtnFull')?.addEventListener('click', toggleRepeat);
    document.getElementById('queueBtnFull')?.addEventListener('click', () => document.getElementById('queueSectionFull')?.scrollIntoView({ behavior: 'smooth' }));
    progressBarLarge?.addEventListener('click', setProgress);
    progressBarFull?.addEventListener('click', setProgress);
    audioPlayer?.addEventListener('timeupdate', updateProgressBar);
    audioPlayer?.addEventListener('ended', () => isRepeat ? (audioPlayer.currentTime = 0, audioPlayer.play()) : playNextSong());
    downloadBtnLarge?.addEventListener('click', downloadCurrentSong);
    document.getElementById('downloadBtnMobile')?.addEventListener('click', e => { e.stopPropagation(); downloadCurrentSong(); });
    minimizeBtn?.addEventListener('click', () => playerFull.classList.add('hidden'));
    playerMini?.addEventListener('click', () => playerFull.classList.remove('hidden'));
    miniArtist?.addEventListener('click', e => { e.stopPropagation(); const id = miniArtist.dataset.artistId; if (id && id !== 'undefined') doSearch(`https://open.spotify.com/artist/${id}`); });
    fullArtist?.addEventListener('click', e => { e.stopPropagation(); const id = fullArtist.dataset.artistId; if (id && id !== 'undefined') { playerFull.classList.add('hidden'); doSearch(`https://open.spotify.com/artist/${id}`); } });
    document.getElementById('backToHomeBtn')?.addEventListener('click', e => { e.preventDefault(); history.back(); });
    window.addEventListener('popstate', e => { if (e.state?.view === 'searchResults') searchSongs(e.state.query, false); else { switchView('home'); if (!homeDataCache) loadHomePage(); } });

    setupCategoryPills();
}

// =====================================================
// INIT
// =====================================================
document.addEventListener('DOMContentLoaded', () => {
    setGreeting();
    loadRecentlyPlayed();
    setupEventListeners();
    switchView('home');
    loadHomePage();
    if (!history.state) history.replaceState({ view: 'home' }, '');
});