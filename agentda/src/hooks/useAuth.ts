import { useEffect, useState } from 'react'
import { User as FirebaseUser, onAuthStateChanged } from 'firebase/auth'
import { doc, getDoc, setDoc, Timestamp } from 'firebase/firestore'
import { auth, db } from '@/lib/firebase/client'
import type { User, AccountType } from '@/types'

const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second

interface AuthError extends Error {
  code: string;
  details?: unknown;
}

interface AuthState {
  user: User | null;
  loading: boolean;
  error: AuthError | null;
}

export function useAuth(): AuthState {
  const [state, setState] = useState<AuthState>({
    user: null,
    loading: true,
    error: null,
  });

  // Helper function to fetch user data with retries
  const fetchUserData = async (
    firebaseUser: FirebaseUser,
    retryCount = 0
  ): Promise<User> => {
    try {
      const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
      
      if (userDoc.exists()) {
        const userData = userDoc.data() as Omit<User, 'id' | 'email'>;
        return {
          id: firebaseUser.uid,
          email: firebaseUser.email || '',
          ...userData,
        };
      }
      
      // If user document doesn't exist, create a new one
      const now = Timestamp.now();
      const newUser: User = {
        id: firebaseUser.uid,
        email: firebaseUser.email || '',
        name: firebaseUser.displayName || '',
        image: firebaseUser.photoURL || undefined,
        accountType: 'individual',
        organizations: [],
        createdAt: now,
        updatedAt: now,
      };

      // Create the user document
      await setDoc(doc(db, 'users', firebaseUser.uid), {
        ...newUser,
        id: undefined, // Don't store id in the document
      });

      return newUser;
    } catch (err) {
      if (retryCount < MAX_RETRIES) {
        console.warn(`Retry attempt ${retryCount + 1} for user ${firebaseUser.uid}`);
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * (retryCount + 1)));
        return fetchUserData(firebaseUser, retryCount + 1);
      }
      
      const error = new Error('Failed to fetch user data') as AuthError;
      error.code = 'auth/fetch-user-data-failed';
      error.details = err;
      throw error;
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(
      auth,
      async (firebaseUser) => {
        try {
          if (firebaseUser) {
            const userData = await fetchUserData(firebaseUser);
            setState({
              user: userData,
              loading: false,
              error: null,
            });
          } else {
            setState({
              user: null,
              loading: false,
              error: null,
            });
          }
        } catch (err) {
          console.error('Error in auth state change:', err);
          const error = new Error('Authentication error') as AuthError;
          error.code = 'auth/unknown';
          error.details = err;
          setState({
            user: null,
            loading: false,
            error,
          });
        }
      },
      (err) => {
        console.error('Auth state change error:', err);
        const error = new Error('Authentication error') as AuthError;
        error.code = 'auth/state-change-failed';
        error.details = err;
        setState({
          user: null,
          loading: false,
          error,
        });
      }
    );

    return () => unsubscribe();
  }, []);

  return state;
} 