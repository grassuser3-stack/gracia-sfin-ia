// Runs Postgres (PGlite) in a shared worker so every open tab uses the same data.
import { PGlite } from '@electric-sql/pglite'
import { worker } from '@electric-sql/pglite/worker'
import { setupIfNeeded } from './setup'

worker({
  async init() {
    const db = await PGlite.create('idb://makan-kaki')
    await setupIfNeeded(db)
    return db
  },
})
