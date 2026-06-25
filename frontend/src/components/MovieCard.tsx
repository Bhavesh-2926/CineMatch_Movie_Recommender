import React, { useEffect, useState } from 'react';
import { Film, Star, User, Clapperboard } from 'lucide-react';

interface MovieCardProps {
  movie: {
    id: number;
    title: string;
    overview: string;
    genres: string[];
    cast: string[];
    director: string;
  };
  tmdbApiKey: string | null;
  onSelect?: () => void;
  variant?: 'grid' | 'hero';
}

export const MovieCard: React.FC<MovieCardProps> = ({ movie, tmdbApiKey, onSelect, variant = 'grid' }) => {
  const [posterUrl, setPosterUrl] = useState<string | null>(null);
  const [tmdbRating, setTmdbRating] = useState<number | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [gradient, setGradient] = useState<string>('');

  // Generate a stable gradient based on the movie title
  useEffect(() => {
    const gradients = [
      'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)', // Blue
      'linear-gradient(135deg, #ec4899 0%, #be185d 100%)', // Pink
      'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)', // Violet
      'linear-gradient(135deg, #10b981 0%, #047857 100%)', // Emerald
      'linear-gradient(135deg, #f59e0b 0%, #b45309 100%)', // Amber
      'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)', // Red
      'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)', // Cyan
      'linear-gradient(135deg, #6366f1 0%, #4338ca 100%)', // Indigo
    ];
    
    // Hash title string to pick a gradient
    let hash = 0;
    for (let i = 0; i < movie.title.length; i++) {
      hash = movie.title.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % gradients.length;
    setGradient(gradients[index]);
  }, [movie.title]);

  // Fetch poster from TMDB if API key is provided
  useEffect(() => {
    if (!tmdbApiKey) {
      setPosterUrl(null);
      setTmdbRating(null);
      return;
    }

    const fetchPoster = async () => {
      setLoading(true);
      try {
        const response = await fetch(
          `https://api.themoviedb.org/3/movie/${movie.id}?api_key=${tmdbApiKey}`
        );
        if (response.ok) {
          const data = await response.json();
          if (data.poster_path) {
            setPosterUrl(`https://image.tmdb.org/t/p/w500${data.poster_path}`);
          }
          if (data.vote_average) {
            setTmdbRating(Number(data.vote_average.toFixed(1)));
          }
        } else {
          setPosterUrl(null);
        }
      } catch (err) {
        console.error('Error fetching TMDB poster:', err);
        setPosterUrl(null);
      } finally {
        setLoading(false);
      }
    };

    fetchPoster();
  }, [movie.id, tmdbApiKey]);

  if (variant === 'hero') {
    return (
      <div className="glass-panel animate-fade-in overflow-hidden p-6 md:p-8 flex flex-col md:flex-row gap-8 items-start mb-12">
        {/* Poster Container */}
        <div className="relative w-full md:w-64 aspect-[2/3] rounded-xl overflow-hidden shadow-lg border border-white/10 flex-shrink-0">
          {loading ? (
            <div className="w-full h-full skeleton flex items-center justify-center">
              <Film className="w-12 h-12 text-white/20 animate-pulse" />
            </div>
          ) : posterUrl ? (
            <img src={posterUrl} alt={movie.title} className="w-full h-full object-cover transition-transform duration-700 hover:scale-105" />
          ) : (
            <div style={{ background: gradient }} className="w-full h-full flex flex-col justify-between p-6 relative">
              <div className="absolute inset-0 bg-black/20" />
              <Film className="w-10 h-10 text-white/70 relative z-10" />
              <div className="relative z-10">
                <h3 className="font-extrabold text-2xl leading-tight text-white mb-2">{movie.title}</h3>
                <p className="text-white/60 text-xs font-semibold uppercase tracking-wider">TMDB ID: {movie.id}</p>
              </div>
            </div>
          )}
          {tmdbRating !== null && (
            <div className="absolute top-3 right-3 bg-black/75 backdrop-filter backdrop-blur-sm border border-white/10 px-2.5 py-1 rounded-lg flex items-center gap-1.5 z-10">
              <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
              <span className="font-bold text-sm text-white">{tmdbRating}</span>
            </div>
          )}
        </div>

        {/* Details Container */}
        <div className="flex-1 flex flex-col justify-between h-full py-2">
          <div>
            <div className="flex flex-wrap gap-2 mb-4">
              {movie.genres.map((genre) => (
                <span key={genre} className="bg-white/5 border border-white/10 text-xs px-3 py-1 rounded-full font-medium text-white/80">
                  {genre}
                </span>
              ))}
            </div>

            <h1 className="text-3xl md:text-5xl font-black mb-4 tracking-tight leading-tight text-white">
              {movie.title}
            </h1>

            <p className="text-gray-300 text-base md:text-lg leading-relaxed mb-6 font-normal">
              {movie.overview}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-6 border-t border-white/5">
            {movie.director && (
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                  <Clapperboard className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider">Director</p>
                  <p className="font-semibold text-white">{movie.director}</p>
                </div>
              </div>
            )}

            {movie.cast && movie.cast.length > 0 && (
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center">
                  <User className="w-5 h-5 text-red-400" />
                </div>
                <div>
                  <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider">Top Cast</p>
                  <p className="font-semibold text-white line-clamp-1">{movie.cast.join(', ')}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Grid / Recommendation Card Variant
  return (
    <div
      onClick={onSelect}
      className={`glass-panel p-4 flex flex-col gap-4 cursor-pointer hover:border-red-500/30 transition-all duration-300 ease-out hover:-translate-y-2.5 group`}
      style={{ contentVisibility: 'auto' }}
    >
      {/* Poster Image or Fallback */}
      <div className="relative w-full aspect-[2/3] rounded-xl overflow-hidden shadow-md border border-white/5 bg-black/20 flex-shrink-0">
        {loading ? (
          <div className="w-full h-full skeleton flex items-center justify-center">
            <Film className="w-8 h-8 text-white/20 animate-pulse" />
          </div>
        ) : posterUrl ? (
          <img
            src={posterUrl}
            alt={movie.title}
            loading="lazy"
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div style={{ background: gradient }} className="w-full h-full flex flex-col justify-between p-4 relative">
            <div className="absolute inset-0 bg-black/25" />
            <Film className="w-8 h-8 text-white/70 relative z-10" />
            <div className="relative z-10">
              <h4 className="font-extrabold text-lg leading-tight text-white mb-1 line-clamp-2">{movie.title}</h4>
              <p className="text-white/60 text-[10px] font-semibold tracking-wider">TMDB: {movie.id}</p>
            </div>
          </div>
        )}
        
        {/* Rating Badge */}
        {tmdbRating !== null && (
          <div className="absolute top-2.5 right-2.5 bg-black/75 backdrop-filter backdrop-blur-sm border border-white/10 px-2 py-0.5 rounded-md flex items-center gap-1 z-10">
            <Star className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />
            <span className="font-bold text-xs text-white">{tmdbRating}</span>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 flex flex-col justify-between min-h-[90px]">
        <div>
          <h3 className="font-bold text-base text-white group-hover:text-red-400 transition-colors duration-200 line-clamp-1 mb-1.5">
            {movie.title}
          </h3>
          <p className="text-gray-400 text-xs line-clamp-2 leading-relaxed mb-3">
            {movie.overview}
          </p>
        </div>

        <div className="flex flex-wrap gap-1">
          {movie.genres.slice(0, 2).map((genre) => (
            <span key={genre} className="bg-white/5 border border-white/5 text-[10px] px-2 py-0.5 rounded-full font-medium text-white/60">
              {genre}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};
