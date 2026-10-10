import '@fontsource/montserrat/300.css'
import '@fontsource/montserrat/400.css'
import '@fontsource/montserrat/500.css'
import '@fontsource/montserrat/600.css'
import '@/presentation/styles.css'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createServices } from '@/application'
import { createDexieStore } from '@/infrastructure/dexie/dexieStore'
import { createCanvasImageProcessor } from '@/infrastructure/images/canvasImageProcessor'
import { App } from '@/presentation/app/App'

/* Raiz de composição: o único lugar que conhece os adapters concretos. */
const services = createServices({
  store: createDexieStore('lume'),
  clock: { now: () => new Date() },
  newId: () => crypto.randomUUID(),
  images: createCanvasImageProcessor(),
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

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App services={services} />
  </StrictMode>,
)
