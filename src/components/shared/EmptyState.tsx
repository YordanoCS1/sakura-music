import React from 'react';
import { Search } from 'lucide-react';

interface Props {
  message: string;
  icon?: React.ReactNode;
}

export const EmptyState: React.FC<Props> = ({ message, icon }) => (
  <div
    style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', padding: '40px 20px', gap: '12px',
    }}
  >
    {icon || (
      <div
        style={{
          width: 48, height: 48, borderRadius: '50%',
          background: 'var(--bg-active)', display: 'flex',
          alignItems: 'center', justifyContent: 'center',
        }}
      >
        <Search size={22} style={{ color: 'var(--text-dim)' }} />
      </div>
    )}
    <p style={{ color: 'var(--text-body)', fontSize: 15, fontWeight: 600, margin: 0 }}>
      {message}
    </p>
  </div>
);
