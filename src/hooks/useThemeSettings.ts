import { useEffect, useState } from 'react';
import {
  baseDelTema,
  borrarTemaPersonalizado,
  guardarTemaPersonalizado,
  inyectarEstilos,
  temasPersonalizados,
  type TemaPersonalizado,
} from '../themes/customThemes';
import { TEMAS_DISPONIBLES, THEME_GLOWS } from '../themes/themeCatalog';
import type { ScannedTrack, ThemeMode } from '../types';

export function useThemeSettings(
  activeTrack: ScannedTrack | null,
  getCoverSrc: (coverUrl: string | null) => string,
) {
  const [customThemes, setCustomThemes] = useState(() => temasPersonalizados());
  const todosLosTemas = [
    ...TEMAS_DISPONIBLES,
    ...customThemes.map((tema) => ({
      id: tema.id,
      nombre: tema.nombre,
      descripcion: `Basado en ${tema.base}`,
    })),
  ];

  const [theme, setTheme] = useState<string>(() => {
    const guardado = localStorage.getItem('sakura_theme');
    const conocidos = [
      ...TEMAS_DISPONIBLES.map((t) => t.id),
      ...temasPersonalizados().map((t) => t.id),
    ];
    return guardado && conocidos.includes(guardado) ? guardado : 'space';
  });

  // Los temas importados eligen un arquetipo estructural; el CSS se inyecta
  // en runtime y la UI se renderiza con los componentes de ese arquetipo.
  const temaBase = baseDelTema(theme, customThemes) as ThemeMode;
  const nombreTema = todosLosTemas.find((t) => t.id === theme)?.nombre ?? 'Estudio';

  useEffect(() => inyectarEstilos(customThemes), [customThemes]);

  useEffect(() => {
    localStorage.setItem('sakura_theme', theme);
  }, [theme]);

  const handleSetTheme = (siguiente: string) => {
    setTheme(siguiente);
    localStorage.setItem('sakura_theme', siguiente);
  };

  const importarTema = (json: string) => {
    try {
      const dato: unknown = JSON.parse(json);
      if (!dato || typeof dato !== 'object') throw new Error('JSON inválido');
      const tema = dato as TemaPersonalizado;
      if (
        typeof tema.id !== 'string' ||
        typeof tema.nombre !== 'string' ||
        typeof tema.base !== 'string' ||
        typeof tema.css !== 'string'
      ) {
        throw new Error('Faltan campos del tema');
      }
      setCustomThemes(guardarTemaPersonalizado(tema));
      handleSetTheme(tema.id);
    } catch (error) {
      console.error('No se pudo importar el tema:', error);
    }
  };

  const borrarTema = (id: string) => {
    setCustomThemes(borrarTemaPersonalizado(id));
    if (theme === id) {
      handleSetTheme('space');
    }
  };

  const [carpetaExportacion, setCarpetaExportacion] = useState<string>(
    () => localStorage.getItem('sakura_export_folder') ?? '',
  );
  const guardarCarpetaExportacion = (ruta: string) => {
    setCarpetaExportacion(ruta);
    if (ruta) localStorage.setItem('sakura_export_folder', ruta);
    else localStorage.removeItem('sakura_export_folder');
  };

  const [glassOpacity, setGlassOpacity] = useState<number>(() => {
    const saved = localStorage.getItem('sakura_glass_opacity');
    return saved ? parseInt(saved, 10) : 65;
  });
  const [glassBlur, setGlassBlur] = useState<number>(() => {
    const saved = localStorage.getItem('sakura_glass_blur');
    return saved ? parseInt(saved, 10) : 20;
  });
  const [ambientGlow, setAmbientGlow] = useState<boolean>(() => {
    const saved = localStorage.getItem('sakura_ambient_glow');
    return saved !== null ? saved === 'true' : true;
  });
  const [ambientParticles, setAmbientParticles] = useState<boolean>(() => {
    const saved = localStorage.getItem('sakura_ambient_particles');
    return saved !== null ? saved === 'true' : true;
  });

  const handleSetGlassOpacity = (val: number) => {
    setGlassOpacity(val);
    localStorage.setItem('sakura_glass_opacity', String(val));
  };
  const handleSetGlassBlur = (val: number) => {
    setGlassBlur(val);
    localStorage.setItem('sakura_glass_blur', String(val));
  };
  const handleSetAmbientGlow = (val: boolean) => {
    setAmbientGlow(val);
    localStorage.setItem('sakura_ambient_glow', String(val));
  };
  const handleSetAmbientParticles = (val: boolean) => {
    setAmbientParticles(val);
    localStorage.setItem('sakura_ambient_particles', String(val));
  };

  const [coverGlowColors, setCoverGlowColors] = useState<{
    color1: string;
    color2: string;
    angulo?: number;
  } | null>(null);

  useEffect(() => {
    if (!activeTrack?.cover_url) {
      setCoverGlowColors(null);
      return;
    }

    let isMounted = true;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = getCoverSrc(activeTrack.cover_url);

    img.onload = () => {
      if (!isMounted) return;
      try {
        const canvas = document.createElement('canvas');
        canvas.width = 16;
        canvas.height = 16;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.drawImage(img, 0, 0, 16, 16);
        const data = ctx.getImageData(0, 0, 16, 16).data;

        let rSum = 0,
          gSum = 0,
          bSum = 0,
          count = 0;
        let maxSat = 0;
        let vibrantR = 244,
          vibrantG = 63,
          vibrantB = 130;

        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          const a = data[i + 3];
          if (a < 128) continue;

          const max = Math.max(r, g, b);
          const min = Math.min(r, g, b);
          const delta = max - min;
          const sat = max === 0 ? 0 : delta / max;

          if (max > 40 && min < 225 && sat > maxSat) {
            maxSat = sat;
            vibrantR = r;
            vibrantG = g;
            vibrantB = b;
          }

          rSum += r;
          gSum += g;
          bSum += b;
          count++;
        }

        if (count > 0) {
          const avgR = Math.round(rSum / count);
          const avgG = Math.round(gSum / count);
          const avgB = Math.round(bSum / count);

          setCoverGlowColors({
            color1: `rgba(${vibrantR}, ${vibrantG}, ${vibrantB}, 0.28)`,
            color2: `rgba(${avgR}, ${avgG}, ${avgB}, 0.20)`,
            angulo: Math.round((vibrantR / 255) * 360),
          });
        }
      } catch {
        setCoverGlowColors(null);
      }
    };

    img.onerror = () => {
      if (isMounted) setCoverGlowColors(null);
    };

    return () => {
      isMounted = false;
    };
  }, [activeTrack?.id, activeTrack?.cover_url, getCoverSrc]);

  const currentTheme = THEME_GLOWS[theme] ?? THEME_GLOWS[temaBase] ?? THEME_GLOWS.space;
  const worldStyle = {
    bgClass: 'bg-[#fbf7f4]',
    ambientGlow1: currentTheme.glow1,
    ambientGlow2: currentTheme.glow2,
    accentGradient: currentTheme.accent,
    accentBadge: currentTheme.badge,
  };

  return {
    customThemes,
    setCustomThemes,
    todosLosTemas,
    theme,
    temaBase,
    nombreTema,
    handleSetTheme,
    importarTema,
    borrarTema,
    carpetaExportacion,
    guardarCarpetaExportacion,
    glassOpacity,
    handleSetGlassOpacity,
    glassBlur,
    handleSetGlassBlur,
    ambientGlow,
    handleSetAmbientGlow,
    ambientParticles,
    handleSetAmbientParticles,
    coverGlowColors,
    worldStyle,
  };
}
