'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/hooks/useAuth';
import { Meeting, User } from '@/types';
import { MeetingCollaboration } from '@/components/meetings/MeetingCollaboration';
import { Spinner } from '@/components/ui/spinner';

export default function MeetingPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [participants, setParticipants] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchMeetingAndParticipants() {
      if (!id || !user) return;

      try {
        // Fetch meeting data
        const meetingDoc = await getDoc(doc(db, 'meetings', id as string));
        if (!meetingDoc.exists()) {
          throw new Error('Meeting not found');
        }
        const meetingData = { id: meetingDoc.id, ...meetingDoc.data() } as Meeting;
        setMeeting(meetingData);

        // Fetch participants data
        const participantPromises = meetingData.participants.map(async (userId) => {
          const userDoc = await getDoc(doc(db, 'users', userId));
          if (!userDoc.exists()) return null;
          return { id: userDoc.id, ...userDoc.data() } as User;
        });

        const participantData = (await Promise.all(participantPromises)).filter(
          (p): p is User => p !== null
        );
        setParticipants(participantData);
      } catch (error) {
        console.error('Error fetching meeting data:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchMeetingAndParticipants();
  }, [id, user]);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Spinner />
      </div>
    );
  }

  if (!meeting) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <p className="text-red-500">Meeting not found</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-6">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900">{meeting.title}</h1>
            {meeting.description && (
              <p className="mt-1 text-sm text-gray-500">{meeting.description}</p>
            )}
            <div className="mt-2 text-sm text-gray-500">
              {new Date(meeting.date.toDate()).toLocaleString()}
              {' · '}
              {meeting.duration} minutes
            </div>
          </div>
          <MeetingCollaboration meeting={meeting} participants={participants} />
        </div>
      </div>
    </div>
  );
} 