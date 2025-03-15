'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { doc, collection, addDoc, updateDoc, deleteDoc, query, where, getDocs, getDoc, DocumentSnapshot, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { sendMeetingCancellation, sendMeetingRescheduleRequest, sendMeetingConfirmation } from '@/lib/email';
import type { Meeting, User } from '@/types';

interface AIAssistantProps {
  meetings: Meeting[];
  onAction: (action: 'refresh' | 'select-date', payload?: any) => void;
}

export default function AIAssistant({ meetings, onAction }: AIAssistantProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [userData, setUserData] = useState<User | null>(null);

  useEffect(() => {
    async function fetchUserData() {
      if (!user?.uid) return;

      try {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          setUserData({ id: userDoc.id, ...userDoc.data() } as User);
        }
      } catch (err) {
        console.error('Error fetching user data:', err);
      }
    }

    fetchUserData();
  }, [user?.uid]);

  const handleFindAvailableSlots = async () => {
    setLoading(true);
    setError('');

    try {
      // Get all meetings in the next 2 weeks
      const twoWeeksFromNow = new Date();
      twoWeeksFromNow.setDate(twoWeeksFromNow.getDate() + 14);

      // Create a map of busy times
      const busyTimes = meetings.reduce((acc, meeting) => {
        const date = meeting.date.toDate();
        const key = date.toISOString().split('T')[0];
        if (!acc[key]) acc[key] = [];
        acc[key].push({
          start: date,
          end: new Date(date.getTime() + meeting.duration * 60000),
        });
        return acc;
      }, {} as Record<string, { start: Date; end: Date }[]>);

      // Use user's preferred slot interval or default to 30 minutes
      const slotInterval = userData?.preferences?.defaultSlotInterval || 30;
      
      // Use user's working hours or default to 9 AM - 5 PM
      const workingHours = userData?.preferences?.workingHours || {
        start: '09:00',
        end: '17:00'
      };
      const [startHour] = workingHours.start.split(':').map(Number);
      const [endHour] = workingHours.end.split(':').map(Number);

      // Find available slots
      const availableSlots = [];
      const current = new Date();
      current.setHours(startHour, 0, 0, 0);

      while (current <= twoWeeksFromNow) {
        if (current.getDay() !== 0 && current.getDay() !== 6) { // Skip weekends
          const dateKey = current.toISOString().split('T')[0];
          const daySlots = busyTimes[dateKey] || [];
          
          for (let hour = startHour; hour < endHour; hour++) {
            for (let minute = 0; minute < 60; minute += slotInterval) {
              const slotStart = new Date(current);
              slotStart.setHours(hour, minute);
              const slotEnd = new Date(slotStart.getTime() + slotInterval * 60000);

              const isAvailable = !daySlots.some(
                busy => slotStart < busy.end && slotEnd > busy.start
              );

              if (isAvailable && slotStart > new Date()) {
                availableSlots.push({
                  date: dateKey,
                  time: `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`,
                });
              }
            }
          }
        }
        current.setDate(current.getDate() + 1);
        current.setHours(startHour, 0, 0, 0);
      }

      // Create a scheduling link with the available slots
      const schedulingData = {
        title: 'Available Meeting Slots',
        description: 'AI-suggested available time slots for your meeting',
        duration: slotInterval,
        availableSlots,
        organizer: user?.uid,
        createdAt: Timestamp.now(),
      };

      const docRef = await addDoc(collection(db, 'schedulingLinks'), schedulingData);
      const linkUrl = `${window.location.origin}/schedule/${docRef.id}`;

      setMessage(`I've found ${availableSlots.length} available time slots in the next 2 weeks. You can share this scheduling link: ${linkUrl}`);
    } catch (err) {
      console.error('Error finding available slots:', err);
      setError('Failed to find available time slots. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelMeeting = async (meetingId: string) => {
    setLoading(true);
    setError('');

    try {
      const meetingRef = doc(db, 'meetings', meetingId);
      const meetingSnap = await getDoc(meetingRef);
      
      if (!meetingSnap.exists()) {
        throw new Error('Meeting not found');
      }

      const meeting = { id: meetingSnap.id, ...meetingSnap.data() } as Meeting;

      // Get participant emails
      const participantDocs = await Promise.all(
        meeting.participants.map(userId => 
          getDoc(doc(db, 'users', userId))
        )
      );

      const participantEmails = participantDocs
        .filter((doc: DocumentSnapshot) => doc.exists())
        .map((doc: DocumentSnapshot) => doc.data()?.email);

      // Update meeting status
      await updateDoc(meetingRef, {
        status: 'cancelled',
        updatedAt: Timestamp.now(),
      });

      // Send cancellation emails
      await sendMeetingCancellation(meeting, participantEmails);

      setMessage('Meeting has been cancelled and notifications have been sent to participants.');
      onAction('refresh');
    } catch (err) {
      console.error('Error cancelling meeting:', err);
      setError('Failed to cancel the meeting. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleRescheduleMeeting = async (meetingId: string) => {
    setLoading(true);
    setError('');

    try {
      const meetingRef = doc(db, 'meetings', meetingId);
      const meetingSnap = await getDoc(meetingRef);

      if (!meetingSnap.exists()) {
        throw new Error('Meeting not found');
      }

      const meeting = { id: meetingSnap.id, ...meetingSnap.data() } as Meeting;

      // Get participant emails
      const participantDocs = await Promise.all(
        meeting.participants.map(userId => 
          getDoc(doc(db, 'users', userId))
        )
      );

      const participantEmails = participantDocs
        .filter((doc: DocumentSnapshot) => doc.exists())
        .map((doc: DocumentSnapshot) => doc.data()?.email);

      // Create a new scheduling link for rescheduling
      const schedulingData = {
        title: `Reschedule: ${meeting.title}`,
        description: meeting.description,
        duration: meeting.duration,
        availableSlots: [], // This will be populated by handleFindAvailableSlots logic
        organizer: meeting.organizer,
        createdAt: Timestamp.now(),
      };

      const docRef = await addDoc(collection(db, 'schedulingLinks'), schedulingData);
      const linkUrl = `${window.location.origin}/schedule/${docRef.id}`;

      // Update the original meeting status
      await updateDoc(meetingRef, {
        status: 'cancelled',
        updatedAt: Timestamp.now(),
      });

      // Send rescheduling emails
      await sendMeetingRescheduleRequest(meeting, participantEmails, linkUrl);

      setMessage('The meeting has been marked for rescheduling and notifications have been sent to participants.');
      onAction('refresh');
    } catch (err) {
      console.error('Error rescheduling meeting:', err);
      setError('Failed to reschedule the meeting. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex space-x-4">
        <button
          onClick={handleFindAvailableSlots}
          disabled={loading}
          className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50"
        >
          Find Available Time Slots
        </button>
        <button
          onClick={() => {
            const meetingId = prompt('Enter meeting ID to cancel:');
            if (meetingId) handleCancelMeeting(meetingId);
          }}
          disabled={loading}
          className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 disabled:opacity-50"
        >
          Cancel a Meeting
        </button>
        <button
          onClick={() => {
            const meetingId = prompt('Enter meeting ID to reschedule:');
            if (meetingId) handleRescheduleMeeting(meetingId);
          }}
          disabled={loading}
          className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 disabled:opacity-50"
        >
          Reschedule Meeting
        </button>
      </div>

      {loading && (
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      )}

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {message && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
          {message}
        </div>
      )}
    </div>
  );
} 