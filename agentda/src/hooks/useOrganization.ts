'use client';

import { useEffect, useState } from 'react';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { useAuth } from './useAuth';
import type { Organization, UserRole, OrganizationMember } from '@/types';
import type { User as FirebaseUser } from 'firebase/auth';

interface AuthUser extends FirebaseUser {
  id: string;
}

export function useOrganization() {
  const { user } = useAuth();
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    async function fetchOrganization() {
      if (!user?.id) {
        setOrganization(null);
        setUserRole(null);
        setLoading(false);
        return;
      }

      try {
        // Get user document to find organization ID
        const userDoc = await getDoc(doc(db, 'users', user.id));
        const userData = userDoc.data();

        if (!userData?.organizationId) {
          setOrganization(null);
          setUserRole(null);
          setLoading(false);
          return;
        }

        // Get organization document
        const orgDoc = await getDoc(doc(db, 'organizations', userData.organizationId));
        if (!orgDoc.exists()) {
          throw new Error('Organization not found');
        }

        // Get organization members
        const membersRef = collection(db, 'organizations', userData.organizationId, 'members');
        const membersSnapshot = await getDocs(membersRef);
        const members: OrganizationMember[] = membersSnapshot.docs.map(doc => ({
          userId: doc.id,
          ...doc.data()
        } as OrganizationMember));

        const orgData = {
          id: orgDoc.id,
          ...orgDoc.data(),
          members
        } as Organization;

        setOrganization(orgData);

        // Find user's role in the organization
        const userMember = members.find(member => member.userId === user.id);
        if (!userMember?.role) {
          throw new Error('User role not found in organization');
        }
        setUserRole(userMember.role);
      } catch (err) {
        console.error('Error fetching organization:', err);
        setError(err instanceof Error ? err : new Error('Unknown error occurred'));
        setOrganization(null);
        setUserRole(null);
      } finally {
        setLoading(false);
      }
    }

    fetchOrganization();
  }, [user?.id]);

  const hasPermission = (requiredRole: UserRole): boolean => {
    if (!userRole) return false;

    const roleHierarchy: Record<UserRole, number> = {
      admin: 3,
      associate: 2,
      guest: 1
    };

    return roleHierarchy[userRole] >= roleHierarchy[requiredRole];
  };

  return {
    organization,
    userRole,
    loading,
    error,
    hasPermission,
    isAdmin: userRole === 'admin',
    isAssociate: hasPermission('associate'),
    isGuest: userRole === 'guest',
  };
} 