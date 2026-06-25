import { useState, useEffect, useRef } from 'react';
import { Search, Settings, Film, AlertCircle, X, Sparkles, HelpCircle } from 'lucide-react';
import { MovieCard } from './components/MovieCard';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

interface Movie {
  id: number;
  title: string;
  originalTitle?: string;
}

interface MovieDetails {
  id: number;
  title: string;
  overview: string;
  genres: string[];
  cast: string[];
  director: string;
}

const mapGenreIds = (ids: number[]): string[] => {
  if (!ids) return [];
  const genreMap: Record<number, string> = {
    28: 'Action',
    12: 'Adventure',
    16: 'Animation',
    35: 'Comedy',
    80: 'Crime',
    99: 'Documentary',
    18: 'Drama',
    10751: 'Family',
    14: 'Fantasy',
    36: 'History',
    27: 'Horror',
    10402: 'Music',
    9648: 'Mystery',
    10749: 'Romance',
    878: 'Science Fiction',
    10770: 'TV Movie',
    53: 'Thriller',
    10752: 'War',
    37: 'Western',
  };
  return ids.map(id => genreMap[id] || '').filter(Boolean);
};

export default function App() {
  // State
  const [allMovies, setAllMovies] = useState<Movie[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [suggestions, setSuggestions] = useState<Movie[]>([]);
  const [showSuggestions, setShowSuggestions] = useState<boolean>(false);
  const [selectedMovie, setSelectedMovie] = useState<MovieDetails | null>(null);
  const [recommendations, setRecommendations] = useState<MovieDetails[]>([]);
  
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  
  // TMDB API Key State
  const [tmdbApiKey, setTmdbApiKey] = useState<string | null>(() => {
    return localStorage.getItem('tmdb_api_key');
  });
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [settingsKeyInput, setSettingsKeyInput] = useState<string>(tmdbApiKey || '');

  // Autocomplete navigation state
  const [activeSuggestionIdx, setActiveSuggestionIdx] = useState<number>(-1);

  // Refs for closing dropdown/modal on outside click
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Fetch movie names for autocomplete on mount
  useEffect(() => {
    const fetchMovies = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/movies`);
        if (!response.ok) {
          throw new Error('Failed to load movies from backend');
        }
        const data = await response.json();
        setAllMovies(data);
      } catch (err) {
        console.error('Error fetching movies:', err);
        setError('Backend is offline. Please start the FastAPI backend server first.');
      }
    };
    fetchMovies();
  }, []);

  // Filter movies for autocomplete suggestions as user types
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSuggestions([]);
      return;
    }

    if (tmdbApiKey) {
      // === LIVE MODE: Debounce TMDB search suggestions (300ms) ===
      const delayDebounce = setTimeout(async () => {
        try {
          const response = await fetch(
            `https://api.themoviedb.org/3/search/movie?api_key=${tmdbApiKey}&query=${encodeURIComponent(searchQuery)}`
          );
          if (response.ok) {
            const data = await response.json();
            const results = data.results.slice(0, 10).map((m: any) => {
              const year = m.release_date ? m.release_date.split('-')[0] : '';
              return {
                id: m.id,
                title: year ? `${m.title} (${year})` : m.title,
                originalTitle: m.title
              };
            });
            setSuggestions(results);
          }
        } catch (err) {
          console.error("Error fetching live suggestions:", err);
        }
      }, 300);

      return () => clearTimeout(delayDebounce);
    } else {
      // === LOCAL MODE: Filter local movies list ===
      const filtered = allMovies
        .filter((m) => m.title.toLowerCase().includes(searchQuery.toLowerCase()))
        .slice(0, 10)
        .map(m => ({ ...m, originalTitle: m.title }));
        
      setSuggestions(filtered);
      setActiveSuggestionIdx(-1);
    }
  }, [searchQuery, allMovies, tmdbApiKey]);

  // Handle clicking outside suggestions dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch recommendations for a movie
  const getRecommendations = async (title: string, id?: number) => {
    if (!title.trim()) return;
    setLoading(true);
    setError(null);
    setShowSuggestions(false);

    if (tmdbApiKey) {
      // === LIVE MODE (TMDB API Recommendations) ===
      try {
        let movieTargetId = id;
        
        // 1. If we don't have the ID, search for the movie first to get its ID
        if (!movieTargetId) {
          const searchRes = await fetch(
            `https://api.themoviedb.org/3/search/movie?api_key=${tmdbApiKey}&query=${encodeURIComponent(title)}`
          );
          if (searchRes.ok) {
            const searchData = await searchRes.json();
            if (searchData.results && searchData.results.length > 0) {
              movieTargetId = searchData.results[0].id;
            }
          }
        }

        if (!movieTargetId) {
          throw new Error("We couldn't find that movie on TMDB. Please check the spelling.");
        }

        // 2. Fetch movie details, credits (cast/director), and recommendations
        const [detailsRes, creditsRes, recsRes] = await Promise.all([
          fetch(`https://api.themoviedb.org/3/movie/${movieTargetId}?api_key=${tmdbApiKey}`),
          fetch(`https://api.themoviedb.org/3/movie/${movieTargetId}/credits?api_key=${tmdbApiKey}`),
          fetch(`https://api.themoviedb.org/3/movie/${movieTargetId}/recommendations?api_key=${tmdbApiKey}`)
        ]);

        if (!detailsRes.ok) {
          throw new Error("Failed to load movie details from TMDB.");
        }

        const details = await detailsRes.json();
        
        // Parse credits
        let director = "";
        let cast: string[] = [];
        if (creditsRes.ok) {
          const credits = await creditsRes.json();
          const dirObj = credits.crew.find((member: any) => member.job === 'Director');
          if (dirObj) director = dirObj.name;
          cast = credits.cast.slice(0, 3).map((c: any) => c.name);
        }

        // Parse recommendations
        let recsList: MovieDetails[] = [];
        if (recsRes.ok) {
          const recsData = await recsRes.json();
          recsList = recsData.results.slice(0, 5).map((m: any) => ({
            id: m.id,
            title: m.title,
            overview: m.overview || "No overview available.",
            genres: mapGenreIds(m.genre_ids),
            cast: [],
            director: ""
          }));
        }

        // If no recommendations are returned by TMDB
        if (recsList.length === 0) {
          setError("TMDB has no recommendations for this film. Try another movie.");
        }

        const releaseYear = details.release_date ? details.release_date.split('-')[0] : '';
        const displayTitle = releaseYear ? `${details.title} (${releaseYear})` : details.title;

        setSelectedMovie({
          id: details.id,
          title: displayTitle,
          overview: details.overview || "No overview available.",
          genres: details.genres.map((g: any) => g.name),
          cast: cast,
          director: director
        });
        
        setRecommendations(recsList);
        setSearchQuery(details.title);

      } catch (err: any) {
        console.error(err);
        setError(err.message || "Failed to fetch live TMDB recommendations.");
      } finally {
        setLoading(false);
      }

    } else {
      // === LOCAL MODE (FastAPI ML Model) ===
      let targetTitle = title.trim();
      const exactMatch = allMovies.find(m => m.title.toLowerCase() === targetTitle.toLowerCase());
      
      if (!exactMatch) {
        const fuzzyMatches = allMovies.filter(m => 
          m.title.toLowerCase().includes(targetTitle.toLowerCase())
        );
        if (fuzzyMatches.length > 0) {
          targetTitle = fuzzyMatches[0].title;
        }
      }
      
      try {
        const response = await fetch(`${API_BASE_URL}/api/recommend`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ movie_title: targetTitle }),
        });

        if (!response.ok) {
          const errData = await response.json();
          if (response.status === 404) {
            throw new Error("We couldn't find that movie in our database. Please make sure to search for popular movies released before 2017.");
          }
          throw new Error(errData.detail || 'Failed to fetch recommendations');
        }

        const data = await response.json();
        setSelectedMovie(data.selected_movie);
        setRecommendations(data.recommendations);
        setSearchQuery(data.selected_movie.title);
      } catch (err: any) {
        console.error(err);
        setError(err.message || 'Something went wrong while fetching recommendations.');
      } finally {
        setLoading(false);
      }
    }
  };

  // Keyboard navigation for suggestions dropdown
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showSuggestions || suggestions.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveSuggestionIdx((prev) => (prev < suggestions.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveSuggestionIdx((prev) => (prev > 0 ? prev - 1 : suggestions.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (activeSuggestionIdx >= 0 && activeSuggestionIdx < suggestions.length) {
        const selected = suggestions[activeSuggestionIdx];
        setSearchQuery(selected.title);
        getRecommendations(selected.originalTitle || selected.title, selected.id);
      } else {
        getRecommendations(searchQuery);
      }
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
      inputRef.current?.blur();
    }
  };

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanKey = settingsKeyInput.trim();
    if (cleanKey) {
      localStorage.setItem('tmdb_api_key', cleanKey);
      setTmdbApiKey(cleanKey);
    } else {
      localStorage.removeItem('tmdb_api_key');
      setTmdbApiKey(null);
    }
    setShowSettings(false);
  };

  const showResults = selectedMovie && !loading;
  const isSearchCentered = !showResults && !loading;

  return (
    <div className="app-container">
      {/* Header */}
      <header className="app-header">
        <div className="logo-container">
          <div className="logo-badge">
            <Film className="w-5 h-5 text-black" />
          </div>
          <div>
            <h1 className="logo-text">
              CINE<span className="text-highlight-red">MATCH</span>
            </h1>
            <p className="logo-subtitle">
              AI Movie Recommender
            </p>
          </div>
        </div>

        <button
          onClick={() => {
            setSettingsKeyInput(tmdbApiKey || '');
            setShowSettings(true);
          }}
          className="btn-secondary"
          style={{ padding: '10px' }}
          aria-label="Settings"
        >
          <Settings className="w-4 h-4 text-emerald-400" />
        </button>
      </header>

      {/* Main search and results content */}
      <main className={`main-content ${isSearchCentered ? 'main-centered' : 'main-gap'}`}>
        
        {/* Search Panel - Centered dynamically in the middle of the screen */}
        <section className={`glass-panel search-card ${isSearchCentered ? 'search-centered-card' : 'search-compact-card'}`}>
          {/* Ambient Glow decorative blobs */}
          <div style={{
            position: 'absolute',
            top: '-40px',
            left: '10%',
            width: '220px',
            height: '220px',
            backgroundColor: tmdbApiKey ? 'rgba(81, 207, 102, 0.04)' : 'rgba(255, 107, 107, 0.04)',
            borderRadius: '50%',
            filter: 'blur(80px)',
            pointerEvents: 'none'
          }} />
          <div style={{
            position: 'absolute',
            bottom: '-40px',
            right: '10%',
            width: '220px',
            height: '220px',
            backgroundColor: tmdbApiKey ? 'rgba(255, 107, 107, 0.04)' : 'rgba(81, 207, 102, 0.04)',
            borderRadius: '50%',
            filter: 'blur(80px)',
            pointerEvents: 'none'
          }} />

          <div className="search-inner">
            {isSearchCentered && (
              <div className="badge-ml">
                {tmdbApiKey ? (
                  <>
                    <Sparkles className="w-4 h-4 text-emerald-400" />
                    <span className="badge-ml-text" style={{ color: 'var(--accent-green)' }}>
                      Live Mode Active (Movies 1980 - 2026)
                    </span>
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-4 h-4 text-red-400" />
                    <span className="badge-ml-text" style={{ color: 'var(--accent-red)' }}>
                      Local ML Mode (Movies pre-2017)
                    </span>
                  </>
                )}
              </div>
            )}

            <h2 className={`search-title ${isSearchCentered ? 'title-large' : 'title-small'}`}>
              Find Your Next Favorite Film
            </h2>
            
            {isSearchCentered && (
              <p className="search-desc">
                {tmdbApiKey 
                  ? "Search for any movie ever made, and we will query Live TMDB Recommendations to construct the perfect match." 
                  : "Search for a movie, and we will analyze over 4,800 titles using text embedding similarity to find the perfect match."
                }
              </p>
            )}

            {/* Search input with dropdown suggestions */}
            <div ref={dropdownRef} className="search-bar-container">
              <div className="search-bar-wrapper">
                <Search className="search-icon-left w-5 h-5" />
                <input
                  ref={inputRef}
                  type="text"
                  value={searchQuery}
                  placeholder={tmdbApiKey ? "Search any movie (e.g. Oppenheimer, Dune, Inception)..." : "Search classics pre-2017 (e.g. Avatar, Inception)..."}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setShowSuggestions(true);
                  }}
                  onKeyDown={handleKeyDown}
                  onFocus={() => setShowSuggestions(true)}
                  className="text-input search-input-field"
                />
                
                <button
                  onClick={() => getRecommendations(searchQuery)}
                  disabled={loading || !searchQuery.trim()}
                  className="btn-primary match-btn-right"
                >
                  Match
                </button>
              </div>

              {/* Suggestions list */}
              {showSuggestions && suggestions.length > 0 && (
                <div className="suggestions-dropdown">
                  {suggestions.map((movie, idx) => (
                    <div
                      key={movie.id}
                      onClick={() => {
                        setSearchQuery(movie.title);
                        getRecommendations(movie.originalTitle || movie.title, movie.id);
                      }}
                      onMouseEnter={() => setActiveSuggestionIdx(idx)}
                      className={`suggestion-item ${idx === activeSuggestionIdx ? 'active' : ''}`}
                    >
                      <span>{movie.title}</span>
                      <Film className="suggestion-icon" />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Error Alert Box */}
        {error && (
          <div className="glass-panel error-alert-box animate-fade-in">
            <AlertCircle className="w-5 h-5 text-red-400" style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>
              <h4 className="error-title">
                {error.includes("couldn't find") ? 'Search Alert' : 'Connection Alert'}
              </h4>
              <p className="error-msg">{error}</p>
            </div>
          </div>
        )}

        {/* Loading Skeletons */}
        {loading && (
          <div className="loading-box-container animate-fade-in">
            <div className="glass-panel loading-skeleton-panel">
              <div className="loading-content">
                <div className="loading-spinner" />
                <p className="loading-text">Analyzing embeddings and calculating matches...</p>
              </div>
            </div>
          </div>
        )}

        {/* Recommendations Results list */}
        {showResults && selectedMovie && (
          <div className="results-container animate-fade-in">
            {/* Selected Movie detailed header card */}
            <div>
              <h3 className="section-label">
                <span className="label-dot-red" />
                Selected Movie
              </h3>
              <MovieCard movie={selectedMovie} tmdbApiKey={tmdbApiKey} variant="hero" />
            </div>

            {/* Recommendations Grid layout */}
            <div>
              <div className="results-header-row">
                <div className="results-title-block">
                  <h3 className="section-label">
                    <span className="label-dot-green" />
                    Recommendations
                  </h3>
                  <h2>Top 5 Matches For You</h2>
                </div>
                <div className="results-badge-ml">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                  {tmdbApiKey ? "Live TMDB recommendations" : "Local ML Similarity"}
                </div>
              </div>

              <div className="movie-cards-grid">
                {recommendations.map((rec) => (
                  <MovieCard
                    key={rec.id}
                    movie={rec}
                    tmdbApiKey={tmdbApiKey}
                    onSelect={() => getRecommendations(rec.title, rec.id)}
                  />
                ))}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer info */}
      <footer className="app-footer">
        <p>
          CineMatch © {new Date().getFullYear()} — Made with Python, React & TypeScript
        </p>
      </footer>

      {/* Settings Modal (TMDB API KEY Configuration) */}
      {showSettings && (
        <div className="modal-overlay animate-fade-in" onClick={() => setShowSettings(false)}>
          <div className="glass-panel modal-content" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setShowSettings(false)}
              className="modal-close-btn"
              aria-label="Close settings"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="modal-header">
              <h3 className="modal-title">
                <Settings className="w-5 h-5 text-emerald-400" />
                Configure Live Mode (1980 - 2026)
              </h3>
              <p className="modal-desc">
                Provide a TMDB API Key to activate **Live Mode**. This enables you to search for any movie released from 1980 up to today and get live recommendations and cover posters.
              </p>
            </div>

            <form onSubmit={handleSaveSettings} className="settings-form">
              <div className="form-group">
                <label className="form-label">TMDB API Key (v3)</label>
                <input
                  type="password"
                  value={settingsKeyInput}
                  onChange={(e) => setSettingsKeyInput(e.target.value)}
                  placeholder="Paste TMDB API Key here..."
                  className="text-input"
                />
              </div>

              <div className="help-box">
                <HelpCircle className="help-icon w-4 h-4 text-emerald-400" />
                <p>
                  Don't have a key? You can request a free one by registering at{' '}
                  <a
                    href="https://www.themoviedb.org/"
                    target="_blank"
                    rel="noreferrer"
                  >
                    themoviedb.org
                  </a>.
                </p>
              </div>

              <div className="form-actions">
                <button
                  type="button"
                  onClick={() => setShowSettings(false)}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                >
                  Save Settings
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
