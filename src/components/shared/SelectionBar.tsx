import React from 'react';
import { motion } from 'framer-motion';
import { Edit3, Trash2 } from 'lucide-react';

interface Props {
  count: number;
  onClear: () => void;
  onDelete: () => void;
  onOpenEditor: () => void;
}

const ActionBtn: React.FC<{ icon: React.ReactNode; label: string; onClick: () => void }> = ({ icon, label, onClick }) => (
  <button
    onClick={onClick}
    style={{
      display: 'flex', alignItems: 'center', gap: '5px', padding: '5px 10px',
      borderRadius: '6px', border: 'none', background: 'transparent',
      color: 'var(--text-body)', cursor: 'pointer', fontSize: '12px',
      transition: 'background 0.12s',
    }}
    onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-hover)'}
    onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.background = 'transparent'}
  >
    {icon} {label}
  </button>
);

export const SelectionBar: React.FC<Props> = ({ count, onClear, onDelete, onOpenEditor }) => (
  <motion.div
    initial={{ y: 60, opacity: 0 }}
    animate={{ y: 0, opacity: 1 }}
    exit={{ y: 60, opacity: 0 }}
    transition={{ type: 'spring', damping: 25, stiffness: 350 }}
    style={{
      position: 'absolute', bottom: '16px', left: '50%', transform: 'translateX(-50%)',
      display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px',
      borderRadius: '10px', background: 'var(--bg-card)', border: '1px solid var(--border-card)',
      boxShadow: '0 4px 24px rgba(0,0,0,0.35)', fontSize: '13px', color: 'var(--text-body)', zIndex: 20,
    }}
  >
    <span style={{ fontWeight: 600, marginRight: '4px', color: 'var(--text-heading)' }}>{count}</span>
    <span style={{ color: 'var(--text-dim)', fontSize: '12px' }}>seleccionados</span>
    <div style={{ width: '1px', height: '18px', background: 'var(--border-card)', margin: '0 6px' }} />
    <ActionBtn icon={<Edit3 size={14} />} label="Editar" onClick={onOpenEditor} />
    <ActionBtn icon={<Trash2 size={14} />} label="Eliminar" onClick={onDelete} />
    <div style={{ width: '1px', height: '18px', background: 'var(--border-card)', margin: '0 6px' }} />
    <button
      onClick={onClear}
      style={{
        background: 'transparent', border: 'none', color: 'var(--text-dim)',
        cursor: 'pointer', fontSize: '12px', padding: '4px 8px',
        borderRadius: '5px', transition: 'color 0.12s',
      }}
      onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-body)'}
      onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-dim)'}
    >
      Limpiar
    </button>
  </motion.div>
);
