import React, { useState, useEffect, useCallback } from 'react';
import { ImageOff } from 'lucide-react';
import { invoke } from '../bridge';

const metaCache = new Map();
const pendingRequests = new Map();

async function getCachedCover(filePath: string): Promise<string | null> {
  const cached = metaCache.get(filePath);
  if (cached) return cached;

  if (pendingRequests.has(filePath)) {
    return pendingRequests.get(filePath);
  }

  const promise = invoke<{ cover?: string | null }>('get_file_metadata', { filePath }).then(meta => {
    const cover = meta?.cover || null;
    metaCache.set(filePath, cover);
    if (metaCache.size > 2000) {
      const first = metaCache.keys().next().value;
      if (first) metaCache.delete(first);
    }
    pendingRequests.delete(filePath);
    return cover;
  }).catch(err => {
    pendingRequests.delete(filePath);
    return null;
  });

  pendingRequests.set(filePath, promise);
  return promise;
}

interface CoverArtProps {
  path?: string;
  title: string;
  artist?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  onClick?: () => void;
}

export const CoverArt: React.FC<CoverArtProps> = ({
  path,
  title,
  artist,
  size = 'md',
  className = '',
  onClick,
}) => {
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const sizeMap = { sm: 48, md: 80, lg: 128, xl: 192 };
  const px = sizeMap[size];
  const sizeClasses = {
    sm: `w-12 h-12`,
    md: `w-20 h-20`,
    lg: `w-32 h-32`,
    xl: `w-48 h-48`,
  };

  const loadCover = useCallback(async () => {
    if (!path) { setLoading(false); setError(true); return; }
    setLoading(true);
    setError(false);

    const cover = await getCachedCover(path);
    if (cover) {
      setCoverUrl(cover);
    } else {
      setError(true);
    }
    setLoading(false);
  }, [path]);

  useEffect(() => {
    if (path) {
      loadCover();
    }
  }, [path, loadCover]);

  const getInitials = () => {
    if (title) return title.charAt(0).toUpperCase();
    if (artist) return artist.charAt(0).toUpperCase();
    return '🎵';
  };

  const getGradient = () => {
    const gradients = [
      'from-pink-500 to-rose-500',
      'from-purple-500 to-pink-500',
      'from-blue-500 to-purple-500',
      'from-emerald-500 to-teal-500',
      'from-orange-500 to-red-500',
      'from-indigo-500 to-purple-500',
    ];
    const index = (title?.length || 0) % gradients.length;
    return gradients[index];
  };

  if (loading) {
    return (
      <div className={`${sizeClasses[size]} rounded-lg bg-gradient-to-br ${getGradient()} animate-pulse ${className}`}
        style={{ width: px, height: px }} />
    );
  }

  if (coverUrl && !error) {
    return (
      <img
        src={coverUrl}
        alt={title}
        width={px}
        height={px}
        className={`${sizeClasses[size]} rounded-lg object-cover shadow-md hover:shadow-lg transition-all duration-300 ${className}`}
        onClick={onClick}
        style={{ cursor: onClick ? 'pointer' : 'default' }}
      />
    );
  }

  return (
    <div
      className={`${sizeClasses[size]} rounded-lg bg-gradient-to-br ${getGradient()} flex items-center justify-center shadow-md hover:shadow-lg transition-all duration-300 ${className}`}
      onClick={onClick}
      style={{ cursor: onClick ? 'pointer' : 'default', width: px, height: px }}
    >
      {error ? (
        <ImageOff size={size === 'sm' ? 16 : size === 'md' ? 24 : 32} className="text-white/70" />
      ) : (
        <span className="text-white text-2xl font-bold">{getInitials()}</span>
      )}
    </div>
  );
};