import { useState, useEffect } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { useAuth } from '@/hooks/useAuth';
import type { Organization, UserRole } from '@/types';

export function usePermissions(organizationId: string) {
  const { user } = useAuth();
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    async function fetchUserRole() {
      if (!user || !organizationId) {
        setUserRole(null);
        setLoading(false);
        return;
      }

      try {
        const orgDoc = await getDoc(doc(db, 'organizations', organizationId));
        if (!orgDoc.exists()) {
          setUserRole(null);
          setError(new Error('Organization not found'));
          return;
        }

        const org = orgDoc.data() as Organization;
        const member = org.members.find(m => m.userId === user.id);
        if (!member) {
          setUserRole(null);
          setError(new Error('User is not a member of this organization'));
          return;
        }
        setUserRole(member.role);
        setError(null);
      } catch (err) {
        console.error('Error fetching user role:', err);
        setError(err instanceof Error ? err : new Error('Unknown error occurred'));
        setUserRole(null);
      } finally {
        setLoading(false);
      }
    }

    fetchUserRole();
  }, [user, organizationId]);

  const isAdmin = userRole === 'admin';
  const isAssociate = userRole === 'associate';
  const isGuest = userRole === 'guest';
  const hasAccess = !!userRole;

  return {
    userRole,
    loading,
    error,
    isAdmin,
    isAssociate,
    isGuest,
    hasAccess,
  };
} 