import { useState } from 'react'
import { RouterProvider } from 'react-router/dom'
import { createAppRouter, type LoadServices } from './router'

export function App({ loadServices }: { loadServices: LoadServices }) {
  const [router] = useState(() => createAppRouter(loadServices))
  return <RouterProvider router={router} />
}
