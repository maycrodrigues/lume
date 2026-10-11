import '@fontsource/montserrat/300.css'
import '@fontsource/montserrat/400.css'
import '@fontsource/montserrat/500.css'
import '@fontsource/montserrat/600.css'
import '@/presentation/styles.css'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from '@/presentation/app/App'

/* O painel (serviços, IndexedDB, adapters) é composto em ./composition e só carrega em /admin. */
const loadServices = () => import('./composition').then((m) => m.services)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App loadServices={loadServices} />
  </StrictMode>,
)
