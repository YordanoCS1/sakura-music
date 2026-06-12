import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { X, Search, Check, FolderOpen, Image, Download, RefreshCw, Disc3, Users, AlertTriangle } from 'lucide-react';
import { invoke } from '../bridge';
import toast from 'react-hot-toast';

interface AlbumResult {
  url: string;
  album: string;
  artist: string;
}

interface ArtistResult {
  url: string;
  name: string;
  source?: string;
}

interface Props {
  folderName: string;
  folderPath: string;
  onClose: () => void;
  onSaved: () => void;
}

type Tab = 'album' | 'artist';

const T = {
  overlay: 'rgba(0,0,0,0.6)', containerBg: '#12121c', containerBorder: 'rgba(255,255,255,0.07)', containerShadow: '0 30px 80px rgba(0,0,0,0.65)',
  surface: 'rgba(255,255,255,0.04)', surfaceHover: 'rgba(255,255,255,0.07)', borderDim: 'rgba(255,255,255,0.07)', borderMid: 'rgba(255,255,255,0.1)',
  textPrimary: '#eeeef8', textSecondary: 'rgba(255,255,255,0.55)', textMuted: 'var(--text-label)',
  accent: '#a855f7', accentDim: 'rgba(168,85,247,0.15)', accentDim2: 'rgba(168,85,247,0.08)',
  inputBg: 'rgba(0,0,0,0.3)', inputBorder: 'rgba(255,255,255,0.07)', inputFocusBorder: '#a855f755',
  coverBg: '#0a0a14', spinnerTrack: 'var(--bg-hover)',
};

export const FolderCoverModal: React.FC<Props> = ({ folderName, folderPath, onClose, onSaved }) => {
  const [tab, setTab] = useState<Tab>('album');
  const [albumResults, setAlbumResults] = useState<AlbumResult[]>([]);
  const [artistResults, setArtistResults] = useState<ArtistResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedUrl, setSelectedUrl] = useState<string | null>(null);
  const [query, setQuery] = useState(folderName);
  const [brokenImgs, setBrokenImgs] = useState<Set<string>>(new Set());
  const gridRef = useRef<HTMLDivElement>(null);
  const doSearchRef = useRef<() => Promise<void>>(async () => {});

  const doSearch = useCallback(async () => {
    const q = query.trim();
    if (!q) { toast.error('Escribe un nombre para buscar'); return; }
    setSearching(true); setSelectedUrl(null); setBrokenImgs(new Set());
    try {
      if (tab === 'album') {
        const r = await invoke<AlbumResult[]>('fetch_folder_cover', { folderName: q });
        setAlbumResults(r);
        if (r.length === 0) toast.error('Sin resultados');
        else toast.success(`${r.length} portadas encontradas`);
      } else {
        const r = await invoke<ArtistResult[]>('fetch_artist_cover', { artistName: q });
        setArtistResults(r);
        if (r.length === 0) toast.error('Sin resultados');
        else toast.success(`${r.length} imágenes encontradas`);
      }
    } catch (e: unknown) { toast.error(`Error: ${e instanceof Error ? e.message : 'desconocido'}`); }
    finally { setSearching(false); }
  }, [query, tab]);

  doSearchRef.current = doSearch;
  useEffect(() => { doSearchRef.current(); }, []);

  const save = async () => {
    if (!selectedUrl) { toast.error('Selecciona una portada primero'); return; }
    setSaving(true);
    try {
      const r = await invoke<string | null>('save_folder_cover', { folderPath, imageUrl: selectedUrl });
      if (r) { toast.success('Portada guardada'); onSaved(); }
      else toast.error('Error al guardar la imagen');
    } catch (e: unknown) { toast.error(`Error: ${e instanceof Error ? e.message : 'desconocido'}`); }
    finally { setSaving(false); }
  };

  const markBroken = (url: string) => setBrokenImgs(p => new Set(p).add(url));

  const results = tab === 'album' ? albumResults : artistResults;
  const selectedItem = tab === 'album'
    ? albumResults.find(c => c.url === selectedUrl)
    : artistResults.find(c => c.url === selectedUrl);

  const containerStyle: React.CSSProperties = {
    width: '100%', maxWidth: 560, borderRadius: 18, background: T.containerBg,
    border: `1px solid ${T.containerBorder}`, boxShadow: T.containerShadow,
    display: 'flex', flexDirection: 'column', maxHeight: '85vh',
  };

  const inputBase: React.CSSProperties = {
    width: '100%', padding: '9px 14px', borderRadius: 8, fontSize: '0.82rem', outline: 'none',
    background: T.inputBg, border: `1px solid ${T.inputBorder}`, color: T.textPrimary, fontFamily: 'inherit',
    transition: 'border-color 0.15s',
  };

  const tabBtn = (id: Tab, label: string, icon: React.ComponentType<{ size?: number | string }>) => {
    const active = tab === id;
    return (
      <button onClick={() => { setTab(id); setSelectedUrl(null); if (id !== tab) setTimeout(doSearch, 0); }}
        style={{ flex: 1, padding: '8px 0', borderRadius: 7, border: 'none', cursor: 'pointer', fontSize: '0.72rem', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, background: active ? T.accent : T.surface, color: active ? '#fff' : T.textSecondary, transition: 'all 0.12s' }}>
        {React.createElement(icon, { size: 14 })}
        {label}
      </button>
    );
  };

  const modalContent = (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, background: T.overlay, backdropFilter: 'blur(8px)' }}
      onClick={onClose}>
      <motion.div initial={{ opacity: 0, scale: 0.96, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 10 }} transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        onClick={e => e.stopPropagation()} style={containerStyle}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: `1px solid ${T.borderMid}`, flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 34, height: 34, borderRadius: 8, background: T.accentDim, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <FolderOpen size={16} color={T.accent} />
            </div>
            <div>
              <span style={{ fontSize: '0.85rem', fontWeight: 700, color: T.textPrimary }}>Portada de carpeta</span>
              <span style={{ fontSize: '0.62rem', color: T.textMuted, display: 'block', marginTop: 1, maxWidth: 240, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{folderName}</span>
            </div>
          </div>
          <button onClick={onClose} style={{ width: 30, height: 30, borderRadius: 7, border: 'none', background: 'transparent', color: T.textSecondary, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            onMouseEnter={e => { e.currentTarget.style.background = T.surfaceHover; e.currentTarget.style.color = '#f87171'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = T.textSecondary; }}>
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12, flex: 1, overflow: 'hidden' }}>
          {/* Tabs */}
          <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
            {tabBtn('album', 'Álbum', Disc3)}
            {tabBtn('artist', 'Artista', Users)}
          </div>

          {/* Search bar */}
          <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
            <div style={{ flex: 1, position: 'relative' }}>
              <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: T.textMuted, pointerEvents: 'none' }} />
              <input type="text" value={query} onChange={e => setQuery(e.target.value)}
                placeholder={tab === 'album' ? 'Buscar álbum...' : 'Buscar artista...'}
                style={{ ...inputBase, paddingLeft: 32 }}
                onFocus={e => e.currentTarget.style.borderColor = T.inputFocusBorder}
                onBlur={e => e.currentTarget.style.borderColor = T.inputBorder}
                onKeyDown={e => e.key === 'Enter' && doSearch()} />
            </div>
            <button onClick={doSearch} disabled={searching}
              style={{ padding: '9px 18px', borderRadius: 8, border: 'none', background: T.accent, color: '#fff', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 5, opacity: searching ? 0.6 : 1, transition: 'opacity 0.12s' }}>
              {searching ? <RefreshCw size={14} className="spin" /> : <Search size={14} />}
              Buscar
            </button>
          </div>

          {/* Results */}
          {searching ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 50, gap: 12, flex: 1 }}>
              <div style={{ width: 22, height: 22, borderRadius: '50%', border: `3px solid ${T.spinnerTrack}`, borderTopColor: T.accent, animation: 'spin 0.7s linear infinite' }} />
              <span style={{ fontSize: '0.72rem', color: T.textSecondary }}>Buscando imágenes...</span>
            </div>
          ) : results.length > 0 ? (
            <div ref={gridRef} style={{ overflowY: 'auto', flex: 1, minHeight: 0 }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                {results.map((c: AlbumResult | ArtistResult, i: number) => {
                  const active = selectedUrl === c.url;
                  const broken = brokenImgs.has(c.url);
                  return (
                    <button key={i} onClick={() => !broken && setSelectedUrl(c.url)}
                      disabled={broken}
                      style={{ aspectRatio: '1', borderRadius: 10, overflow: 'hidden', cursor: broken ? 'default' : 'pointer', padding: 0, border: active ? `2px solid ${T.accent}` : '2px solid transparent', background: T.coverBg, position: 'relative', transition: 'border-color 0.12s, opacity 0.12s', opacity: broken ? 0.5 : 1 }}>
                      {broken ? (
                        <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4, color: T.textMuted }}>
                          <AlertTriangle size={18} />
                          <span style={{ fontSize: '0.55rem' }}>Sin imagen</span>
                        </div>
                      ) : (
                        <img src={c.url} alt="" onError={() => markBroken(c.url)}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      )}
                      {/* Source badge */}
                      {!broken && (('source' in c && c.source) || (tab === 'album' && 'artist' in c && c.artist)) && (
                        <div style={{ position: 'absolute', bottom: 4, left: 4, right: 4, padding: '2px 5px', borderRadius: 4, background: 'rgba(0,0,0,0.7)', fontSize: '0.5rem', color: 'rgba(255,255,255,0.7)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textAlign: 'center' }}>
                          {'source' in c ? c.source : (tab === 'album' && 'artist' in c ? (c as AlbumResult).artist.substring(0, 30) : '')}
                        </div>
                      )}
                      {active && (
                        <div style={{ position: 'absolute', top: 5, right: 5, width: 20, height: 20, borderRadius: '50%', background: T.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.4)' }}>
                          <Check size={12} color="#fff" strokeWidth={3} />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 50, gap: 10, flex: 1 }}>
              <Image size={36} color={T.textMuted} opacity={0.3} />
              <span style={{ fontSize: '0.75rem', color: T.textSecondary }}>Escribe y presiona Buscar</span>
            </div>
          )}
        </div>

        {/* Preview + Save bar (sticky bottom) */}
        {selectedUrl && selectedItem && (
          <div style={{ flexShrink: 0, background: T.surface, borderTop: `1px solid ${T.borderMid}`, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 52, height: 52, borderRadius: 8, overflow: 'hidden', flexShrink: 0, background: T.coverBg }}>
              <img src={selectedUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 600, color: T.textPrimary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {tab === 'album' ? (selectedItem as AlbumResult).album || '(sin título)' : (selectedItem as ArtistResult).name}
              </div>
              <div style={{ fontSize: '0.62rem', color: T.textMuted }}>
                {tab === 'album' ? (selectedItem as AlbumResult).artist : ((selectedItem as ArtistResult).source || '')}
              </div>
            </div>
            <button onClick={save} disabled={saving}
              style={{ padding: '8px 18px', borderRadius: 8, border: 'none', background: T.accent, color: '#fff', cursor: 'pointer', fontSize: '0.72rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6, opacity: saving ? 0.6 : 1, transition: 'opacity 0.12s', flexShrink: 0 }}>
              {saving ? <RefreshCw size={13} className="spin" /> : <Download size={13} />}
              {saving ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        )}
      </motion.div>
    </motion.div>
  );

  return createPortal(modalContent, document.body);
};