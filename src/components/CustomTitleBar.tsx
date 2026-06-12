import React, { useEffect, useState } from 'react';
import { Minus, Square, X, Square as Maximize } from 'lucide-react';
import { windowControls } from '../bridge';

export const CustomTitleBar: React.FC = () => {
  const [isMaximized, setIsMaximized] = useState(false);

  useEffect(() => {
    const checkMaximized = async () => {
      const maximized = await windowControls.isMaximized();
      setIsMaximized(maximized as boolean);
    };
    checkMaximized();
  }, []);

  const handleMaximize = async () => {
    await windowControls.maximize();
    setIsMaximized((await windowControls.isMaximized()) as boolean);
  };

  return (
    <div className="drag-region fixed top-0 left-0 right-0 h-11 flex items-center justify-between px-4 z-40 skin-titlebar"
      style={{ background: 'var(--bg-sidebar)', backdropFilter: 'blur(16px)', borderBottom: '1px solid oklch(1 0 0 / 0.05)' }}>
      <div className="flex items-center gap-2.5">
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'oklch(var(--zen-sakura-base))', boxShadow: '0 0 8px oklch(var(--zen-sakura-base) / 0.5)' }} />
        <span className="text-xs font-semibold tracking-wide" style={{ color: 'rgba(255,255,255,0.35)' }}>Sakura Music</span>
      </div>
      <div className="flex gap-1 no-drag">
        {[{ icon: Minus, action: windowControls.minimize, label: 'Minimizar' },
          { icon: isMaximized ? Maximize : Square, action: handleMaximize, label: 'Maximizar' },
          { icon: X, action: windowControls.close, label: 'Cerrar', danger: true },
        ].map(({ icon: Icon, action, label, danger }) => (
          <button key={label} onClick={action} title={label}
            className="p-1.5 rounded-md transition-all duration-150"
            style={{ color: 'var(--text-label)' }}
            onMouseEnter={e => { e.currentTarget.style.background = danger ? 'rgba(239,68,68,0.2)' : 'var(--bg-hover)'; e.currentTarget.style.color = danger ? '#ef4444' : 'var(--text-body)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-label)'; }}>
            <Icon size={13} />
          </button>
        ))}
      </div>
    </div>
  );
};
