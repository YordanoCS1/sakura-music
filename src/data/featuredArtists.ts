// Artistas destacados del Home. Puedes editar libremente este archivo:
// - name: nombre del artista
// - tagline: frase corta (estilo YouTube "Artista del momento")
// - image: URL de la imagen (deja "" para usar el gradiente con la inicial)
// - colors: [color1, color2] del gradiente de fondo
export interface FeaturedArtist {
  name: string;
  tagline: string;
  image: string;
  colors: [string, string];
}

export const FEATURED_ARTISTS: FeaturedArtist[] = [
  {
    name: 'LiSA',
    tagline: 'La voz del anime · J-Pop',
    image: '',
    colors: ['#ec4899', '#8b5cf6'],
  },
  {
    name: 'Kenshi Yonezu',
    tagline: 'Visionario del J-Pop moderno',
    image: '',
    colors: ['#f59e0b', '#ec4899'],
  },
  {
    name: 'Yoasobi',
    tagline: 'Historias en forma de canción',
    image: '',
    colors: ['#06b6d4', '#8b5cf6'],
  },
  {
    name: 'Ado',
    tagline: 'Una voz sin límites',
    image: '',
    colors: ['#a855f7', '#3b82f6'],
  },
];