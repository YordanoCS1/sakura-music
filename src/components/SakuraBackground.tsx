import React, { useEffect, useState } from 'react';

interface Petal {
  id: number;
  left: number;
  animationDuration: number;
  delay: number;
  size: number;
}

function currentTheme(): string {
  return document.documentElement.getAttribute('data-theme') || 'default';
}

function petalEmoji(): { enabled: boolean; char: string; count: number; speed: number } {
  const theme = currentTheme();
  const particlesPref = localStorage.getItem('particles');
  if (particlesPref === 'false') return { enabled: false, char: '', count: 0, speed: 1 };
  const map: Record<string, { char: string; count: number; speed: number }> = {
    'sakura': { char: '🌸', count: 30, speed: 1 },
    'city-pop': { char: '💿', count: 20, speed: 0.9 },
    'tokyo-neon': { char: '🔮', count: 25, speed: 0.8 },
    'wabi-sabi': { char: '🍂', count: 20, speed: 0.7 },
    'vaporwave': { char: '🌴', count: 15, speed: 0.6 },
    'anime-op': { char: '✨', count: 30, speed: 1.2 },
    'yokai': { char: '🏮', count: 18, speed: 0.5 },
    'ciudad-prohibida': { char: '🏯', count: 15, speed: 0.6 },
    'erudito': { char: '🖌️', count: 12, speed: 0.4 },
    'porcelana': { char: '❀', count: 20, speed: 0.7 },
    'dragon': { char: '🐉', count: 12, speed: 0.5 },
    'festival': { char: '🏮', count: 22, speed: 0.8 },
    'jade': { char: '🟢', count: 16, speed: 0.5 },
    'bambu': { char: '🎋', count: 16, speed: 0.6 },
    'atardecer': { char: '🌅', count: 20, speed: 0.7 },
    'hielo': { char: '❄️', count: 18, speed: 0.8 },
  };
  const entry = map[theme];
  if (!entry) return { enabled: false, char: '', count: 0, speed: 1 };
  const decorative = getComputedStyle(document.documentElement).getPropertyValue('--decorative-visible').trim();
  if (decorative === '0') return { enabled: false, char: '', count: 0, speed: 1 };
  return { enabled: true, ...entry };
}

export const SakuraBackground: React.FC = () => {
  const [particles, setParticles] = useState<Petal[]>([]);
  const [emoji, setEmoji] = useState('🌸');
  const [speed, setSpeed] = useState(1);

  useEffect(() => {
    const observer = new MutationObserver(() => {
      const { enabled, char, count, speed: s } = petalEmoji();
      setEmoji(char);
      setSpeed(s);
      if (enabled) {
        setParticles(Array.from({ length: count }, (_, i) => ({
          id: i,
          left: Math.random() * 100,
          animationDuration: (8 + Math.random() * 12) / s,
          delay: Math.random() * 15,
          size: 8 + Math.random() * 14,
        })));
      } else {
        setParticles([]);
      }
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    const { enabled, char, count, speed: s } = petalEmoji();
    setEmoji(char);
    setSpeed(s);
    if (enabled) {
      setParticles(Array.from({ length: count }, (_, i) => ({
        id: i,
        left: Math.random() * 100,
        animationDuration: (8 + Math.random() * 12) / s,
        delay: Math.random() * 15,
        size: 8 + Math.random() * 14,
      })));
    }
    return () => observer.disconnect();
  }, []);

  if (particles.length === 0) return null;

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      {particles.map((p) => (
        <div
          key={p.id}
          className="zen-petal"
          style={{
            left: `${p.left}%`,
            animationDuration: `${p.animationDuration}s`,
            animationDelay: `${p.delay}s`,
            fontSize: `${p.size}px`,
            opacity: 0.6,
          }}
        >
          {emoji}
        </div>
      ))}
    </div>
  );
};
