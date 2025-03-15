import { Timestamp } from 'firebase/firestore'

export type UserRole = 'owner' | 'admin' | 'member' | 'guest'
export type AccountType = 'individual' | 'organization'

export interface Organization {
  id: string
  name: string
  ownerId: string
  createdAt: Timestamp
  updatedAt: Timestamp
  members: {
    [userId: string]: {
      role: UserRole
      joinedAt: Timestamp
    }
  }
}

export interface User {
  id: string
  email: string
  name: string
  title?: string
  photoURL?: string
  accountType: AccountType
  organizationId?: string
  createdAt: Timestamp
  updatedAt: Timestamp
}

export interface Meeting {
  id: string
  title: string
  description?: string
  startTime: Timestamp
  endTime: Timestamp
  location?: string
  organizerId: string
  participants: string[]
  status: 'scheduled' | 'in-progress' | 'completed' | 'cancelled'
  createdAt: Timestamp
  updatedAt: Timestamp
}

export interface AgendaItem {
  id: string
  title: string
  description?: string
  duration?: number
  presenter?: string
  status: 'pending' | 'in-progress' | 'completed'
  order: number
  createdAt: Timestamp
  updatedAt: Timestamp
}

export interface ActionItem {
  id: string
  title: string
  assignedTo: string
  dueDate?: Timestamp
  status: 'pending' | 'in-progress' | 'completed'
  createdBy: string
  createdAt: Timestamp
  updatedAt: Timestamp
}

export interface Decision {
  id: string
  title: string
  description: string
  agendaItemId?: string
  madeBy: string
  approvedBy: string[]
  createdAt: Timestamp
  updatedAt: Timestamp
}

export interface MeetingSummary {
  id: string
  content: string
  decisions: string[]
  actionItems: string[]
  participants: string[]
  createdBy: string
  createdAt: Timestamp
  updatedAt: Timestamp
}

export interface AuthError {
  code: string
  details?: string
}

export interface FirebaseAuthError {
  code: string
  message: string
  customData?: Record<string, any>
} 