import { useCallback, useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import {
  ArrowDown,
  ArrowUp,
  Check,
  ListMusic,
  Music2,
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import type { Playlist, PlaylistDetail, ScannedTrack, ThemeMode } from '../types';

interface PlaylistsPanelProps {
  theme: ThemeMode;
  tracks: ScannedTrack[];
  activeTrack: ScannedTrack | null;
  getCoverSrc: (cover: string | null) => string;
  onPlayTrack: (track: ScannedTrack) => void;
}

/** Listas persistentes en SQLite, con alta, renombre y orden manual. */
export default function PlaylistsPanel({
  theme,
  tracks,
  activeTrack,
  getCoverSrc,
  onPlayTrack,
}: PlaylistsPanelProps) {
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [seleccion, setSeleccion] = useState<string | null>(null);
  const [detalle, setDetalle] = useState<PlaylistDetail | null>(null);
  const [nombreNuevo, setNombreNuevo] = useState('');
  const [creando, setCreando] = useState(false);
  const [renombrando, setRenombrando] = useState(false);
  const [nombreEdit, setNombreEdit] = useState('');
  const [buscando, setBuscando] = useState(false);
  const [filtro, setFiltro] = useState('');
  const [elegidas, setElegidas] = useState<Set<string>>(new Set());
  const [estado, setEstado] = useState('');

  const cargar = useCallback(async () => {
    try {
      const listado = (await invoke<Playlist[]>('list_playlists')) ?? [];
      setPlaylists(listado);
      setSeleccion((actual) => actual ?? listado[0]?.id ?? null);
    } catch (error) {
      setEstado(`No se pudieron cargar las listas: ${String(error)}`);
    }
  }, []);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  useEffect(() => {
    if (!seleccion) {
      setDetalle(null);
      return;
    }
    let cancelada = false;
    invoke<PlaylistDetail>('get_playlist', { id: seleccion })
      .then((resultado) => {
        if (!cancelada) setDetalle(resultado ?? null);
      })
      .catch((error) => {
        if (!cancelada) setEstado(`No se pudo abrir la lista: ${String(error)}`);
      });
    return () => {
      cancelada = true;
    };
  }, [seleccion, playlists]);

  const crear = async () => {
    const nombre = nombreNuevo.trim();
    if (!nombre) return;
    try {
      const creada = await invoke<Playlist>('create_playlist', { name: nombre });
      setCreando(false);
      setNombreNuevo('');
      setSeleccion(creada.id);
      await cargar();
    } catch (error) {
      setEstado(String(error));
    }
  };

  const renombrar = async () => {
    if (!seleccion || !nombreEdit.trim()) return;
    try {
      await invoke('rename_playlist', { id: seleccion, name: nombreEdit.trim() });
      setRenombrando(false);
      await cargar();
    } catch (error) {
      setEstado(String(error));
    }
  };

  const borrar = async () => {
    if (!seleccion) return;
    try {
      await invoke('delete_playlist', { id: seleccion });
      setSeleccion(null);
      setDetalle(null);
      await cargar();
    } catch (error) {
      setEstado(String(error));
    }
  };

  const agregar = async () => {
    if (!seleccion || elegidas.size === 0) return;
    try {
      const cantidad = await invoke<number>('playlist_add_tracks', {
        id: seleccion,
        paths: [...elegidas],
      });
      setBuscando(false);
      setElegidas(new Set());
      setFiltro('');
      setEstado(`${cantidad} ${cantidad === 1 ? 'pista agregada' : 'pistas agregadas'}.`);
      void cargar();
    } catch (error) {
      setEstado(String(error));
    }
  };

  const mover = async (indice: number, delta: number) => {
    if (!detalle) return;
    const paths = detalle.tracks.map((pista) => pista.path);
    const destino = indice + delta;
    if (destino < 0 || destino >= paths.length) return;
    [paths[indice], paths[destino]] = [paths[destino]!, paths[indice]!];
    setDetalle({
      ...detalle,
      tracks: detalle.tracks.map((pista, i) =>
        i === indice ? detalle.tracks[destino]! : i === destino ? detalle.tracks[indice]! : pista,
      ),
    });
    try {
      await invoke('playlist_reorder', { id: seleccion, paths });
    } catch (error) {
      setEstado(String(error));
      void cargar();
    }
  };

  const candidatas = tracks.filter(
    (pista) =>
      !detalle?.tracks.some((actual) => actual.path === pista.path) &&
      (pista.title.toLowerCase().includes(filtro.toLowerCase()) ||
        pista.artist.toLowerCase().includes(filtro.toLowerCase())),
  );

  return (
    <div className={`playlists-panel tema-${theme}`}>
      <header className="playlists-cab">
        <span className="playlists-glifo" aria-hidden="true">
          <ListMusic className="w-5 h-5" />
        </span>
        <div>
          <h1>Playlists</h1>
          <p>{playlists.length} listas guardadas en tu biblioteca local</p>
        </div>
        <button type="button" className="playlists-nueva" onClick={() => setCreando(true)}>
          <Plus className="w-4 h-4" /> Nueva lista
        </button>
      </header>

      {estado && <p className="playlists-estado">{estado}</p>}

      <div className="playlists-cuerpo">
        <aside className="playlists-lista">
          {creando && (
            <div className="playlists-inline">
              <input
                autoFocus
                value={nombreNuevo}
                onChange={(e) => setNombreNuevo(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') void crear();
                  if (e.key === 'Escape') setCreando(false);
                }}
                placeholder="Nombre de la lista"
                aria-label="Nombre de la lista nueva"
              />
              <button type="button" onClick={() => void crear()} aria-label="Crear lista">
                <Check className="w-3.5 h-3.5" />
              </button>
              <button type="button" onClick={() => setCreando(false)} aria-label="Cancelar">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
          {playlists.length === 0 && !creando && (
            <p className="playlists-vacio">Todavía no tenés listas. Creá una para empezar.</p>
          )}
          {playlists.map((lista) => (
            <button
              key={lista.id}
              type="button"
              className={`playlists-item ${seleccion === lista.id ? 'is-active' : ''}`}
              onClick={() => setSeleccion(lista.id)}
            >
              <ListMusic className="w-3.5 h-3.5" aria-hidden="true" />
              <span>{lista.name}</span>
              <small>{lista.track_count}</small>
            </button>
          ))}
        </aside>

        <section className="playlists-detalle">
          {!detalle ? (
            <div className="playlists-sin-seleccion">
              <ListMusic className="w-10 h-10" />
              <p>Elegí una lista a la izquierda.</p>
            </div>
          ) : (
            <>
              <div className="playlists-detalle-head">
                {renombrando ? (
                  <div className="playlists-inline">
                    <input
                      autoFocus
                      value={nombreEdit}
                      onChange={(e) => setNombreEdit(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') void renombrar();
                        if (e.key === 'Escape') setRenombrando(false);
                      }}
                      aria-label="Nuevo nombre de la lista"
                    />
                    <button
                      type="button"
                      onClick={() => void renombrar()}
                      aria-label="Guardar nombre"
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <h2>{detalle.playlist.name}</h2>
                )}
                <div className="playlists-tools">
                  <button
                    type="button"
                    onClick={() => {
                      setNombreEdit(detalle.playlist.name);
                      setRenombrando(true);
                    }}
                    aria-label="Renombrar lista"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button type="button" onClick={() => void borrar()} aria-label="Borrar lista">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                  <button type="button" onClick={() => setBuscando((valor) => !valor)}>
                    <Plus className="w-3.5 h-3.5" /> Agregar pistas
                  </button>
                </div>
              </div>

              {buscando && (
                <div className="playlists-picker">
                  <label>
                    <Search className="w-3.5 h-3.5" />
                    <input
                      autoFocus
                      value={filtro}
                      onChange={(e) => setFiltro(e.target.value)}
                      placeholder="Buscar en la biblioteca…"
                      aria-label="Buscar pistas para agregar"
                    />
                  </label>
                  <div className="playlists-picker-list">
                    {candidatas.slice(0, 100).map((pista) => (
                      <button
                        key={pista.id}
                        type="button"
                        className={elegidas.has(pista.path) ? 'is-checked' : ''}
                        onClick={() =>
                          setElegidas((actual) => {
                            const siguiente = new Set(actual);
                            if (siguiente.has(pista.path)) siguiente.delete(pista.path);
                            else siguiente.add(pista.path);
                            return siguiente;
                          })
                        }
                      >
                        <span className="playlists-check">
                          {elegidas.has(pista.path) && <Check className="w-3 h-3" />}
                        </span>
                        <span>
                          <strong>{pista.title}</strong>
                          <small>{pista.artist}</small>
                        </span>
                      </button>
                    ))}
                  </div>
                  <button
                    type="button"
                    className="playlists-confirmar"
                    onClick={() => void agregar()}
                  >
                    Agregar {elegidas.size > 0 && `(${elegidas.size})`}
                  </button>
                </div>
              )}

              <div className="playlists-pistas">
                {detalle.tracks.length === 0 && (
                  <p className="playlists-vacio">Esta lista está vacía.</p>
                )}
                {detalle.tracks.map((pista, indice) => (
                  <div
                    key={pista.path}
                    className={`playlists-pista ${activeTrack?.id === pista.id ? 'is-active' : ''}`}
                  >
                    <span className="playlists-num">{String(indice + 1).padStart(2, '0')}</span>
                    <button
                      type="button"
                      className="playlists-portada"
                      onClick={() => onPlayTrack(pista)}
                      aria-label={`Reproducir ${pista.title}`}
                    >
                      {pista.cover_url ? (
                        <img src={getCoverSrc(pista.cover_url)} alt="" />
                      ) : (
                        <Music2 className="w-3.5 h-3.5" />
                      )}
                    </button>
                    <span className="playlists-copy">
                      <strong>{pista.title}</strong>
                      <small>
                        {pista.artist} · {pista.duration_str}
                      </small>
                    </span>
                    <button
                      type="button"
                      onClick={() => void mover(indice, -1)}
                      aria-label="Subir en la lista"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => void mover(indice, 1)}
                      aria-label="Bajar en la lista"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        await invoke('playlist_remove_track', { id: seleccion, path: pista.path });
                        void cargar();
                      }}
                      aria-label={`Quitar ${pista.title} de la lista`}
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
