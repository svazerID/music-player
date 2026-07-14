/**
 * Konfigurasi sederhana untuk Music Player
 * Menggunakan internal Express API dengan Spotify & YouTube Fallback
 */

// API URLs - Pointing to internal Express endpoints
const API_URL = {
    SEARCH: '/api/search',
    DOWNLOAD_MP3: '/api/download'
};

// App defaults
const APP_DEFAULTS = {
    DEFAULT_SEARCH: 'lagu viral',
    MAX_RECENT_ITEMS: 30,
    MAX_QUEUE_ITEMS: 20,
    STORAGE_KEY: 'recentlyPlayed'
};

// Utility functions
const UTILS = {
    // Format seconds to MM:SS
    formatTime: function(seconds) {
        const minutes = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${minutes}:${secs.toString().padStart(2, '0')}`;
    },
    
    // Check if text needs scrolling
    needsScrolling: function(text, maxLength = 20) {
        return text && text.length > maxLength;
    },
    
    // Format song object from internal API response
    formatSong: function(item) {
        return {
            id: item.id || '',
            title: item.title || 'Unknown Title',
            artist: item.artist || 'Unknown Artist',
            artistId: item.artistId || '',
            album: item.album || '',
            albumId: item.albumId || '',
            thumbnail: item.thumbnail || '/api/placeholder/300/300',
            duration: item.duration || 0,
            timestamp: item.timestamp || '0:00',
            videoUrl: item.videoUrl || '',
            source: item.source || 'unknown'
        };
    },
    
    // Format search results
    formatSearchResults: function(items) {
        if (!Array.isArray(items)) return [];
        return items.map(item => this.formatSong(item));
    },
    
    // Get download URL from internal API response
    getDownloadUrl: function(data) {
        if (!data) return null;
        return data.fileUrl || data.file_url || null;
    }
};