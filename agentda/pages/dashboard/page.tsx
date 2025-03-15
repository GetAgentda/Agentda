"use client";

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Meeting } from '@/types';

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace('/login');
    }
  }, [status, router]);

  useEffect(() => {
    const fetchMeetings = async () => {
      if (!session?.user?.id) return;

      try {
        const response = await fetch('/api/meetings');
        if (!response.ok) {
          throw new Error('Failed to fetch meetings');
        }
        const data = await response.json();
        setMeetings(data.meetings);
      } catch (err) {
        setError('Failed to load meetings');
        console.error('Error fetching meetings:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMeetings();
  }, [session?.user?.id]);

  if (status === 'loading' || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-600">Loading...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-red-500 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="text-blue-600 hover:text-blue-500"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Your Meetings</h1>
          <Link
            href="/meetings/new"
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
          >
            New Meeting
          </Link>
        </div>

        {meetings.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg shadow">
            <p className="text-gray-600 mb-4">No meetings scheduled</p>
            <Link
              href="/meetings/new"
              className="text-blue-600 hover:text-blue-500"
            >
              Schedule your first meeting
            </Link>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {meetings.map((meeting) => (
              <Link
                key={meeting.id}
                href={`/meetings/${meeting.id}`}
                className="block bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow"
              >
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {meeting.title}
                </h3>
                <p className="text-gray-600 mb-4">
                  {new Date(meeting.startTime).toLocaleString()}
                </p>
                <div className="flex items-center text-sm text-gray-500">
                  <span className="mr-2">
                    {meeting.participants?.length || 0} participants
                  </span>
                  <span
                    className={`px-2 py-1 rounded-full text-xs ${
                      meeting.status === 'completed'
                        ? 'bg-green-100 text-green-800'
                        : meeting.status === 'cancelled'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-blue-100 text-blue-800'
                    }`}
                  >
                    {meeting.status}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
} 