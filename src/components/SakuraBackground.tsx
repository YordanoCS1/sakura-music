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

function petalEmoji(): { enabled: boolean; char: string } {
  const theme = currentTheme();
  const map: Record<string, string> = {
    'glass-dark': '🌸',
    'minimal-light': '🌸',
    'sakura': '🌸',
    'ocean': '🌊',
    'emerald': '🍃',
    'sunset': '🌅',
    'cyberpunk': '💠',
    'neo-soft': '⬜',
    'zen-light': '🍂',
    'zen-dark': '🌙',
    'console': '▌',
    'city-pop': '💿',
    'tokyo-neon': '🔮',
    'wabi-sabi': '🍂',
    'vaporwave': '🌴',
    'anime-op': '✨',
  };
  const char = map[theme];
  return { enabled: !!char, char: char || '🌸' };
}

export const SakuraBackground: React.FC = () => {
  const [particles, setParticles] = useState<Petal[]>([]);
  const [emoji, setEmoji] = useState('🌸');

  useEffect(() => {
    const observer = new MutationObserver(() => {
      const { enabled, char } = petalEmoji();
      setEmoji(char);
      if (enabled) {
        const count = char === '⬜' ? 12 : 30;
        const newParticles = Array.from({ length: count }, (_, i) => ({
          id: i,
          left: Math.random() * 100,
          animationDuration: 8 + Math.random() * 12,
          delay: Math.random() * 15,
          size: char === '🌙' ? 14 + Math.random() * 10 : char === '▌' ? 6 + Math.random() * 4 : 8 + Math.random() * 12,
        }));
        setParticles(newParticles);
      } else {
        setParticles([]);
      }
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    const { enabled, char } = petalEmoji();
    setEmoji(char);
    if (enabled) {
      const count = char === '⬜' ? 12 : 30;
      setParticles(Array.from({ length: count }, (_, i) => ({
        id: i,
        left: Math.random() * 100,
        animationDuration: 8 + Math.random() * 12,
        delay: Math.random() * 15,
        size: char === '🌙' ? 14 + Math.random() * 10 : char === '▌' ? 6 + Math.random() * 4 : 8 + Math.random() * 12,
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
