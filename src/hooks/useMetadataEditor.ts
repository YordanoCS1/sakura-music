// Estado y lógica del editor de metadatos y su pestaña de catálogo:
// pre-llenado, reversión por campo, portada desde archivo o portapapeles,
// búsqueda en iTunes, Deezer y MusicBrainz, y guardado atómico.

import { useState } from 'react';
import { convertFileSrc, invoke } from '../lib/puente';
import { open } from '../lib/puente';
import type {
  CatalogAlbum,
  CatalogAlbumTrack,
  CatalogCandidate,
  CatalogSource,
  ScannedTrack,
} from '../types';

type EditField = 'title' | 'artist' | 'album' | 'album_artist' | 'track_number' | 'year' | 'genre';

interface UseMetadataEditorDeps {
  setTracks: React.Dispatch<React.SetStateAction<ScannedTrack[]>>;
  activeTrack: ScannedTrack | null;
  setActiveTrack: React.Dispatch<React.SetStateAction<ScannedTrack | null>>;
}

export function useMetadataEditor({
  setTracks,
  activeTrack,
  setActiveTrack,
}: UseMetadataEditorDeps) {
  const [editingTrack, setEditingTrack] = useState<ScannedTrack | null>(null);
  const [editTab, setEditTab] = useState<'tags' | 'catalog'>('tags');
  const [editTitle, setEditTitle] = useState('');
  const [editArtist, setEditArtist] = useState('');
  const [editAlbum, setEditAlbum] = useState('');
  const [editAlbumArtist, setEditAlbumArtist] = useState('');
  const [editTrackNumber, setEditTrackNumber] = useState('');
  const [editYear, setEditYear] = useState('');
  const [editGenre, setEditGenre] = useState('');
  const [editCoverPath, setEditCoverPath] = useState<string | null>(null);
  const [editCoverPreviewUrl, setEditCoverPreviewUrl] = useState<string | null>(null);
  const [removeCover, setRemoveCover] = useState(false);
  const [isSavingMetadata, setIsSavingMetadata] = useState(false);
  const [metadataFeedback, setMetadataFeedback] = useState<string | null>(null);

  // Catálogo en línea (Apple Music / iTunes / Deezer / MusicBrainz)
  const [catalogQuery, setCatalogQuery] = useState('');
  const [catalogSource, setCatalogSource] = useState<CatalogSource>('itunes');
  const [catalogMode, setCatalogMode] = useState<'songs' | 'albums'>('songs');
  const [catalogResults, setCatalogResults] = useState<CatalogCandidate[]>([]);
  const [isSearchingCatalog, setIsSearchingCatalog] = useState(false);
  const [catalogError, setCatalogError] = useState<string | null>(null);

  // Resultados de búsqueda por álbumes + álbum abierto
  const [catalogAlbums, setCatalogAlbums] = useState<CatalogAlbum[]>([]);
  const [openedAlbum, setOpenedAlbum] = useState<CatalogAlbum | null>(null);
  const [catalogAlbumTracks, setCatalogAlbumTracks] = useState<CatalogAlbumTrack[]>([]);
  const [isOpeningAlbum, setIsOpeningAlbum] = useState(false);
  // Enlace directo de álbum de iTunes/Apple Music (cuando no aparece en el buscador)
  const [albumLink, setAlbumLink] = useState('');
  // Enlace directo de canción: permite importar una pista concreta por su ID.
  const [songLink, setSongLink] = useState('');
  const [isOpeningSong, setIsOpeningSong] = useState(false);

  const openEditModal = (track: ScannedTrack, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setEditingTrack(track);
    setEditTab('tags');
    setEditTitle(track.title);
    setEditArtist(track.artist);
    setEditAlbum(track.album);
    setEditAlbumArtist(track.album_artist || track.artist);
    setEditTrackNumber(track.track_number ? track.track_number.toString() : '');
    setEditYear(track.year ? track.year.toString() : '');
    setEditGenre(track.genre || '');
    setEditCoverPath(null);
    setEditCoverPreviewUrl(null);
    setRemoveCover(false);
    setMetadataFeedback(null);

    // Sugerencia de búsqueda de catálogo basada en artista y título
    const cleanArtist =
      track.artist !== 'Artista Desconocido' && track.artist !== 'Desconocido' ? track.artist : '';
    const cleanTitle = track.title;
    const suggestedQuery = `${cleanArtist} ${cleanTitle}`.trim();
    setCatalogQuery(suggestedQuery);
    setCatalogResults([]);
    setCatalogError(null);
    setCatalogAlbums([]);
    setOpenedAlbum(null);
    setCatalogAlbumTracks([]);
    setAlbumLink('');
  };

  const resetField = (field: EditField) => {
    if (!editingTrack) return;
    switch (field) {
      case 'title':
        setEditTitle(editingTrack.title);
        break;
      case 'artist':
        setEditArtist(editingTrack.artist);
        break;
      case 'album':
        setEditAlbum(editingTrack.album);
        break;
      case 'album_artist':
        setEditAlbumArtist(editingTrack.album_artist || editingTrack.artist);
        break;
      case 'track_number':
        setEditTrackNumber(editingTrack.track_number ? editingTrack.track_number.toString() : '');
        break;
      case 'year':
        setEditYear(editingTrack.year ? editingTrack.year.toString() : '');
        break;
      case 'genre':
        setEditGenre(editingTrack.genre || '');
        break;
    }
  };

  const resetAllFields = () => {
    if (!editingTrack) return;
    setEditTitle(editingTrack.title);
    setEditArtist(editingTrack.artist);
    setEditAlbum(editingTrack.album);
    setEditAlbumArtist(editingTrack.album_artist || editingTrack.artist);
    setEditTrackNumber(editingTrack.track_number ? editingTrack.track_number.toString() : '');
    setEditYear(editingTrack.year ? editingTrack.year.toString() : '');
    setEditGenre(editingTrack.genre || '');
    setEditCoverPath(null);
    setEditCoverPreviewUrl(null);
    setRemoveCover(false);
  };

  const pickNewCoverImage = async () => {
    try {
      const selected = await open({
        multiple: false,
        filters: [
          {
            name: 'Imágenes',
            extensions: ['jpg', 'jpeg', 'png', 'webp'],
          },
        ],
      });
      if (selected && typeof selected === 'string') {
        setEditCoverPath(selected);
        setEditCoverPreviewUrl(convertFileSrc(selected));
        setRemoveCover(false);
      }
    } catch (e) {
      console.error('Error al seleccionar imagen:', e);
    }
  };

  // Descargar la portada remota y guardarla en archivo temporal en Rust.
  const downloadCover = async (coverUrl: string) => {
    try {
      setEditCoverPreviewUrl(coverUrl);
      const res = await fetch(coverUrl);
      const buffer = await res.arrayBuffer();
      const bytes = Array.from(new Uint8Array(buffer));
      const tempPath = await invoke<string>('save_temp_cover', { bytes });
      setEditCoverPath(tempPath);
      setRemoveCover(false);
    } catch (err) {
      console.warn('No se pudo descargar la portada HD del catálogo:', err);
    }
  };

  // ── Búsqueda por CANCIONES ─────────────────────────────────────────────
  const searchCatalogSongs = async (q: string) => {
    // Se delega en Rust: Deezer no expone CORS y MusicBrainz exige User-Agent.
    const candidates: CatalogCandidate[] = await invoke('search_catalog_songs', {
      source: catalogSource,
      query: q,
    });
    setCatalogResults(candidates);
    if (candidates.length === 0) {
      const names: Record<string, string> = {
        itunes: 'Apple Music / iTunes',
        deezer: 'Deezer',
        musicbrainz: 'MusicBrainz',
      };
      setCatalogError(
        `No se encontraron coincidencias en ${names[catalogSource] || catalogSource}.`,
      );
    }
  };

  // ── Búsqueda por ÁLBUMES ───────────────────────────────────────────────
  const searchCatalogAlbums = async (q: string) => {
    // Se delega en Rust: Deezer no expone CORS y MusicBrainz exige User-Agent.
    const albums: CatalogAlbum[] = await invoke('search_catalog_albums', {
      source: catalogSource,
      query: q,
    });
    setCatalogAlbums(albums);
    if (albums.length === 0) {
      const names: Record<string, string> = {
        itunes: 'Apple Music / iTunes',
        deezer: 'Deezer',
        musicbrainz: 'MusicBrainz',
      };
      setCatalogError(`No se encontraron álbumes en ${names[catalogSource] || catalogSource}.`);
    }
  };

  // Buscar en el catálogo público según la pestaña activa (Canciones / Álbumes)
  const searchCatalog = async (customQuery?: string) => {
    const q = (customQuery !== undefined ? customQuery : catalogQuery).trim();
    if (!q) return;
    setIsSearchingCatalog(true);
    setCatalogError(null);
    setOpenedAlbum(null);
    setAlbumLink('');
    setCatalogAlbumTracks([]);
    try {
      if (catalogMode === 'albums') {
        await searchCatalogAlbums(q);
        setCatalogResults([]);
      } else {
        await searchCatalogSongs(q);
        setCatalogAlbums([]);
      }
    } catch (err) {
      console.error('Error al buscar en catálogo:', err);
      setCatalogError(`Error al conectar con el catálogo: ${String(err)}`);
    } finally {
      setIsSearchingCatalog(false);
    }
  };

  // Abrir un álbum y cargar sus pistas según la plataforma (en Rust).
  const openAlbum = async (album: CatalogAlbum) => {
    setOpenedAlbum(album);
    setIsOpeningAlbum(true);
    setCatalogAlbumTracks([]);
    setCatalogError(null);
    try {
      // Cuando se abre desde el buscador no hay enlace: country vacío.
      const tracks: CatalogAlbumTrack[] = await invoke('open_catalog_album', {
        source: album.source,
        id: album.id,
        country: '',
      });
      setCatalogAlbumTracks(tracks);
      if (tracks.length === 0) {
        setCatalogError(`El álbum «${album.title}» no tiene pistas disponibles.`);
      }
    } catch (err) {
      console.error('Error al abrir álbum:', err);
      setCatalogError(`Error al cargar las pistas del álbum: ${String(err)}`);
      setOpenedAlbum(null);
    } finally {
      setIsOpeningAlbum(false);
    }
  };

  // Cargar un álbum de iTunes/Apple Music a partir de su enlace cuando
  // no aparece en el buscador. Extrae el collectionId y el storefront (país)
  // de la URL; el storefront es clave para EPs/singles que no existen en USA.
  const openAlbumByLink = async (link: string) => {
    const trimmed = link.trim();
    if (!trimmed) {
      setCatalogError('Pegue primero el enlace del álbum de iTunes/Apple Music.');
      return;
    }
    // storefront: /music.apple.com/<cc>/album/...  o  /itunes.apple.com/<cc>/album/...
    const ccMatch =
      trimmed.match(/\/music\.apple\.com\/([a-z]{2})\//i) ||
      trimmed.match(/\/itunes\.apple\.com\/([a-z]{2})\//i);
    const country = ccMatch ? ccMatch[1].toLowerCase() : 'us';
    const idMatch = trimmed.match(/\/(\d{8,15})\/?$/);
    const collectionId = idMatch ? idMatch[1] : null;
    if (!collectionId) {
      setCatalogError(
        'No se pudo extraer el ID del álbum. Pegue un enlace tipo https://music.apple.com/us/album/<id> o https://itunes.apple.com/us/album/<id>.',
      );
      return;
    }

    setIsOpeningAlbum(true);
    setCatalogError(null);
    setOpenedAlbum(null);
    setCatalogAlbumTracks([]);
    try {
      const tracks: CatalogAlbumTrack[] = await invoke('open_catalog_album', {
        source: 'itunes',
        id: collectionId,
        country,
      });
      const first = tracks[0];
      const opened: CatalogAlbum = {
        source: 'itunes',
        id: collectionId,
        title: first?.album || 'Álbum',
        artist: first?.artist || first?.album_artist || '',
        year: first?.year || '',
        track_count: tracks.length,
        cover_url: first?.cover_url || '',
      };
      setOpenedAlbum(opened);
      setCatalogAlbumTracks(tracks);
      setCatalogAlbums([]);
      if (tracks.length === 0) {
        setCatalogError(
          'No se encontraron pistas para ese álbum. Verifique el enlace (debe apuntar al álbum, no a una canción).',
        );
      }
    } catch (err) {
      console.error('Error al cargar álbum por enlace:', err);
      setCatalogError(`Error al cargar el álbum desde el enlace: ${String(err)}`);
      setOpenedAlbum(null);
    } finally {
      setIsOpeningAlbum(false);
    }
  };

  // Cargar una canción concreta desde su enlace de iTunes/Apple Music.
  // La URL de canción trae el ID del álbum en la ruta y el de la pista en `i=`.
  const openSongByLink = async (link: string) => {
    const trimmed = link.trim();
    if (!trimmed) {
      setCatalogError('Pegue primero el enlace de la canción de iTunes/Apple Music.');
      return;
    }
    const ccMatch =
      trimmed.match(/\/music\.apple\.com\/([a-z]{2})\//i) ||
      trimmed.match(/\/itunes\.apple\.com\/([a-z]{2})\//i);
    const country = ccMatch ? ccMatch[1].toLowerCase() : 'us';
    const idMatch = trimmed.match(/\/(\d{8,15})(?:\/|\?|$)/);
    const collectionId = idMatch ? idMatch[1] : null;
    if (!collectionId) {
      setCatalogError(
        'No se pudo extraer el ID. Pegue un enlace tipo https://music.apple.com/us/album/.../<id>?i=<id>.',
      );
      return;
    }
    const trackMatch = trimmed.match(/[?&]i=(\d{8,15})/);
    const trackId = trackMatch ? trackMatch[1] : null;

    setIsOpeningSong(true);
    setCatalogError(null);
    try {
      const tracks: CatalogAlbumTrack[] = await invoke('open_catalog_album', {
        source: 'itunes',
        id: collectionId,
        country,
      });
      if (tracks.length === 0) {
        setCatalogError('No se encontraron pistas para ese enlace. Verificá la URL.');
        return;
      }
      const elegida = (trackId && tracks.find((t) => t.id === trackId)) || tracks[0];
      await applyAlbumTrack(elegida);
    } catch (err) {
      console.error('Error al cargar canción por enlace:', err);
      setCatalogError(`Error al cargar la canción desde el enlace: ${String(err)}`);
    } finally {
      setIsOpeningSong(false);
    }
  };

  // Aplicar campos de un candidato (canción) al formulario.
  const applyFields = (fields: {
    title?: string;
    artist?: string;
    album?: string;
    album_artist?: string;
    year?: string;
    genre?: string;
    track_number?: string;
  }) => {
    if (fields.title) setEditTitle(fields.title);
    if (fields.artist) setEditArtist(fields.artist);
    if (fields.album) setEditAlbum(fields.album);
    if (fields.album_artist) setEditAlbumArtist(fields.album_artist);
    if (fields.year) setEditYear(fields.year);
    if (fields.genre) setEditGenre(fields.genre);
    if (fields.track_number) setEditTrackNumber(fields.track_number);
  };

  // Aplicar datos de una canción del catálogo.
  const applyCandidate = async (candidate: CatalogCandidate, applyCoverOnly: boolean = false) => {
    if (!applyCoverOnly) {
      applyFields(candidate);
    }
    if (candidate.cover_url) {
      await downloadCover(candidate.cover_url);
    }
    setEditTab('tags');
    setMetadataFeedback(
      applyCoverOnly
        ? '✓ Portada de alta resolución importada con éxito.'
        : '✓ ¡Metadatos importados desde el catálogo oficial!',
    );
    setTimeout(() => setMetadataFeedback(null), 3000);
  };

  // Aplicar una pista concreta del álbum abierto.
  const applyAlbumTrack = async (track: CatalogAlbumTrack, applyCoverOnly: boolean = false) => {
    if (!applyCoverOnly) {
      applyFields(track);
    }
    if (track.cover_url) {
      await downloadCover(track.cover_url);
    }
    setEditTab('tags');
    setMetadataFeedback(
      applyCoverOnly
        ? '✓ Portada de alta resolución importada con éxito.'
        : '✓ ¡Metadatos del álbum aplicados a la canción!',
    );
    setTimeout(() => setMetadataFeedback(null), 3000);
  };

  // Pegar imagen del portapapeles
  const handlePaste = async (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.startsWith('image/')) {
        const file = items[i].getAsFile();
        if (file) {
          const buffer = await file.arrayBuffer();
          const bytes = Array.from(new Uint8Array(buffer));
          const tempPath = await invoke<string>('save_temp_cover', { bytes });
          setEditCoverPath(tempPath);
          setEditCoverPreviewUrl(URL.createObjectURL(file));
          setRemoveCover(false);
          setMetadataFeedback('✓ Imagen pegada desde el portapapeles.');
          setTimeout(() => setMetadataFeedback(null), 2500);
          break;
        }
      }
    }
  };

  const handleSaveMetadata = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTrack) return;
    setIsSavingMetadata(true);
    setMetadataFeedback(null);

    try {
      const yearNum = editYear.trim() ? parseInt(editYear.trim(), 10) : null;
      const trackNum = editTrackNumber.trim() ? parseInt(editTrackNumber.trim(), 10) : null;

      const updated = await invoke<ScannedTrack>('update_track_metadata', {
        path: editingTrack.path,
        title: editTitle.trim(),
        artist: editArtist.trim(),
        album: editAlbum.trim(),
        albumArtist: editAlbumArtist.trim() || null,
        trackNumber: isNaN(trackNum || NaN) ? null : trackNum,
        year: isNaN(yearNum || NaN) ? null : yearNum,
        genre: editGenre.trim() || null,
        coverPath: removeCover ? null : editCoverPath,
        removeCover: removeCover,
      });

      // Actualizar pistas locales en memoria
      setTracks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
      if (activeTrack?.id === updated.id) {
        setActiveTrack(updated);
      }

      setMetadataFeedback('✓ ¡Metadatos guardados con éxito en el archivo!');
      setTimeout(() => {
        setEditingTrack(null);
        setMetadataFeedback(null);
      }, 700);
    } catch (err) {
      console.error('Error al actualizar metadatos:', err);
      setMetadataFeedback(`Error al guardar: ${String(err)}`);
    } finally {
      setIsSavingMetadata(false);
    }
  };

  return {
    editingTrack,
    setEditingTrack,
    editTab,
    setEditTab,
    editTitle,
    setEditTitle,
    editArtist,
    setEditArtist,
    editAlbum,
    setEditAlbum,
    editAlbumArtist,
    setEditAlbumArtist,
    editTrackNumber,
    setEditTrackNumber,
    editYear,
    setEditYear,
    editGenre,
    setEditGenre,
    editCoverPath,
    setEditCoverPath,
    editCoverPreviewUrl,
    setEditCoverPreviewUrl,
    removeCover,
    setRemoveCover,
    isSavingMetadata,
    setIsSavingMetadata,
    metadataFeedback,
    setMetadataFeedback,
    catalogQuery,
    setCatalogQuery,
    catalogSource,
    setCatalogSource,
    catalogMode,
    setCatalogMode,
    catalogResults,
    setCatalogResults,
    isSearchingCatalog,
    setIsSearchingCatalog,
    catalogError,
    setCatalogError,
    catalogAlbums,
    setCatalogAlbums,
    openedAlbum,
    setOpenedAlbum,
    catalogAlbumTracks,
    setCatalogAlbumTracks,
    isOpeningAlbum,
    setIsOpeningAlbum,
    albumLink,
    setAlbumLink,
    songLink,
    setSongLink,
    isOpeningSong,
    setIsOpeningSong,
    openEditModal,
    resetField,
    resetAllFields,
    pickNewCoverImage,
    searchCatalog,
    openAlbum,
    openAlbumByLink,
    openSongByLink,
    applyCandidate,
    applyAlbumTrack,
    handlePaste,
    handleSaveMetadata,
  };
}
