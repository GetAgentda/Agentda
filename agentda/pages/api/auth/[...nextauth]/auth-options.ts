import { type NextAuthOptions, Session, DefaultSession } from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'
import { FirestoreAdapter } from '@next-auth/firebase-adapter'
import { cert } from 'firebase-admin/app'
import type { JWT, DefaultJWT } from 'next-auth/jwt'
import type { Account } from 'next-auth'

// Ensure environment variables are defined
const getRequiredEnvVar = (name: string): string => {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
};

// Get required environment variables
const GOOGLE_CLIENT_ID = getRequiredEnvVar('GOOGLE_CLIENT_ID');
const GOOGLE_CLIENT_SECRET = getRequiredEnvVar('GOOGLE_CLIENT_SECRET');
const FIREBASE_PROJECT_ID = getRequiredEnvVar('FIREBASE_PROJECT_ID');
const FIREBASE_CLIENT_EMAIL = getRequiredEnvVar('FIREBASE_CLIENT_EMAIL');
const FIREBASE_PRIVATE_KEY = getRequiredEnvVar('FIREBASE_PRIVATE_KEY');

// Extend next-auth JWT type
declare module 'next-auth/jwt' {
  interface JWT extends DefaultJWT {
    accessToken?: string;
  }
}

// Extend next-auth Session type
declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
    } & DefaultSession['user']
  }
}

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: GOOGLE_CLIENT_ID,
      clientSecret: GOOGLE_CLIENT_SECRET,
      authorization: {
        params: {
          prompt: "select_account",
          access_type: "offline",
          response_type: "code"
        }
      }
    }),
  ],
  adapter: FirestoreAdapter({
    credentials: cert({
      projectId: FIREBASE_PROJECT_ID,
      clientEmail: FIREBASE_CLIENT_EMAIL,
      privateKey: FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    }),
  } as any),
  session: {
    strategy: 'jwt' as const,
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  pages: {
    signIn: '/signin',
    error: '/auth/error',
  },
  callbacks: {
    async session({ session, token }: { session: Session; token: JWT }): Promise<Session> {
      if (session.user) {
        session.user.id = token.sub ?? '';
      }
      return session;
    },
    async jwt({ token, account }: { token: JWT; account: Account | null }): Promise<JWT> {
      if (account) {
        token.accessToken = account.access_token;
      }
      return token;
    }
  },
  debug: process.env.NODE_ENV === 'development',
  logger: {
    error(code, metadata) {
      console.error('Auth error:', { code, metadata });
    },
    warn(code) {
      console.warn('Auth warning:', code);
    },
    debug(code, metadata) {
      if (process.env.NODE_ENV === 'development') {
        console.debug('Auth debug:', { code, metadata });
      }
    },
  },
} 