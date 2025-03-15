import { useState, useEffect } from 'react'
import { doc, onSnapshot, DocumentData } from 'firebase/firestore'
import { db } from '@/lib/firebase/client'

export function useDocument<T = DocumentData>(path: string, id: string) {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    if (!path || !id) {
      setData(null)
      setLoading(false)
      return
    }

    const docRef = doc(db, path, id)

    const unsubscribe = onSnapshot(
      docRef,
      (doc) => {
        if (doc.exists()) {
          setData({ id: doc.id, ...doc.data() } as T)
        } else {
          setData(null)
        }
        setError(null)
        setLoading(false)
      },
      (err) => {
        console.error('Error fetching document:', err)
        setError(err instanceof Error ? err : new Error('Unknown error occurred'))
        setData(null)
        setLoading(false)
      }
    )

    return () => unsubscribe()
  }, [path, id])

  return { data, loading, error }
} 