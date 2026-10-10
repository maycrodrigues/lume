import { useEffect, useRef, useState, type DependencyList } from 'react'
import type { Collection } from '@/application'
import { useServices } from '../app/services'

interface LiveQuery<T> {
  data: T | undefined
  error: Error | undefined
  loading: boolean
}

/**
 * Executa `load` e o reexecuta sempre que os dados mudam (qualquer coleção, exceto
 * registros de atividade — a menos que `watch` os inclua). Mantém o dado anterior
 * enquanto recarrega, para a tela não "piscar".
 */
export function useLiveQuery<T>(load: () => Promise<T>, deps: DependencyList, watch?: Collection[]): LiveQuery<T> {
  const services = useServices()
  const [state, setState] = useState<LiveQuery<T>>({ data: undefined, error: undefined, loading: true })
  const loadRef = useRef(load)
  loadRef.current = load
  const watchKey = watch?.join(',')

  useEffect(() => {
    let alive = true
    let request = 0
    const run = () => {
      const current = ++request
      setState((s) => ({ ...s, loading: true }))
      loadRef.current().then(
        (data) => alive && current === request && setState({ data, error: undefined, loading: false }),
        (error: unknown) =>
          alive &&
          current === request &&
          setState((s) => ({ ...s, error: error instanceof Error ? error : new Error(String(error)), loading: false })),
      )
    }
    run()
    const watched = watchKey?.split(',')
    const unsubscribe = services.subscribe((changed) => {
      const relevant = watched
        ? watched.some((c) => changed.has(c as Collection))
        : [...changed].some((c) => c !== 'activity')
      if (relevant) run()
    })
    return () => {
      alive = false
      unsubscribe()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [services, watchKey, ...deps])

  return state
}
