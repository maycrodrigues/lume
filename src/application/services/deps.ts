import type { Clock, DataStore, IdGenerator, ImageProcessor } from '../ports'

export interface ServiceDeps {
  store: DataStore
  clock: Clock
  newId: IdGenerator
  images: ImageProcessor
}
