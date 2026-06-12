import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Download, Cookie, Palette, Save, Music, Wrench, RefreshCw, Check, Sliders, Paintbrush, Sparkles, Droplets, Zap, Moon, Sun, LayoutGrid, List, Columns3, GalleryVertical, Disc3, Terminal, Waves, Leaf, Crown, BookOpen, CircleDot, Diamond, Keyboard, Volume2, Trash2 } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { openFolder, musicDir, invoke, confirm } from '../bridge';
import toast from 'react-hot-toast';
import type { LibraryLayout } from '../components/library/LayoutTypes';
import { LAYOUT_NAMES } from '../components/library/LayoutTypes';

const itemAnim = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } };

export const SettingsPage: React.FC = () => {
  const [downloadPath, setDownloadPath] = useState('');
  const [libraryPath, setLibraryPath] = useState('');
  const [defaultFormat, setDefaultFormat] = useState('mp3');
  const [defaultQuality, setDefaultQuality] = useState('audio_mp3_320');
  const [organizeAutomatically, setOrganizeAutomatically] = useState(true);
  const [cookieBrowser, setCookieBrowser] = useState('none');
  const [currentTheme, setCurrentTheme] = useState('sakura');
  const [libraryLayout, setLibraryLayout] = useState<LibraryLayout>(() => (localStorage.getItem('library_layout') as LibraryLayout) || 'glass');
  const [particlesEnabled, setParticlesEnabled] = useState(() => localStorage.getItem('particles') !== 'false');
  const [initialVolume, setInitialVolume] = useState(() => parseInt(localStorage.getItem('volume') || '70'));
  const [toolVersions, setToolVersions] = useState<{ yt_dlp: string | null; ffmpeg: string | null }>({ yt_dlp: null, ffmpeg: null });
  const [updating, setUpdating] = useState<string | null>(null);

  const normalizeQuality = (q: string, fmt: string): string => {
    const legacyVideo: Record<string, string> = { '4K': 'video_2160', '1080p': 'video_1080', '720p': 'video_720' };
    const legacyAudio: Record<string, string> = { '320': 'audio_mp3_320', '256': 'audio_mp3_320', '192': 'audio_mp3_128' };
    if (fmt === 'video') return legacyVideo[q] || q;
    return legacyAudio[q] || q;
  };

  useEffect(() => {
    const saved = localStorage.getItem('downloadPath') || `${musicDir}\\Sakura Music`;
    setDownloadPath(saved);
    setLibraryPath(localStorage.getItem('libraryPath') || saved);
    const storedFormat = localStorage.getItem('defaultFormat') || 'mp3';
    setDefaultFormat(storedFormat);
    setDefaultQuality(normalizeQuality(localStorage.getItem('defaultQuality') || 'audio_mp3_320', storedFormat));
    setOrganizeAutomatically(localStorage.getItem('organizeAutomatically') !== 'false');
    setCookieBrowser(localStorage.getItem('cookieBrowser') || 'none');
    setCurrentTheme(localStorage.getItem('theme') || 'sakura');
    setLibraryLayout((localStorage.getItem('library_layout') as LibraryLayout) || 'glass');
    loadToolVersions();
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', currentTheme);
  }, [currentTheme]);

  useEffect(() => {
    localStorage.setItem('library_layout', libraryLayout);
  }, [libraryLayout]);

  const loadToolVersions = async () => { try { setToolVersions(await invoke('get_tool_versions')); } catch {} };
  const handleUpdate = async (tool: string) => { setUpdating(tool); try { await invoke('update_tool', { tool }); await loadToolVersions(); toast.success(`${tool} actualizado`); } catch (e: unknown) { toast.error(`Error: ${e instanceof Error ? e.message : 'desconocido'}`); } finally { setUpdating(null); } };

  const allThemes = [
    { id: 'sakura', name: 'Sakura', icon: Flower2, color: '#cc1a4a', desc: 'Magenta vibrante con sidebar flotante' },
    { id: 'city-pop', name: 'City Pop', icon: Sun, color: '#F95738', desc: 'Retro ochentero con rejilla y neón' },
    { id: 'tokyo-neon', name: 'Tokyo Neón', icon: Zap, color: '#FF1493', desc: 'Shibuya nocturno con neón rosa y cian' },
    { id: 'wabi-sabi', name: 'Wabi-Sabi', icon: Leaf, color: '#C23B22', desc: 'Estética japonesa tierra, papel y tinta' },
    { id: 'vaporwave', name: 'Vaporwave', icon: Disc3, color: '#FF6B9D', desc: 'Purpura neón con scanlines y rejilla retro' },
    { id: 'anime-op', name: 'Anime OP', icon: Sparkles, color: '#1E90FF', desc: 'Apertura anime brillante con líneas de acción' },
    { id: 'yokai', name: 'Yōkai', icon: Moon, color: '#c0392b', desc: 'Folclore nocturno con linternas rojas' },
    { id: 'ciudad-prohibida', name: 'Ciudad Prohibida', icon: Crown, color: '#c0392b', desc: 'Palacio imperial chino con rojo y oro' },
    { id: 'erudito', name: 'Erudito', icon: BookOpen, color: '#1a1a1a', desc: 'Caligrafía china con tinta y bambú' },
    { id: 'porcelana', name: 'Porcelana Azul', icon: CircleDot, color: '#2a6a9a', desc: 'Cerámica Ming azul y blanca' },
    { id: 'dragon', name: 'Dragón Celestial', icon: Diamond, color: '#2a8a5a', desc: 'Dragón chino con jade y oro' },
    { id: 'festival', name: 'Festival', icon: Sparkles, color: '#d4a017', desc: 'Festival de linternas con rojo y dorado' },
    { id: 'jade', name: 'Jade', icon: CircleDot, color: '#2d5a3a', desc: 'Jade verde tallado con adornos dorados' },
    { id: 'bambu', name: 'Bambú', icon: Leaf, color: '#4a7c59', desc: 'Bosque de bambú verde y sereno' },
    { id: 'atardecer', name: 'Atardecer', icon: Sun, color: '#e86a33', desc: 'Cielo naranja al atardecer' },
    { id: 'hielo', name: 'Hielo', icon: Droplets, color: '#5bc0de', desc: 'Azul hielo frío y cristalino' },
  ];

  const saveSettings = () => {
    localStorage.setItem('downloadPath', downloadPath);
    localStorage.setItem('libraryPath', libraryPath);
    localStorage.setItem('defaultFormat', defaultFormat);
    localStorage.setItem('defaultQuality', defaultQuality);
    localStorage.setItem('organizeAutomatically', String(organizeAutomatically));
    localStorage.setItem('cookieBrowser', cookieBrowser);
    localStorage.setItem('theme', currentTheme);
    document.documentElement.setAttribute('data-theme', currentTheme);
    localStorage.setItem('library_layout', libraryLayout);
    localStorage.setItem('particles', String(particlesEnabled));
    document.documentElement.style.setProperty('--decorative-visible', particlesEnabled ? '1' : '0');
    localStorage.setItem('volume', String(initialVolume));
    toast.success('Configuración guardada');
  };

  const section = (icon: LucideIcon, title: string, desc: string, content: React.ReactNode) => (
    <motion.div variants={itemAnim} style={{ background: 'var(--bg-card)', border: 'var(--border-card)', borderRadius: 12, padding: 18 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
        <div style={{ width: 28, height: 28, borderRadius: 8, background: 'var(--bg-accent-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {React.createElement(icon, { size: 14, color: 'oklch(var(--zen-sakura-base))' })}
        </div>
        <div>
          <h3 className="text-sm font-semibold" style={{ color: 'var(--text-heading)' }}>{title}</h3>
          <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{desc}</p>
        </div>
      </div>
      {content}
    </motion.div>
  );

  const btn = (label: string, onClick: () => void, color: string = 'rgba(255,255,255,0.04)') => (
    <button onClick={onClick} style={{ padding: '6px 14px', borderRadius: 7, border: `1px solid rgba(255,255,255,0.06)`, background: 'transparent', color, fontSize: '0.72rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.12s', whiteSpace: 'nowrap' }}
      onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-hover)'; e.currentTarget.style.color = 'var(--text-body)'; }}
      onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = color; }}>
      {label}
    </button>
  );

  const input = (val: string, readonly: boolean = true) => (
    <input type="text" value={val} readOnly={readonly}
      style={{ width: '100%', padding: '8px 12px', borderRadius: 8, fontSize: '0.78rem', outline: 'none', background: 'var(--bg-input)', border: 'var(--border-input)', color: 'var(--text-input)', fontFamily: 'monospace' }} />
  );

  const checkbox = (checked: boolean, onChange: (v: boolean) => void) => (
    <div onClick={() => onChange(!checked)} style={{ width: 18, height: 18, borderRadius: 5, border: `1.5px solid ${checked ? 'oklch(var(--zen-sakura-base))' : 'rgba(255,255,255,0.1)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', background: checked ? 'oklch(var(--zen-sakura-base))' : 'transparent', cursor: 'pointer', transition: 'all 0.12s', flexShrink: 0 }}>
      {checked && <Check size={11} strokeWidth={3} color="white" />}
    </div>
  );

  return (
    <motion.div initial="hidden" animate="show" variants={{ hidden: {}, show: { transition: { staggerChildren: 0.04 } } }} className="space-y-4 max-w-2xl">
      <motion.div variants={itemAnim}>
        <h1 className="text-xl font-bold" style={{ color: 'var(--text-heading)' }}>Ajustes</h1>
        <p className="text-xs mt-0.5" style={{ color: 'var(--text-label)' }}>Configura tu experiencia en Sakura Music</p>
      </motion.div>

      {section(Download, 'Descargas', 'Carpeta de destino y formato preferido',
        <div className="space-y-3">
          <div><label className="text-xs mb-1.5 block" style={{ color: 'var(--text-label)' }}>Carpeta de descarga</label>
            <div className="flex gap-2">{input(downloadPath)}{btn('Cambiar', async () => { const f = await openFolder(); if (f) setDownloadPath(f); })}</div></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-xs mb-1.5 block" style={{ color: 'var(--text-label)' }}>Formato</label>
              <select value={defaultFormat} onChange={e => { const f = e.target.value; setDefaultFormat(f); setDefaultQuality(f === 'video' ? 'video_1080' : 'audio_mp3_320'); }}
                style={{ width: '100%', padding: '7px 10px', borderRadius: 7, fontSize: '0.78rem', outline: 'none', background: 'var(--bg-input)', border: 'var(--border-input)', color: 'var(--text-input)' }}>
                <option value="mp3">MP3</option><option value="m4a">M4A</option><option value="video">Video</option>
              </select></div>
            <div><label className="text-xs mb-1.5 block" style={{ color: 'var(--text-label)' }}>Calidad</label>
              <select value={defaultQuality} onChange={e => setDefaultQuality(e.target.value)}
                style={{ width: '100%', padding: '7px 10px', borderRadius: 7, fontSize: '0.78rem', outline: 'none', background: 'var(--bg-input)', border: 'var(--border-input)', color: 'var(--text-input)' }}>
                {defaultFormat === 'video'
                  ? <><option value="video_2160">4K (2160p)</option><option value="video_1080">Full HD (1080p)</option><option value="video_720">HD (720p)</option></>
                  : <><option value="audio_mp3_320">MP3 320 kbps</option><option value="audio_m4a">M4A Original</option><option value="audio_mp3_128">MP3 128 kbps</option></>}
              </select></div>
          </div>
          <div className="flex items-center gap-2.5">
            {checkbox(organizeAutomatically, setOrganizeAutomatically)}
            <span className="text-xs" style={{ color: 'var(--text-label)' }}>Organizar en carpetas Artista/Álbum</span>
          </div>
        </div>
      )}

      {section(Music, 'Biblioteca', 'Carpeta raíz para explorar tu música',
        <div><label className="text-xs mb-1.5 block" style={{ color: 'var(--text-label)' }}>Carpeta de biblioteca</label>
          <div className="flex gap-2">{input(libraryPath)}{btn('Cambiar', async () => { const f = await openFolder(); if (f) setLibraryPath(f); })}</div></div>
      )}

      {section(Cookie, 'Cookies', 'Para videos con restricción de edad',
        <div>
          <select value={cookieBrowser} onChange={e => { setCookieBrowser(e.target.value); localStorage.setItem('cookieBrowser', e.target.value); }}
            style={{ width: '100%', maxWidth: 200, padding: '7px 10px', borderRadius: 7, fontSize: '0.78rem', outline: 'none', background: 'var(--bg-input)', border: 'var(--border-input)', color: 'var(--text-input)' }}>
            <option value="none">Ninguno</option><option value="chrome">Chrome</option><option value="firefox">Firefox</option>
            <option value="edge">Edge</option><option value="brave">Brave</option><option value="opera">Opera</option><option value="safari">Safari</option>
          </select>
          <p className="text-[10px] mt-2" style={{ color: 'var(--text-muted)', lineHeight: 1.5 }}>Cierra el navegador antes de analizar un video. Asegúrate de haber iniciado sesión en YouTube.</p>
        </div>
      )}

      {section(Wrench, 'Herramientas', 'Actualiza yt-dlp y ffmpeg',
        <div className="space-y-2">
          {['yt-dlp', 'ffmpeg'].map(tool => (
            <div key={tool} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', borderRadius: 8, background: 'var(--bg-input)', border: 'var(--border-subtle)' }}>
              <div><p className="text-xs font-medium" style={{ color: 'var(--text-body)' }}>{tool}</p><p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{toolVersions[tool as keyof typeof toolVersions] || 'No instalado'}</p></div>
              <button onClick={() => handleUpdate(tool)} disabled={updating === tool}
                style={{ padding: '5px 12px', borderRadius: 6, border: 'none', background: updating === tool ? 'var(--bg-accent-active)' : 'var(--bg-hover)', color: 'oklch(var(--zen-sakura-base))', fontSize: '0.7rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, transition: 'all 0.12s' }}>
                {updating === tool ? <RefreshCw size={11} className="spin" /> : <RefreshCw size={11} />} Actualizar
              </button>
            </div>
          ))}
        </div>
      )}

      {section(Palette, 'Apariencia', 'Tema visual de la aplicación',
        <div className="space-y-4">
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5 max-w-[600px]">
            {allThemes.map(t => {
              const active = currentTheme === t.id;
              return (
                <button key={t.id} onClick={() => setCurrentTheme(t.id)}
                  style={{ padding: '10px 6px', borderRadius: 8, border: active ? '1.5px solid oklch(var(--zen-sakura-base))' : 'var(--border-card)', background: active ? 'var(--bg-accent-active)' : 'transparent', cursor: 'pointer', textAlign: 'center', transition: 'all 0.12s' }}>
                  <div style={{ width: 28, height: 28, borderRadius: '50%', background: active && t.id !== currentTheme ? 'oklch(var(--zen-sakura-base))' : t.color, margin: '0 auto 5px', border: active ? '2px solid oklch(var(--zen-sakura-base))' : '2px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {active && <Check size={12} strokeWidth={3} color="#F95738" />}
                  </div>
                  <span className="text-[10px] font-semibold block" style={{ color: 'var(--text-label)' }}>{t.name}</span>
                  <span className="text-[8px] block mt-0.5" style={{ color: 'var(--text-muted)' }}>{t.desc}</span>
                </button>
              );
            })}
          </div>
          <div className="flex items-center gap-3" style={{ padding: '8px 12px', borderRadius: 8, background: 'var(--bg-input)', border: 'var(--border-subtle)' }}>
            <Sparkles size={14} style={{ color: 'var(--text-icon)' }} />
            <span className="text-xs" style={{ color: 'var(--text-body)' }}>Partículas decorativas</span>
            <div onClick={() => setParticlesEnabled(!particlesEnabled)}
              style={{
                marginLeft: 'auto', width: 36, height: 20, borderRadius: 10,
                background: particlesEnabled ? 'oklch(var(--zen-sakura-base))' : 'rgba(255,255,255,0.08)',
                cursor: 'pointer', position: 'relative', transition: 'background 0.2s',
              }}>
              <div style={{
                width: 16, height: 16, borderRadius: '50%', background: 'white',
                position: 'absolute', top: 2, left: particlesEnabled ? 18 : 2,
                transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
              }} />
            </div>
          </div>
        </div>
      )}

      {section(LayoutGrid, 'Diseño de Biblioteca', 'Distribución visual del explorador de música',
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-w-[450px]">
          {(Object.entries(LAYOUT_NAMES) as [LibraryLayout, { name: string; desc: string }][]).map(([id, info]) => {
            const active = libraryLayout === id;
            const icons: Record<LibraryLayout, LucideIcon> = { glass: LayoutGrid, 'list-minimal': List, masonry: GalleryVertical, split: Columns3, carousel: Disc3, mosaic: LayoutGrid, feed: List, index: Disc3, frame: Disc3, citypop: Disc3, 'tokyo-neon': Zap, kawaii: Sparkles, 'visual-kei': Disc3, 'zen-garden': Waves, retrowave: Zap, 'anime-op': Sparkles, yokai: Moon, 'ciudad-prohibida': Crown, erudito: BookOpen, porcelana: CircleDot, dragon: Diamond, festival: Sparkles, jade: CircleDot, vinilo: Disc3, casete: Disc3, estudio: Sliders };
            const Icon = icons[id];
            return (
              <button key={id} onClick={() => setLibraryLayout(id)}
                style={{ padding: '12px 8px', borderRadius: 8, border: active ? '1.5px solid oklch(var(--zen-sakura-base))' : 'var(--border-card)', background: active ? 'var(--bg-accent-active)' : 'transparent', cursor: 'pointer', textAlign: 'center', transition: 'all 0.12s' }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: active ? 'oklch(var(--zen-sakura-base) / 0.15)' : 'var(--bg-hover)', margin: '0 auto 6px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon size={16} color={active ? 'oklch(var(--zen-sakura-base))' : 'var(--text-icon)'} />
                </div>
                <span className="text-[10px] font-semibold block" style={{ color: active ? 'var(--text-heading)' : 'var(--text-label)' }}>{info.name}</span>
                <span className="text-[8px] block mt-0.5" style={{ color: 'var(--text-muted)' }}>{info.desc}</span>
              </button>
            );
          })}
        </div>
      )}

      {section(Volume2, 'Reproductor', 'Volumen inicial del reproductor',
        <div>
          <label className="text-xs mb-1.5 block" style={{ color: 'var(--text-label)' }}>Volumen inicial: {initialVolume}%</label>
          <input type="range" min="0" max="100" value={initialVolume} onChange={e => setInitialVolume(parseInt(e.target.value))}
            style={{ width: '100%', accentColor: 'oklch(var(--zen-sakura-base))' }} />
        </div>
      )}

      {section(Keyboard, 'Atajos de teclado', 'Navegación rápida por la aplicación',
        <div className="space-y-1.5">
          {[
            ['Space', 'Reproducir / Pausar'],
            ['Ctrl + →', 'Canción siguiente'],
            ['Ctrl + ←', 'Canción anterior'],
            ['Ctrl + H', 'Ir a Inicio'],
            ['Ctrl + D', 'Ir a Descargar'],
            ['Ctrl + L', 'Ir a Biblioteca'],
            ['Ctrl + F', 'Ir a Explorar'],
            ['Ctrl + ,', 'Ir a Ajustes'],
            ['Ctrl + N', 'Siguiente página'],
            ['Ctrl + A', 'Seleccionar todos'],
            ['Escape', 'Limpiar selección'],
          ].map(([key, desc]) => (
            <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '6px 10px', borderRadius: 6, background: 'var(--bg-hover)' }}>
              <kbd style={{ padding: '2px 8px', borderRadius: 4, background: 'var(--bg-card)', border: 'var(--border-subtle)', fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-heading)', fontFamily: 'monospace', minWidth: 70, textAlign: 'center' }}>{key}</kbd>
              <span className="text-xs" style={{ color: 'var(--text-body)' }}>{desc}</span>
            </div>
          ))}
        </div>
      )}

      {section(Trash2, 'Avanzado', 'Restablecer configuración',
        <div>
          <p className="text-xs mb-3" style={{ color: 'var(--text-muted)' }}>Esto borrará todas tus preferencias (tema, diseño, descargas) y reiniciará la aplicación.</p>
          <button onClick={async () => { const ok = await confirm('¿Restablecer toda la configuración?'); if (!ok) return; localStorage.clear(); document.documentElement.setAttribute('data-theme', 'sakura'); toast.success('Configuración restablecida'); setTimeout(() => window.location.reload(), 800); }}
            style={{ padding: '8px 18px', borderRadius: 8, border: '1px solid rgba(239,68,68,0.3)', background: 'transparent', color: '#ef4444', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.12s' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.1)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}>
            <Trash2 size={13} style={{ marginRight: 6, verticalAlign: 'middle' }} /> Restablecer todo
          </button>
        </div>
      )}

      <motion.div variants={itemAnim} className="flex justify-end">
        <button onClick={saveSettings}
          style={{ padding: '9px 24px', borderRadius: 10, border: 'none', background: 'var(--accent-gradient)', color: 'white', fontSize: '0.82rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 7, cursor: 'pointer', transition: 'all 0.15s', boxShadow: 'var(--accent-glow-medium)' }}
          onMouseEnter={e => e.currentTarget.style.boxShadow = 'var(--accent-glow-strong)'}
          onMouseLeave={e => e.currentTarget.style.boxShadow = 'var(--accent-glow-medium)'}>
          <Save size={15} /> Guardar cambios
        </button>
      </motion.div>
    </motion.div>
  );
};

function Flower2(props: { size?: number; color?: string }) { return <svg xmlns="http://www.w3.org/2000/svg" width={props.size || 24} height={props.size || 24} viewBox="0 0 24 24" fill="none" stroke={props.color || 'currentColor'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 7.5a4.5 4.5 0 1 1 4.5 4.5"/><path d="M12 7.5a4.5 4.5 0 1 0-4.5 4.5"/><path d="M12 16.5a4.5 4.5 0 1 1-4.5-4.5"/><path d="M12 16.5a4.5 4.5 0 1 0 4.5-4.5"/><circle cx="12" cy="12" r="1.5"/></svg>; }
