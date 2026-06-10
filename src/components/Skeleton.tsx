import React from 'react';

interface SkeletonProps {
  className?: string;
  width?: string | number;
  height?: string | number;
  borderRadius?: string | number;
  style?: React.CSSProperties;
}

export const Skeleton: React.FC<SkeletonProps> = ({ width, height, borderRadius = 8, style, className = '' }) => (
  <div className={className}
    style={{
      width: width || '100%',
      height: height || '100%',
      borderRadius,
      background: 'rgba(255,255,255,0.04)',
      animation: 'pulse 1.5s ease-in-out infinite',
      ...style,
    }}
  />
);

export const SkeletonCard: React.FC = () => (
  <div className="rounded-xl p-4" style={{ background: 'var(--bg-card)', border: 'var(--border-card)' }}>
    <Skeleton width="100%" height={140} borderRadius={10} style={{ marginBottom: 10 }} />
    <Skeleton width="70%" height={14} borderRadius={4} style={{ marginBottom: 6 }} />
    <Skeleton width="50%" height={10} borderRadius={4} style={{ marginBottom: 4 }} />
    <Skeleton width="30%" height={8} borderRadius={4} />
  </div>
);

export const SkeletonLine: React.FC<{ width?: string }> = ({ width = '60%' }) => (
  <Skeleton width={width} height={12} borderRadius={4} style={{ marginBottom: 8 }} />
);

export const SkeletonTable: React.FC<{ rows?: number }> = ({ rows = 5 }) => (
  <div className="space-y-2">
    {Array.from({ length: rows }).map((_, i) => (
      <div key={i} className="flex items-center gap-3 rounded-xl px-4 py-3" style={{ background: 'var(--bg-card)', border: 'var(--border-card)' }}>
        <Skeleton width={32} height={32} borderRadius={6} />
        <div className="flex-1 space-y-1.5">
          <Skeleton width={`${50 + Math.random() * 30}%`} height={12} borderRadius={4} />
          <Skeleton width={`${30 + Math.random() * 20}%`} height={9} borderRadius={4} />
        </div>
      </div>
    ))}
  </div>
);
