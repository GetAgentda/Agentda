import { useEffect, useState } from 'react'
import {
  DocumentReference,
  Query,
  onSnapshot,
  DocumentData,
  QuerySnapshot,
  DocumentSnapshot,
} from 'firebase/firestore'

type DataType<T> = T extends Array<any> ? T : T | null

export function useRealtime<T = DocumentData>(
  reference: DocumentReference<T> | Query<T>
) {
  const [data, setData] = useState<DataType<T>>(null as DataType<T>)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    setLoading(true)

    try {
      const unsubscribe = onSnapshot(
        reference as Query<T>,
        {
          next: (snapshot: QuerySnapshot<T> | DocumentSnapshot<T>) => {
            if ('docs' in snapshot) {
              // Handle Query
              const queryData = snapshot.docs.map((doc) => ({
                id: doc.id,
                ...doc.data(),
              })) as T
              setData(queryData as DataType<T>)
            } else {
              // Handle DocumentReference
              const docData = snapshot.exists()
                ? { id: snapshot.id, ...snapshot.data() }
                : null
              setData(docData as DataType<T>)
            }
            setLoading(false)
          },
          error: (err: Error) => {
            setError(err)
            setLoading(false)
          }
        }
      )

      return () => unsubscribe()
    } catch (err) {
      setError(err as Error)
      setLoading(false)
      return () => {}
    }
  }, [reference])

  return { data, loading, error }
} 