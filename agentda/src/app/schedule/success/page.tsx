'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Meeting } from '@/types';

export default function ScheduleSuccessPage() {
  const searchParams = useSearchParams();
  const meetingId = searchParams.get('meetingId');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [meeting, setMeeting] = useState<Meeting | null>(null);

  useEffect(() => {
    async function fetchMeetingDetails() {
      if (!meetingId) {
        setError('No meeting ID provided.');
        setLoading(false);
        return;
      }

      try {
        const docRef = doc(db, 'meetings', meetingId);
        const docSnap = await getDoc(docRef);

        if (!docSnap.exists()) {
          setError('Meeting not found.');
          return;
        }

        setMeeting({ id: docSnap.id, ...docSnap.data() } as Meeting);
      } catch (err) {
        console.error('Error fetching meeting details:', err);
        setError('Failed to load meeting details.');
      } finally {
        setLoading(false);
      }
    }

    fetchMeetingDetails();
  }, [meetingId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error || !meeting) {
    return (
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-md mx-auto">
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            {error || 'Something went wrong.'}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-16">
      <div className="max-w-md mx-auto text-center">
        <div className="mb-8">
          <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
            <svg
              className="w-8 h-8 text-green-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
        </div>

        <h1 className="text-2xl font-bold mb-4">Meeting Scheduled!</h1>
        <p className="text-gray-600 mb-8">
          Your meeting has been successfully scheduled. Here are the details:
        </p>

        <div className="bg-white shadow rounded-lg p-6 text-left">
          <div className="space-y-4">
            <div>
              <h2 className="text-sm font-medium text-gray-500">Meeting Title</h2>
              <p className="mt-1">{meeting.title}</p>
            </div>

            <div>
              <h2 className="text-sm font-medium text-gray-500">Date & Time</h2>
              <p className="mt-1">
                {meeting.date.toDate().toLocaleDateString(undefined, {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </p>
              <p className="mt-1">
                {meeting.date.toDate().toLocaleTimeString(undefined, {
                  hour: 'numeric',
                  minute: '2-digit',
                })}
              </p>
            </div>

            <div>
              <h2 className="text-sm font-medium text-gray-500">Duration</h2>
              <p className="mt-1">{meeting.duration} minutes</p>
            </div>

            {meeting.description && (
              <div>
                <h2 className="text-sm font-medium text-gray-500">Description</h2>
                <p className="mt-1">{meeting.description}</p>
              </div>
            )}
          </div>
        </div>

        <p className="mt-8 text-gray-600">
          A calendar invitation will be sent to your email shortly.
        </p>
      </div>
    </div>
  );
} 