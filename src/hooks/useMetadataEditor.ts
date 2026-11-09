// Estado y lógica del Editor de Metadatos Pro & Catálogo.
// Copia exacta de lo que vivía en App.tsx: pre-llenado, reversión por campo,
// picker/pegado de portada, búsqueda en iTunes/Deezer y guardado atómico.

import { useState } from 'react';
import { convertFileSrc, invoke } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-dialog';
import type { CatalogCandidate, ScannedTrack } from '../types';

export type EditField = 'title' | 'artist' | 'album' | 'album_artist' | 'track_number' | 'year' | 'genre';

interface UseMetadataEditorDeps {
  tracks: ScannedTrack[];
  setTracks: React.Dispatch<React.SetStateAction<ScannedTrack[]>>;
  activeTrack: ScannedTrack | null;
  setActiveTrack: React.Dispatch<React.SetStateAction<ScannedTrack | null>>;
}

// tracks se usa solo para mantener la firma de actualización; el editor guarda
// por updated.id igual que antes.
export function useMetadataEditor({
  tracks,
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

  // Catálogo Online (Apple Music / iTunes / Deezer)
  const [catalogQuery, setCatalogQuery] = useState('');
  const [catalogSource, setCatalogSource] = useState<'itunes' | 'deezer'>('itunes');
  const [catalogResults, setCatalogResults] = useState<CatalogCandidate[]>([]);
  const [isSearchingCatalog, setIsSearchingCatalog] = useState(false);
  const [catalogError, setCatalogError] = useState<string | null>(null);

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
    const cleanArtist = track.artist !== "Artista Desconocido" && track.artist !== "Desconocido" ? track.artist : "";
    const cleanTitle = track.title;
    const suggestedQuery = `${cleanArtist} ${cleanTitle}`.trim();
    setCatalogQuery(suggestedQuery);
    setCatalogResults([]);
    setCatalogError(null);
  };

  const resetField = (field: EditField) => {
    if (!editingTrack) return;
    switch (field) {
      case 'title': setEditTitle(editingTrack.title); break;
      case 'artist': setEditArtist(editingTrack.artist); break;
      case 'album': setEditAlbum(editingTrack.album); break;
      case 'album_artist': setEditAlbumArtist(editingTrack.album_artist || editingTrack.artist); break;
      case 'track_number': setEditTrackNumber(editingTrack.track_number ? editingTrack.track_number.toString() : ''); break;
      case 'year': setEditYear(editingTrack.year ? editingTrack.year.toString() : ''); break;
      case 'genre': setEditGenre(editingTrack.genre || ''); break;
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
        filters: [{
          name: 'Imágenes',
          extensions: ['jpg', 'jpeg', 'png', 'webp']
        }]
      });
      if (selected && typeof selected === 'string') {
        setEditCoverPath(selected);
        setEditCoverPreviewUrl(convertFileSrc(selected));
        setRemoveCover(false);
      }
    } catch (e) {
      console.error("Error al seleccionar imagen:", e);
    }
  };

  // Buscar en el catálogo público (Apple Music / iTunes API)
  const searchCatalog = async (customQuery?: string) => {
    const q = (customQuery !== undefined ? customQuery : catalogQuery).trim();
    if (!q) return;
    setIsSearchingCatalog(true);
    setCatalogError(null);
    try {
      if (catalogSource === 'itunes') {
        const url = `https://itunes.apple.com/search?term=${encodeURIComponent(q)}&entity=song&limit=16`;
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP error ${res.status}`);
        const data = await res.json();
        const items = data.results || [];
        const candidates: CatalogCandidate[] = items.map((it: any) => {
          const rawCover = it.artworkUrl100 || '';
          // Pedir versión de alta resolución (600x600 o 1000x1000)
          const hdCover = rawCover.replace('/100x100bb', '/600x600bb');
          const relYear = it.releaseDate ? it.releaseDate.substring(0, 4) : '';
          return {
            source: 'itunes',
            title: it.trackName || '',
            artist: it.artistName || '',
            album: it.collectionName || '',
            album_artist: it.artistName || '',
            year: relYear,
            genre: it.primaryGenreName || '',
            track_number: it.trackNumber ? it.trackNumber.toString() : '',
            cover_url: hdCover,
          };
        });
        setCatalogResults(candidates);
        if (candidates.length === 0) {
          setCatalogError("No se encontraron coincidencias en Apple Music / iTunes.");
        }
      } else {
        // Deezer: la API pública devuelve pistas con carátula en varios tamaños.
        const url = `https://api.deezer.com/search?q=${encodeURIComponent(q)}&limit=16`;
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP error ${res.status}`);
        const data = await res.json();
        if (data.error) {
          throw new Error(data.error.message || 'La API de Deezer devolvió un error');
        }
        const items = data.data || [];
        const candidates: CatalogCandidate[] = items.map((it: any) => ({
          source: 'deezer',
          title: it.title || '',
          artist: it.artist?.name || '',
          album: it.album?.title || '',
          album_artist: it.artist?.name || '',
          year: '',
          genre: '',
          track_number: '',
          cover_url: it.album?.cover_xl || it.album?.cover_big || it.album?.cover_medium || '',
        }));
        setCatalogResults(candidates);
        if (candidates.length === 0) {
          setCatalogError("No se encontraron coincidencias en Deezer.");
        }
      }
    } catch (err) {
      console.error("Error al buscar en catálogo:", err);
      setCatalogError(`Error al conectar con el catálogo: ${String(err)}`);
    } finally {
      setIsSearchingCatalog(false);
    }
  };

  // Aplicar datos de un candidato del catálogo
  const applyCandidate = async (candidate: CatalogCandidate, applyCoverOnly: boolean = false) => {
    if (!applyCoverOnly) {
      if (candidate.title) setEditTitle(candidate.title);
      if (candidate.artist) setEditArtist(candidate.artist);
      if (candidate.album) setEditAlbum(candidate.album);
      if (candidate.album_artist) setEditAlbumArtist(candidate.album_artist);
      if (candidate.year) setEditYear(candidate.year);
      if (candidate.genre) setEditGenre(candidate.genre);
      if (candidate.track_number) setEditTrackNumber(candidate.track_number);
    }

    // Si tiene portada, descargar y guardar en archivo temporal en Rust
    if (candidate.cover_url) {
      try {
        setEditCoverPreviewUrl(candidate.cover_url);
        const res = await fetch(candidate.cover_url);
        const buffer = await res.arrayBuffer();
        const bytes = Array.from(new Uint8Array(buffer));
        const tempPath = await invoke<string>('save_temp_cover', { bytes });
        setEditCoverPath(tempPath);
        setRemoveCover(false);
      } catch (err) {
        console.warn("No se pudo descargar la portada HD del catálogo:", err);
      }
    }

    setEditTab('tags');
    setMetadataFeedback(applyCoverOnly
      ? "✓ Portada de alta resolución importada con éxito."
      : "✓ ¡Metadatos importados desde el catálogo oficial!");
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
          setMetadataFeedback("✓ Imagen pegada desde el portapapeles.");
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
      setTracks(prev => prev.map(t => t.id === updated.id ? updated : t));
      if (activeTrack?.id === updated.id) {
        setActiveTrack(updated);
      }

      setMetadataFeedback("✓ ¡Metadatos guardados con éxito en el archivo!");
      setTimeout(() => {
        setEditingTrack(null);
        setMetadataFeedback(null);
      }, 700);
    } catch (err) {
      console.error("Error al actualizar metadatos:", err);
      setMetadataFeedback(`Error al guardar: ${String(err)}`);
    } finally {
      setIsSavingMetadata(false);
    }
  };

  // `tracks` no se lee acá (solo se pasa para mantener compatibilidad);
  // referenciarlo evita el aviso de variable sin usar.
  void tracks;

  return {
    editingTrack, setEditingTrack,
    editTab, setEditTab,
    editTitle, setEditTitle,
    editArtist, setEditArtist,
    editAlbum, setEditAlbum,
    editAlbumArtist, setEditAlbumArtist,
    editTrackNumber, setEditTrackNumber,
    editYear, setEditYear,
    editGenre, setEditGenre,
    editCoverPath, setEditCoverPath,
    editCoverPreviewUrl, setEditCoverPreviewUrl,
    removeCover, setRemoveCover,
    isSavingMetadata, setIsSavingMetadata,
    metadataFeedback, setMetadataFeedback,
    catalogQuery, setCatalogQuery,
    catalogSource, setCatalogSource,
    catalogResults, setCatalogResults,
    isSearchingCatalog, setIsSearchingCatalog,
    catalogError, setCatalogError,
    openEditModal,
    resetField,
    resetAllFields,
    pickNewCoverImage,
    searchCatalog,
    applyCandidate,
    handlePaste,
    handleSaveMetadata,
  };
}
