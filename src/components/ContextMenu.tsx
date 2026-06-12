import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

interface MenuItem {
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  danger?: boolean;
}

interface Props {
  x: number;
  y: number;
  items: MenuItem[];
  onClose: () => void;
}

export const ContextMenu: React.FC<Props> = ({ x, y, items, onClose }) => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handle = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) onClose(); };
    window.addEventListener('mousedown', handle);
    return () => window.removeEventListener('mousedown', handle);
  }, [onClose]);

  const menuContent = (
    <div ref={ref}
      style={{ position: 'fixed', left: x, top: y, zIndex: 9999, minWidth: 160, padding: 4, borderRadius: 10, background: 'var(--bg-card)', border: 'var(--border-card)', boxShadow: '0 8px 32px rgba(0,0,0,0.4)', backdropFilter: 'blur(16px)' }}>
      {items.map((item, i) => (
        <button key={i} onClick={() => { item.onClick(); onClose(); }}
          style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '7px 10px', borderRadius: 6, border: 'none', background: 'transparent', color: item.danger ? '#ef4444' : 'var(--text-body)', fontSize: '0.78rem', fontWeight: 500, cursor: 'pointer', textAlign: 'left', transition: 'background 0.1s' }}
          onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
          {item.icon}
          {item.label}
        </button>
      ))}
    </div>
  );

  return createPortal(menuContent, document.body);
};
