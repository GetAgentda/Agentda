'use client';

import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import styles from './error.module.css';

export default function AuthError() {
  const searchParams = useSearchParams();
  const error = searchParams.get('error');

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <h1 className={styles.title}>Authentication Error</h1>
        <p className={styles.message}>
          {error === 'OAuthCallback'
            ? 'There was a problem with the sign-in process. Please try again.'
            : 'An error occurred during authentication. Please try again.'}
        </p>
        <Link href="/signin" className={styles.button}>
          Back to Sign In
        </Link>
      </div>
    </div>
  );
} 