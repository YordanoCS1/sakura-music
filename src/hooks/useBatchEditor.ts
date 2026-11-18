// Estado y lógica de la edición en lote: pre-llenado con valores comunes,
// portada opcional y guardado que informa qué archivos fallaron.

import { useState } from 'react';
import { convertFileSrc, invoke } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-dialog';
import type { ScannedTrack } from '../types';
import type { BatchUpdateResult } from '../types';

interface UseBatchEditorDeps {
  tracks: ScannedTrack[];
  selectedTrackIds: Set<string>;
  setTracks: React.Dispatch<React.SetStateAction<ScannedTrack[]>>;
  clearTrackSelection: () => void;
}

export function useBatchEditor({
  tracks,
  selectedTrackIds,
  setTracks,
  clearTrackSelection,
}: UseBatchEditorDeps) {
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const [batchArtist, setBatchArtist] = useState('');
  const [applyBatchArtist, setApplyBatchArtist] = useState(false);
  const [batchAlbum, setBatchAlbum] = useState('');
  const [applyBatchAlbum, setApplyBatchAlbum] = useState(false);
  const [batchAlbumArtist, setBatchAlbumArtist] = useState('');
  const [applyBatchAlbumArtist, setApplyBatchAlbumArtist] = useState(false);
  const [batchYear, setBatchYear] = useState('');
  const [applyBatchYear, setApplyBatchYear] = useState(false);
  const [batchGenre, setBatchGenre] = useState('');
  const [applyBatchGenre, setApplyBatchGenre] = useState(false);
  const [batchCoverPath, setBatchCoverPath] = useState<string | null>(null);
  const [batchCoverPreviewUrl, setBatchCoverPreviewUrl] = useState<string | null>(null);
  const [applyBatchCover, setApplyBatchCover] = useState(false);
  const [batchRemoveCover, setBatchRemoveCover] = useState(false);
  const [batchTargets, setBatchTargets] = useState<ScannedTrack[]>([]);
  const [isSavingBatch, setIsSavingBatch] = useState(false);
  const [batchFeedback, setBatchFeedback] = useState<string | null>(null);

  const openBatchModal = (overrides?: ScannedTrack[]) => {
    // Las vistas propias no tienen selección multiple: pasan las pistas
    // visibles. Los eventos de React se ignoran con Array.isArray.
    const selected = Array.isArray(overrides)
      ? overrides
      : tracks.filter((t) => selectedTrackIds.has(t.id));
    if (selected.length === 0) return;
    setBatchTargets(selected);

    const first = selected[0];
    const commonArtist = selected.every((t) => t.artist === first.artist) ? first.artist : '';
    const commonAlbum = selected.every((t) => t.album === first.album) ? first.album : '';
    const commonAlbumArtist = selected.every(
      (t) => (t.album_artist || t.artist) === (first.album_artist || first.artist),
    )
      ? first.album_artist || first.artist
      : '';
    const commonYear = selected.every((t) => t.year === first.year && t.year !== null)
      ? String(first.year)
      : '';
    const commonGenre = selected.every((t) => t.genre === first.genre && t.genre !== null)
      ? first.genre || ''
      : '';

    setBatchArtist(commonArtist);
    setApplyBatchArtist(!!commonArtist);
    setBatchAlbum(commonAlbum);
    setApplyBatchAlbum(!!commonAlbum);
    setBatchAlbumArtist(commonAlbumArtist);
    setApplyBatchAlbumArtist(!!commonAlbumArtist);
    setBatchYear(commonYear);
    setApplyBatchYear(!!commonYear);
    setBatchGenre(commonGenre);
    setApplyBatchGenre(!!commonGenre);
    setBatchCoverPath(null);
    setBatchCoverPreviewUrl(null);
    setApplyBatchCover(false);
    setBatchRemoveCover(false);
    setBatchFeedback(null);
    setIsBatchModalOpen(true);
  };

  const pickBatchCoverImage = async () => {
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
        setBatchCoverPath(selected);
        setBatchCoverPreviewUrl(convertFileSrc(selected));
        setApplyBatchCover(true);
        setBatchRemoveCover(false);
      }
    } catch (e) {
      console.error('Error al seleccionar imagen para lote:', e);
    }
  };

  const handleSaveBatchMetadata = async (e: React.FormEvent) => {
    e.preventDefault();
    const selectedTracks = batchTargets.length
      ? batchTargets
      : tracks.filter((t) => selectedTrackIds.has(t.id));
    if (selectedTracks.length === 0) return;

    setIsSavingBatch(true);
    setBatchFeedback(null);

    try {
      const paths = selectedTracks.map((t) => t.path);
      const yearNum = applyBatchYear && batchYear.trim() ? parseInt(batchYear.trim(), 10) : null;

      const result = await invoke<BatchUpdateResult>('update_batch_metadata', {
        paths,
        artist: applyBatchArtist ? batchArtist.trim() || null : null,
        album: applyBatchAlbum ? batchAlbum.trim() || null : null,
        albumArtist: applyBatchAlbumArtist ? batchAlbumArtist.trim() || null : null,
        year: applyBatchYear && !isNaN(yearNum || NaN) ? yearNum : null,
        genre: applyBatchGenre ? batchGenre.trim() || null : null,
        coverPath: applyBatchCover ? (batchRemoveCover ? null : batchCoverPath) : null,
        removeCover: applyBatchCover ? batchRemoveCover : false,
      });

      // Actualizar biblioteca local
      const updatedMap = new Map(result.updated.map((t) => [t.id, t]));
      setTracks((prev) => prev.map((t) => updatedMap.get(t.id) || t));

      if (result.errors.length > 0) {
        setBatchFeedback(
          `Se actualizaron ${result.updated.length} canciones y ${result.errors.length} fallaron: ${result.errors.slice(0, 3).join(' · ')}`,
        );
        setIsSavingBatch(false);
      } else {
        setBatchFeedback(`✓ ¡${result.updated.length} canciones actualizadas exitosamente!`);
        setTimeout(() => {
          setIsBatchModalOpen(false);
          setIsSavingBatch(false);
          setBatchFeedback(null);
          clearTrackSelection();
        }, 1200);
      }
    } catch (err) {
      console.error('Error en batch metadata:', err);
      setBatchFeedback(`Error al guardar lote: ${String(err)}`);
      setIsSavingBatch(false);
    }
  };

  return {
    isBatchModalOpen,
    setIsBatchModalOpen,
    batchArtist,
    setBatchArtist,
    applyBatchArtist,
    setApplyBatchArtist,
    batchAlbum,
    setBatchAlbum,
    applyBatchAlbum,
    setApplyBatchAlbum,
    batchAlbumArtist,
    setBatchAlbumArtist,
    applyBatchAlbumArtist,
    setApplyBatchAlbumArtist,
    batchYear,
    setBatchYear,
    applyBatchYear,
    setApplyBatchYear,
    batchGenre,
    setBatchGenre,
    applyBatchGenre,
    setApplyBatchGenre,
    batchCoverPath,
    setBatchCoverPath,
    batchCoverPreviewUrl,
    setBatchCoverPreviewUrl,
    applyBatchCover,
    setApplyBatchCover,
    batchRemoveCover,
    setBatchRemoveCover,
    isSavingBatch,
    setIsSavingBatch,
    batchFeedback,
    setBatchFeedback,
    openBatchModal,
    batchTargets,
    pickBatchCoverImage,
    handleSaveBatchMetadata,
  };
}
