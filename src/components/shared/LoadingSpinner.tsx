import React from 'react';

export const LoadingSpinner: React.FC<{ size?: number }> = ({ size = 24 }) => (
  <div
    style={{
      width: size, height: size, border: '2px solid var(--border-card)',
      borderTopColor: 'var(--accent-gradient)', borderRadius: '50%',
      animation: 'spin 0.7s linear infinite',
    }}
  />
);
