/**
 * Fotos da landing page, todas gratuitas sob a Licença Unsplash (uso comercial permitido,
 * atribuição opcional — creditamos no rodapé). Servidas pelo CDN do Unsplash, que entrega
 * o tamanho e o formato (AVIF/WebP) certos para cada tela.
 */
export interface LandingPhoto {
  src: string
  srcSet: string
  width: number
  height: number
  alt: string
  credit: { name: string; page: string }
}

function unsplash(
  photo: string,
  { width, height, focus = [0.5, 0.5], zoom = 1 }: { width: number; height: number; focus?: [number, number]; zoom?: number },
  alt: string,
  credit: LandingPhoto['credit'],
): LandingPhoto {
  const url = (scale: number) =>
    `https://images.unsplash.com/${photo}?auto=format&fit=crop&crop=focalpoint&fp-x=${focus[0]}&fp-y=${focus[1]}&fp-z=${zoom}&w=${width * scale}&h=${height * scale}&q=70`
  return { src: url(1), srcSet: `${url(1)} 1x, ${url(2)} 2x`, width, height, alt, credit }
}

const CARD = { width: 560, height: 350 }

export const PHOTOS = {
  hero: unsplash('photo-1544717304-a2db4a7b16ee', { width: 340, height: 480, focus: [0.5, 0.42] }, 'Mulher de perfil, com pele iluminada, envolta em uma toalha branca', {
    name: 'Icons8 Team',
    page: 'https://unsplash.com/photos/y2T5hT7pWx4',
  }),
  clinic: unsplash('photo-1763873993447-1d0be71a96d9', { width: 520, height: 600, focus: [0.5, 0.5] }, 'Recepção clara e acolhedora de uma clínica de estética', {
    name: 'Ela De Pure',
    page: 'https://unsplash.com/photos/cefsod8L2mo',
  }),
  facial: unsplash('photo-1552693673-1bf958298935', { ...CARD, focus: [0.4, 0.45] }, 'Profissional de luvas realizando tratamento facial em paciente relaxada', {
    name: 'karelys Ruiz',
    page: 'https://unsplash.com/photos/PqyzuzFiQfY',
  }),
  body: unsplash('photo-1570174006382-148305ce4972', { ...CARD, focus: [0.5, 0.55] }, 'Paciente recebendo massagem corporal em uma maca', {
    name: 'Rosa Rafael',
    page: 'https://unsplash.com/photos/cJwl8182Mjs',
  }),
  injectables: unsplash('photo-1733685372413-c87c85a972b5', { ...CARD, focus: [0.4, 0.5], zoom: 1.6 }, 'Profissional de luvas preparando uma seringa para aplicação', {
    name: 'Alexander Mass',
    page: 'https://unsplash.com/photos/Hn0vDmpcPfc',
  }),
  integrative: unsplash('photo-1655892836674-1df10277925e', { ...CARD, focus: [0.5, 0.5] }, 'Frasco de óleo essencial sobre bandeja de madeira com flores secas', {
    name: 'Andrzej Gdula',
    page: 'https://unsplash.com/photos/66OgXiZ-pWk',
  }),
} satisfies Record<string, LandingPhoto>

export function Photo({ photo, className, priority = false }: { photo: LandingPhoto; className?: string; priority?: boolean }) {
  return (
    <img
      src={photo.src}
      srcSet={photo.srcSet}
      width={photo.width}
      height={photo.height}
      alt={photo.alt}
      className={className}
      loading={priority ? 'eager' : 'lazy'}
      fetchPriority={priority ? 'high' : 'auto'}
      decoding="async"
    />
  )
}
