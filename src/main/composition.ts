import { createServices } from '@/application'
import { createLocalCredentialStore } from '@/infrastructure/access/localCredentialStore'
import { createWebCryptoPinHasher } from '@/infrastructure/access/webCryptoPinHasher'
import { createDexieStore } from '@/infrastructure/dexie/dexieStore'
import { createCanvasImageProcessor } from '@/infrastructure/images/canvasImageProcessor'
import { createGithubSitePublisher } from '@/infrastructure/site/githubSitePublisher'
import { createLocalSiteTokenStore } from '@/infrastructure/site/localSiteTokenStore'

/*
 * Raiz de composição do painel: o único lugar que conhece os adapters concretos.
 * Carregada sob demanda ao entrar em /admin — quem visita a landing page não baixa o
 * sistema nem cria o banco local no navegador.
 */
export const services = createServices({
  store: createDexieStore('lume'),
  clock: { now: () => new Date() },
  newId: () => crypto.randomUUID(),
  images: createCanvasImageProcessor(),
  credentials: createLocalCredentialStore(),
  pinHasher: createWebCryptoPinHasher(),
  // O site público (GitHub Pages) lê public/site.json; publicar grava esse arquivo no repositório.
  sitePublisher: createGithubSitePublisher({ owner: 'maycrodrigues', repo: 'lume', branch: 'main', path: 'public/site.json' }),
  siteToken: createLocalSiteTokenStore(),
})

window.addEventListener('error', (event) => {
  void services.activity.recordError(event.error ?? event.message, { source: 'window.onerror', path: location.pathname })
})
window.addEventListener('unhandledrejection', (event) => {
  void services.activity.recordError(event.reason, { source: 'unhandledrejection', path: location.pathname })
})

// Pede ao navegador para não descartar o IndexedDB sob pressão de espaço.
const persist = navigator.storage?.persist ? navigator.storage.persist() : Promise.resolve(false)
void persist
  .catch(() => false)
  .then((persisted) =>
    services.activity.record({
      category: 'system',
      action: 'app.start',
      message: 'Painel iniciado',
      context: { persistentStorage: persisted, userAgent: navigator.userAgent },
    }),
  )
