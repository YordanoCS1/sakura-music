import { useMemo } from 'react';
import {
  Sparkles,
  Library,
  ListMusic,
  BarChart3,
  Search,
  DownloadCloud,
  Settings,
  Disc3,
  Cpu,
  ShieldCheck,
  ArrowRight,
  Waves,
} from 'lucide-react';
import type { AppTab } from '../types';

interface HomeTabProps {
  trackCount: number;
  onNavigate: (tab: AppTab) => void;
}

const FEATURES = [
  {
    icon: Waves,
    title: 'Sonido sin pérdida',
    desc: 'Reproducción Hi-Res de FLAC, ALAC y más, con motores de audio nativos.',
    tone: 'violet',
  },
  {
    icon: Disc3,
    title: 'Editor de metadatos Pro',
    desc: 'Corrige títulos, artistas, carátulas y tags con búsqueda online integrada.',
    tone: 'fuchsia',
  },
  {
    icon: Library,
    title: 'Biblioteca inteligente',
    desc: 'Organiza tu colección por álbumes, carpetas y vistas visuales únicas.',
    tone: 'indigo',
  },
  {
    icon: Search,
    title: 'Catálogo online',
    desc: 'Busca carátulas y metadatos en iTunes, Deezer y MusicBrainz.',
    tone: 'cyan',
  },
  {
    icon: DownloadCloud,
    title: 'Descargas integradas',
    desc: 'Trae música nueva a tu biblioteca con gestión de cola y progreso.',
    tone: 'teal',
  },
  {
    icon: Cpu,
    title: 'Motor nativo Rust',
    desc: 'Escaneo multihilo y caché local para una experiencia rápida y ligera.',
    tone: 'emerald',
  },
];

const NAV = [
  { id: 'library' as AppTab, label: 'Biblioteca', desc: 'Tu colección', icon: Library },
  { id: 'search' as AppTab, label: 'Buscar', desc: 'Catálogo online', icon: Search },
  { id: 'queue' as AppTab, label: 'Cola', desc: 'Descargas', icon: DownloadCloud },
  { id: 'playlists' as AppTab, label: 'Listas', desc: 'Tus selecciones', icon: ListMusic },
  { id: 'stats' as AppTab, label: 'Datos', desc: 'Tu biblioteca en números', icon: BarChart3 },
  { id: 'settings' as AppTab, label: 'Ajustes', desc: 'Preferencias', icon: Settings },
];

export default function HomeTab({ trackCount, onNavigate }: HomeTabProps) {
  const greeting = useMemo(() => {
    const h = new Date().getHours();
    if (h < 12) return 'Buenos días';
    if (h < 20) return 'Buenas tardes';
    return 'Buenas noches';
  }, []);

  return (
    <div className="wb-root mb-28">
      {/* ═══ HERO DE BIENVENIDA ═══ */}
      <div className="wb-hero">
        <div className="wb-hero-glow" />
        <span className="wb-orb wb-orb-1" />
        <span className="wb-orb wb-orb-2" />
        <span className="wb-orb wb-orb-3" />

        <div className="wb-hero-content">
          <div className="wb-logo">
            <span>桜</span>
          </div>
          <div className="wb-badge">
            <Sparkles className="w-3 h-3" /> BIENVENIDO
          </div>
          <h1 className="wb-title">{greeting}</h1>
          <p className="wb-subtitle">
            Este es tu espacio musical. Una app de escritorio rápida, privada y hecha para tu
            colección.
          </p>
          <div className="wb-hero-actions">
            <button onClick={() => onNavigate('library')} className="wb-primary">
              Entrar a la biblioteca <ArrowRight className="w-4 h-4" />
            </button>
            <button onClick={() => onNavigate('search')} className="wb-secondary">
              <Search className="w-4 h-4" /> Explorar catálogo
            </button>
          </div>
        </div>

        <div className="wb-stats-float">
          <span className="wb-stat-f">
            <strong>{trackCount}</strong> pistas en tu biblioteca
          </span>
          <span className="wb-divider" />
          <span className="wb-stat-f">
            <ShieldCheck className="w-3.5 h-3.5" /> 100% local y privado
          </span>
        </div>
      </div>

      {/* ═══ CARACTERÍSTICAS ═══ */}
      <div className="wb-section">
        <div className="wb-section-head">
          <div>
            <h2>Todo lo que Sakura Music hace por ti</h2>
            <p>Una experiencia completa, impulsada por tecnología nativa.</p>
          </div>
        </div>
        <div className="wb-features">
          {FEATURES.map(({ icon: Icon, title, desc, tone }) => (
            <div key={title} className={`wb-feature wb-feature-${tone}`}>
              <span className="wb-feature-icon">
                <Icon className="w-5 h-5" />
              </span>
              <h3>{title}</h3>
              <p>{desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ═══ ACCESOS RÁPIDOS ═══ */}
      <div className="wb-section">
        <div className="wb-section-head">
          <div>
            <h2>¿A dónde quieres ir?</h2>
            <p>Accede directo a cada sección.</p>
          </div>
        </div>
        <div className="wb-nav">
          {NAV.map(({ id, label, desc, icon: Icon }) => (
            <button key={id} onClick={() => onNavigate(id)} className="wb-nav-card">
              <span className="wb-nav-icon">
                <Icon className="w-5 h-5" />
              </span>
              <span className="wb-nav-copy">
                <strong>{label}</strong>
                <small>{desc}</small>
              </span>
              <ArrowRight className="w-4 h-4 wb-nav-arrow" />
            </button>
          ))}
        </div>
      </div>

      {/* ═══ PIE ═══ */}
      <div className="wb-footer">
        <span className="wb-footer-logo">桜</span>
        <div>
          <strong>Sakura Music</strong>
          <p>Hecho para los que aman su música. Rápido, privado y tuyo.</p>
        </div>
        <span className="wb-version">v2.0</span>
      </div>
    </div>
  );
}
