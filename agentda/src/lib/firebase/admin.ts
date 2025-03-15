import { getApps, initializeApp, cert, App } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { getAuth } from 'firebase-admin/auth'

let adminApp: App

function getAdminApp() {
  if (!process.env.FIREBASE_PROJECT_ID || !process.env.FIREBASE_CLIENT_EMAIL || !process.env.FIREBASE_PRIVATE_KEY) {
    throw new Error('Missing Firebase Admin SDK configuration. Please check your environment variables.')
  }

  if (getApps().length > 0) {
    return getApps()[0]
  }

  adminApp = initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    }),
  })

  return adminApp
}

export const adminAuth = getAuth(getAdminApp())
export const adminDb = getFirestore(getAdminApp())

// Helper to verify auth token
export async function verifyToken(token: string) {
  if (!token) {
    console.error('No token provided')
    return null
  }

  try {
    const decodedToken = await adminAuth.verifyIdToken(token)
    return decodedToken
  } catch (error) {
    console.error('Error verifying token:', error)
    return null
  }
}

// Helper to get user by ID
export async function getUserById(uid: string) {
  if (!uid) {
    console.error('No user ID provided')
    return null
  }

  try {
    const userRecord = await adminAuth.getUser(uid)
    return userRecord
  } catch (error) {
    console.error('Error fetching user:', error)
    return null
  }
} 