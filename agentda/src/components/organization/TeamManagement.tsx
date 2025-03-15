'use client';

import { useState, useEffect } from 'react';
import { collection, doc, getDocs, updateDoc, addDoc, deleteDoc, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/hooks/useAuth';
import { Organization, User, UserRole } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from '@/components/ui/toast';
import { Spinner } from '@/components/ui/spinner';

interface TeamManagementProps {
  organization: Organization;
}

export function TeamManagement({ organization }: TeamManagementProps) {
  const { user } = useAuth();
  const [userDetails, setUserDetails] = useState<{ [key: string]: User }>({});
  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<UserRole>('member');

  useEffect(() => {
    async function fetchMembers() {
      if (!organization) return;

      try {
        // Fetch member details
        const memberPromises = Object.entries(organization.members).map(async ([userId]) => {
          const userDoc = await getDocs(query(collection(db, 'users'), where('id', '==', userId)));
          if (!userDoc.empty) {
            const userData = userDoc.docs[0].data() as User;
            setUserDetails(prev => ({ ...prev, [userId]: userData }));
          }
        });

        await Promise.all(memberPromises);
      } catch (error) {
        console.error('Error fetching members:', error);
        toast({
          title: 'Error',
          description: 'Failed to fetch team members',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    }

    fetchMembers();
  }, [organization]);

  const handleInviteMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim() || !inviteRole) return;

    try {
      // Check if user exists
      const userQuery = query(collection(db, 'users'), where('email', '==', inviteEmail.trim()));
      const userDocs = await getDocs(userQuery);

      if (userDocs.empty) {
        toast({
          title: 'Error',
          description: 'User not found',
          variant: 'destructive',
        });
        return;
      }

      const invitedUser = userDocs.docs[0];
      const orgRef = doc(db, 'organizations', organization.id);

      // Update organization members
      await updateDoc(orgRef, {
        [`members.${invitedUser.id}`]: {
          role: inviteRole,
          joinedAt: new Date(),
        },
      });

      // Update user's organization reference
      await updateDoc(doc(db, 'users', invitedUser.id), {
        organizationId: organization.id,
      });

      toast({
        title: 'Success',
        description: 'Team member added successfully',
      });

      setInviteEmail('');
      setInviteRole('member');
    } catch (error) {
      console.error('Error inviting member:', error);
      toast({
        title: 'Error',
        description: 'Failed to invite team member',
        variant: 'destructive',
      });
    }
  };

  const handleUpdateRole = async (userId: string, newRole: UserRole) => {
    try {
      const orgRef = doc(db, 'organizations', organization.id);
      await updateDoc(orgRef, {
        [`members.${userId}.role`]: newRole,
      });

      toast({
        title: 'Success',
        description: 'Member role updated successfully',
      });
    } catch (error) {
      console.error('Error updating role:', error);
      toast({
        title: 'Error',
        description: 'Failed to update member role',
        variant: 'destructive',
      });
    }
  };

  const handleRemoveMember = async (userId: string) => {
    try {
      const orgRef = doc(db, 'organizations', organization.id);
      
      // Remove member from organization
      const updatedMembers = { ...organization.members };
      delete updatedMembers[userId];
      await updateDoc(orgRef, { members: updatedMembers });

      // Remove organization reference from user
      await updateDoc(doc(db, 'users', userId), {
        organizationId: null,
      });

      toast({
        title: 'Success',
        description: 'Team member removed successfully',
      });
    } catch (error) {
      console.error('Error removing member:', error);
      toast({
        title: 'Error',
        description: 'Failed to remove team member',
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return <Spinner />;
  }

  const isOwner = user?.id === organization.ownerId;
  const isAdmin = organization.members[user?.id || '']?.role === 'admin';
  const canManageMembers = isOwner || isAdmin;

  return (
    <div className="space-y-6">
      {canManageMembers && (
        <form onSubmit={handleInviteMember} className="space-y-4 bg-white p-4 rounded-lg shadow">
          <h3 className="font-semibold">Invite Team Member</h3>
          <div className="flex gap-4">
            <Input
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="Email address"
              className="flex-1"
              required
            />
            <select
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value as UserRole)}
              className="px-3 py-2 border rounded-md"
              required
            >
              <option value="member">Member</option>
              <option value="admin">Admin</option>
              <option value="guest">Guest</option>
            </select>
            <Button type="submit">Invite</Button>
          </div>
        </form>
      )}

      <div className="bg-white p-4 rounded-lg shadow">
        <h3 className="font-semibold mb-4">Team Members</h3>
        <div className="space-y-4">
          {Object.entries(organization.members).map(([userId, member]) => {
            const memberDetails = userDetails[userId];
            if (!memberDetails) return null;

            return (
              <div
                key={userId}
                className="flex items-center justify-between p-2 bg-gray-50 rounded"
              >
                <div>
                  <p className="font-medium">{memberDetails.name}</p>
                  <p className="text-sm text-gray-500">{memberDetails.email}</p>
                </div>
                <div className="flex items-center gap-4">
                  {canManageMembers && userId !== organization.ownerId && (
                    <>
                      <select
                        value={member.role}
                        onChange={(e) =>
                          handleUpdateRole(userId, e.target.value as UserRole)
                        }
                        className="px-2 py-1 border rounded text-sm"
                      >
                        <option value="member">Member</option>
                        <option value="admin">Admin</option>
                        <option value="guest">Guest</option>
                      </select>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleRemoveMember(userId)}
                      >
                        Remove
                      </Button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
} 