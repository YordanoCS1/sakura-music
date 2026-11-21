import { useMemo } from 'react';
import { BarChart3, Clock3, Disc3, HardDrive, Mic2, Tag } from 'lucide-react';
import type { ScannedTrack, ThemeMode } from '../types';

interface StatsTabProps {
  theme: ThemeMode;
  tracks: ScannedTrack[];
  getCoverSrc: (cover: string | null) => string;
}

const GLIFOS: Partial<Record<ThemeMode, string>> = {
  sumie: '統',
  byobu: '計',
  shoji: '統',
  origami: '計',
  swiss: '▦',
  sumiink: '統',
  moonlit: '★',
  ledger: '帳',
  shonen: '⚡',
  ghost: '☷',
  samurai: '陣',
  kawaii: '♡',
  manga: '漫',
};

function agrupar(valores: string[]): { nombre: string; total: number }[] {
  const conteo = new Map<string, number>();
  for (const valor of valores) {
    if (!valor) continue;
    conteo.set(valor, (conteo.get(valor) ?? 0) + 1);
  }
  return [...conteo.entries()]
    .map(([nombre, total]) => ({ nombre, total }))
    .sort((a, b) => b.total - a.total);
}

/** Panel de estadísticas de la biblioteca con gráficos por tema. */
export default function StatsTab({ theme, tracks, getCoverSrc }: StatsTabProps) {
  const datos = useMemo(() => {
    const duracion = tracks.reduce((total, pista) => total + (pista.duration || 0), 0);
    const bytes = tracks.reduce((total, pista) => total + (pista.file_size || 0), 0);
    const horas = Math.floor(duracion / 3600);
    const minutos = Math.floor((duracion % 3600) / 60);
    const generos = agrupar(tracks.map((pista) => pista.genre?.trim() || 'Sin género'));
    const artistas = agrupar(tracks.map((pista) => pista.artist?.trim() || 'Desconocido'));
    const formatos = agrupar(tracks.map((pista) => pista.format || '?'));
    const decadasMap = new Map<string, number>();
    for (const pista of tracks) {
      if (!pista.year || pista.year < 1900) continue;
      const decada = `${Math.floor(pista.year / 10) * 10}s`;
      decadasMap.set(decada, (decadasMap.get(decada) ?? 0) + 1);
    }
    const decadas = [...decadasMap.entries()]
      .map(([nombre, total]) => ({ nombre, total }))
      .sort((a, b) => a.nombre.localeCompare(b.nombre));
    const conPortada = tracks.filter((pista) => pista.cover_url).length;
    return {
      horas,
      minutos,
      mb: (bytes / (1024 * 1024)).toFixed(1),
      generos: generos.slice(0, 7),
      artistas: artistas.slice(0, 6),
      formatos: formatos.slice(0, 6),
      decadas,
      conPortada,
      total: tracks.length,
    };
  }, [tracks]);

  const maximo = Math.max(
    1,
    ...datos.generos.map((g) => g.total),
    ...datos.artistas.map((a) => a.total),
  );
  const totalFormatos = Math.max(
    1,
    datos.formatos.reduce((sum, f) => sum + f.total, 0),
  );
  const colores = ['#d13f87', '#a8442f', '#8fb6e8', '#ffb800', '#67e8f9', '#c9a961'];
  let acumulado = 0;
  const conos = datos.formatos.map((formato, indice) => {
    const desde = (acumulado / totalFormatos) * 100;
    acumulado += formato.total;
    const hasta = (acumulado / totalFormatos) * 100;
    return `${colores[indice % colores.length]} ${desde}% ${hasta}%`;
  });

  return (
    <div className={`estadisticas tema-${theme}`}>
      <header className="estadisticas-cab">
        <span className="estadisticas-glifo" aria-hidden="true">
          {GLIFOS[theme] ?? '▦'}
        </span>
        <div>
          <small>CAPÍTULO · ESTADÍSTICAS</small>
          <h1>Su biblioteca en números</h1>
        </div>
        <span className="estadisticas-count">{datos.total} pistas analizadas</span>
      </header>

      <div className="estadisticas-kpis">
        <div className="estadisticas-kpi">
          <Clock3 className="w-4 h-4" />
          <strong>
            {datos.horas}h {datos.minutos}m
          </strong>
          <small>DURACIÓN TOTAL</small>
        </div>
        <div className="estadisticas-kpi">
          <Tag className="w-4 h-4" />
          <strong>{datos.generos.length}</strong>
          <small>GÉNEROS</small>
        </div>
        <div className="estadisticas-kpi">
          <Mic2 className="w-4 h-4" />
          <strong>{datos.artistas.length}</strong>
          <small>ARTISTAS</small>
        </div>
        <div className="estadisticas-kpi">
          <HardDrive className="w-4 h-4" />
          <strong>{datos.mb} MB</strong>
          <small>TAMAÑO</small>
        </div>
        <div className="estadisticas-kpi">
          <Disc3 className="w-4 h-4" />
          <strong>{Math.round((datos.conPortada / Math.max(1, datos.total)) * 100)}%</strong>
          <small>CON PORTADA</small>
        </div>
      </div>

      <div className="estadisticas-grid">
        <section className="estadisticas-panel">
          <h2>
            <BarChart3 className="w-4 h-4" /> Géneros
          </h2>
          <div className="estadisticas-barras">
            {datos.generos.map((genero, i) => (
              <div key={genero.nombre} className="estadisticas-barra">
                <span>{genero.nombre}</span>
                <i>
                  <b
                    style={{
                      width: `${(genero.total / maximo) * 100}%`,
                      background: colores[i % colores.length],
                    }}
                  />
                </i>
                <small>{genero.total}</small>
              </div>
            ))}
          </div>
        </section>

        <section className="estadisticas-panel">
          <h2>
            <Mic2 className="w-4 h-4" /> Artistas top
          </h2>
          <div className="estadisticas-artistas">
            {datos.artistas.map((artista, i) => (
              <div key={artista.nombre} className="estadisticas-artista">
                <span className="estadisticas-puesto">{String(i + 1).padStart(2, '0')}</span>
                <span className="estadisticas-nombre">{artista.nombre}</span>
                <i>
                  <b style={{ width: `${(artista.total / maximo) * 100}%` }} />
                </i>
                <small>{artista.total}</small>
              </div>
            ))}
          </div>
        </section>

        <section className="estadisticas-panel">
          <h2>
            <Disc3 className="w-4 h-4" /> Décadas
          </h2>
          <div className="estadisticas-decadas">
            {datos.decadas.length === 0 && (
              <p className="estadisticas-vacio">Sin años en la biblioteca.</p>
            )}
            {datos.decadas.map((decada) => (
              <div key={decada.nombre} className="estadisticas-decada">
                <i
                  style={{
                    height: `${(decada.total / Math.max(1, ...datos.decadas.map((d) => d.total))) * 100}%`,
                  }}
                />
                <small>{decada.nombre}</small>
                <span>{decada.total}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="estadisticas-panel">
          <h2>
            <BarChart3 className="w-4 h-4" /> Formatos
          </h2>
          <div className="estadisticas-formatos">
            <div
              className="estadisticas-donut"
              style={{ background: `conic-gradient(${conos.join(',')})` }}
            >
              <span>{datos.total}</span>
            </div>
            <ul>
              {datos.formatos.map((formato, i) => (
                <li key={formato.nombre}>
                  <i style={{ background: colores[i % colores.length] }} />
                  {formato.nombre} <b>{formato.total}</b>
                </li>
              ))}
            </ul>
          </div>
        </section>
      </div>

      {datos.artistas.length > 0 && (
        <section className="estadisticas-panel estadisticas-tapas">
          <h2>
            <Disc3 className="w-4 h-4" /> Carátulas de los artistas top
          </h2>
          <div className="estadisticas-tapas-lista">
            {datos.artistas.slice(0, 5).map((artista) => {
              const pista = tracks.find((t) => t.artist === artista.nombre);
              return (
                <div key={artista.nombre} className="estadisticas-tapa-item">
                  {pista?.cover_url ? (
                    <img src={getCoverSrc(pista.cover_url)} alt="" />
                  ) : (
                    <span aria-hidden="true">♪</span>
                  )}
                  <small>{artista.nombre}</small>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
