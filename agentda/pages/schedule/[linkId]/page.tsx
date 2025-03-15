'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { doc, getDoc, updateDoc, addDoc, collection, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Meeting } from '@/types';

interface TimeSlot {
  date: string;
  time: string;
}

interface SchedulingData {
  title: string;
  description: string;
  duration: number;
  availableSlots: TimeSlot[];
  organizer: string;
  createdAt: Timestamp;
}

export default function SchedulePage({ params }: { params: { linkId: string } }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [schedulingData, setSchedulingData] = useState<SchedulingData | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    notes: '',
  });

  useEffect(() => {
    async function fetchSchedulingData() {
      try {
        const docRef = doc(db, 'schedulingLinks', params.linkId);
        const docSnap = await getDoc(docRef);

        if (!docSnap.exists()) {
          setError('This scheduling link is invalid or has expired.');
          return;
        }

        setSchedulingData(docSnap.data() as SchedulingData);
      } catch (err) {
        console.error('Error fetching scheduling data:', err);
        setError('Failed to load scheduling information.');
      } finally {
        setLoading(false);
      }
    }

    fetchSchedulingData();
  }, [params.linkId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!schedulingData || !selectedSlot) return;

    setLoading(true);
    setError('');

    try {
      // Create the meeting
      const meetingDate = new Date(`${selectedSlot.date}T${selectedSlot.time}`);
      
      const meetingData: Omit<Meeting, 'id'> = {
        title: schedulingData.title,
        description: schedulingData.description,
        date: Timestamp.fromDate(meetingDate),
        duration: schedulingData.duration,
        organizer: schedulingData.organizer,
        participants: [formData.email],
        status: 'scheduled',
        hasAgenda: false,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      };

      const meetingRef = await addDoc(collection(db, 'meetings'), meetingData);

      // Update the scheduling link to remove the used time slot
      const linkRef = doc(db, 'schedulingLinks', params.linkId);
      await updateDoc(linkRef, {
        availableSlots: schedulingData.availableSlots.filter(
          slot => slot.date !== selectedSlot.date || slot.time !== selectedSlot.time
        ),
      });

      // Redirect to success page
      router.push(`/schedule/success?meetingId=${meetingRef.id}`);
    } catch (err) {
      console.error('Error scheduling meeting:', err);
      setError('Failed to schedule the meeting. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error || !schedulingData) {
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
      <div className="max-w-md mx-auto">
        <h1 className="text-2xl font-bold mb-6">{schedulingData.title}</h1>
        
        {schedulingData.description && (
          <p className="text-gray-600 mb-8">{schedulingData.description}</p>
        )}

        <div className="mb-8">
          <h2 className="text-lg font-medium mb-4">Select a Time</h2>
          <div className="space-y-2">
            {schedulingData.availableSlots.map((slot, index) => (
              <button
                key={index}
                onClick={() => setSelectedSlot(slot)}
                className={`w-full p-4 text-left border rounded-lg ${
                  selectedSlot === slot
                    ? 'border-blue-500 bg-blue-50'
                    : 'hover:border-gray-400'
                }`}
              >
                <div className="font-medium">
                  {new Date(`${slot.date}T${slot.time}`).toLocaleDateString(
                    undefined,
                    { weekday: 'long', month: 'long', day: 'numeric' }
                  )}
                </div>
                <div className="text-gray-600">
                  {new Date(`${slot.date}T${slot.time}`).toLocaleTimeString(
                    undefined,
                    { hour: 'numeric', minute: '2-digit' }
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>

        {selectedSlot && (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="name" className="block text-sm font-medium mb-1">
                Your Name
              </label>
              <input
                type="text"
                id="name"
                value={formData.name}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, name: e.target.value }))
                }
                className="w-full px-3 py-2 border rounded-md"
                required
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium mb-1">
                Your Email
              </label>
              <input
                type="email"
                id="email"
                value={formData.email}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, email: e.target.value }))
                }
                className="w-full px-3 py-2 border rounded-md"
                required
              />
            </div>

            <div>
              <label htmlFor="notes" className="block text-sm font-medium mb-1">
                Additional Notes
              </label>
              <textarea
                id="notes"
                value={formData.notes}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, notes: e.target.value }))
                }
                className="w-full px-3 py-2 border rounded-md"
                rows={3}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-500 text-white py-2 rounded-md hover:bg-blue-600 transition-colors disabled:opacity-50"
            >
              {loading ? 'Scheduling...' : 'Schedule Meeting'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
} 