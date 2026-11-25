import { useEffect, useState } from 'react';
import { guardarAtajos, leerAtajos, teclaDelEvento, type AccionAtajo } from '../lib/atajos';
import type { AppTab, PlayerStyle, ScannedTrack } from '../types';

interface UseAppShortcutsOptions {
  activeTrack: ScannedTrack | null;
  playerStyle: PlayerStyle;
  setActiveTab: (tab: AppTab) => void;
  setPaletaAbierta: React.Dispatch<React.SetStateAction<boolean>>;
  setPortadaFull: (open: boolean) => void;
  handleNextTrack: () => void;
  handlePreviousTrack: () => void;
  togglePlay: () => void;
  toggleFavorite: (trackId: string, e: React.MouseEvent) => void;
  handleSetPlayerStyle: (style: PlayerStyle) => Promise<void>;
  onShortcutSaved: (combo: string) => void;
}

export function useAppShortcuts({
  activeTrack,
  playerStyle,
  setActiveTab,
  setPaletaAbierta,
  setPortadaFull,
  handleNextTrack,
  handlePreviousTrack,
  togglePlay,
  toggleFavorite,
  handleSetPlayerStyle,
  onShortcutSaved,
}: UseAppShortcutsOptions) {
  const [atajos, setAtajos] = useState(() => leerAtajos());
  const [escuchandoAtajo, setEscuchandoAtajo] = useState<AccionAtajo | null>(null);

  useEffect(() => {
    const alTeclar = (evento: KeyboardEvent) => {
      if (escuchandoAtajo) {
        evento.preventDefault();
        const combinacion = teclaDelEvento(evento);
        const actualizados = { ...atajos, [escuchandoAtajo]: combinacion };
        setAtajos(actualizados);
        guardarAtajos(actualizados);
        setEscuchandoAtajo(null);
        onShortcutSaved(combinacion);
        return;
      }
      const combinacion = teclaDelEvento(evento);
      const accion = (Object.keys(atajos) as AccionAtajo[]).find(
        (clave) => atajos[clave].toLowerCase() === combinacion.toLowerCase(),
      );
      if (!accion) return;
      evento.preventDefault();
      switch (accion) {
        case 'paleta':
          setPaletaAbierta((abierta) => !abierta);
          break;
        case 'biblioteca':
          setActiveTab('library');
          break;
        case 'buscar':
          setActiveTab('search');
          break;
        case 'cola':
          setActiveTab('queue');
          break;
        case 'siguiente':
          handleNextTrack();
          break;
        case 'anterior':
          handlePreviousTrack();
          break;
        case 'playpause':
          togglePlay();
          break;
        case 'favorito':
          if (activeTrack) {
            toggleFavorite(activeTrack.id, { stopPropagation() {} } as React.MouseEvent);
          }
          break;
        case 'reproductor':
          void handleSetPlayerStyle(playerStyle === 'off' ? 'floating' : 'off');
          break;
        case 'presentar':
          if (activeTrack) setPortadaFull(true);
          break;
      }
    };
    window.addEventListener('keydown', alTeclar);
    return () => window.removeEventListener('keydown', alTeclar);
  }, [
    atajos,
    escuchandoAtajo,
    activeTrack,
    playerStyle,
    handleNextTrack,
    handlePreviousTrack,
    togglePlay,
    toggleFavorite,
    handleSetPlayerStyle,
    setActiveTab,
    setPaletaAbierta,
    setPortadaFull,
    onShortcutSaved,
  ]);

  return { atajos, escuchandoAtajo, setEscuchandoAtajo };
}
