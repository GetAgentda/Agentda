import { useState, useEffect } from 'react'
import {
  collection,
  query,
  onSnapshot,
  Query,
  DocumentData,
  CollectionReference,
  QuerySnapshot,
} from 'firebase/firestore'
import { db } from '@/lib/firebase/client'

interface CollectionError extends Error {
  code: string
  details?: unknown
}

interface CollectionState<T> {
  data: T[]
  loading: boolean
  error: CollectionError | null
}

export function useCollection<T extends { id: string } = DocumentData & { id: string }>(
  path: string,
  queryFn?: (ref: CollectionReference<DocumentData>) => Query<DocumentData>
): CollectionState<T> {
  const [state, setState] = useState<CollectionState<T>>({
    data: [],
    loading: true,
    error: null,
  })

  useEffect(() => {
    if (!path) {
      setState({
        data: [],
        loading: false,
        error: null,
      })
      return
    }

    try {
      const collectionRef = collection(db, path)
      const q = queryFn ? queryFn(collectionRef) : collectionRef

      const unsubscribe = onSnapshot(
        q,
        (snapshot: QuerySnapshot<DocumentData>) => {
          try {
            const docs = snapshot.docs.map((doc) => ({
              id: doc.id,
              ...doc.data(),
            })) as T[]

            setState({
              data: docs,
              loading: false,
              error: null,
            })
          } catch (err) {
            console.error('Error processing collection data:', err)
            const error = new Error('Failed to process collection data') as CollectionError
            error.code = 'collection/process-failed'
            error.details = err
            setState({
              data: [],
              loading: false,
              error,
            })
          }
        },
        (err) => {
          console.error('Error fetching collection:', err)
          const error = new Error('Failed to fetch collection') as CollectionError
          error.code = 'collection/fetch-failed'
          error.details = err
          setState({
            data: [],
            loading: false,
            error,
          })
        }
      )

      return () => unsubscribe()
    } catch (err) {
      console.error('Error setting up collection listener:', err)
      const error = new Error('Failed to setup collection listener') as CollectionError
      error.code = 'collection/setup-failed'
      error.details = err
      setState({
        data: [],
        loading: false,
        error,
      })
    }
  }, [path, queryFn])

  return state
} 