'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { addDoc, collection, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/hooks/useAuth';
import type { Meeting } from '@/types';

interface MeetingFormProps {
  onSuccess?: (meetingId: string) => void;
}

export default function MeetingForm({ onSuccess }: MeetingFormProps) {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    date: '',
    time: '',
    duration: 30,
    participants: [] as string[],
    agendaNotes: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    setError('');

    try {
      const [hours, minutes] = formData.time.split(':').map(Number);
      const meetingDate = new Date(formData.date);
      meetingDate.setHours(hours, minutes);

      const meetingData: Omit<Meeting, 'id'> = {
        title: formData.title,
        description: formData.description,
        date: Timestamp.fromDate(meetingDate),
        duration: formData.duration,
        organizer: user.uid,
        participants: [...formData.participants, user.uid],
        status: 'scheduled',
        hasAgenda: Boolean(formData.agendaNotes.trim()),
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      };

      const docRef = await addDoc(collection(db, 'meetings'), meetingData);

      if (formData.agendaNotes) {
        await addDoc(collection(db, 'agendaItems'), {
          meetingId: docRef.id,
          title: 'Initial Agenda',
          description: formData.agendaNotes,
          duration: formData.duration,
          order: 0,
          status: 'pending',
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
        });
      }

      if (onSuccess) {
        onSuccess(docRef.id);
      } else {
        router.push(`/meetings/${docRef.id}`);
      }
    } catch (err) {
      console.error('Error creating meeting:', err);
      setError('Failed to create meeting. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      <div>
        <label htmlFor="title" className="block text-sm font-medium mb-1">
          Meeting Title
        </label>
        <input
          type="text"
          id="title"
          value={formData.title}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, title: e.target.value }))
          }
          className="w-full px-3 py-2 border rounded-md"
          required
        />
      </div>

      <div>
        <label htmlFor="description" className="block text-sm font-medium mb-1">
          Description
        </label>
        <textarea
          id="description"
          value={formData.description}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, description: e.target.value }))
          }
          className="w-full px-3 py-2 border rounded-md"
          rows={3}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="date" className="block text-sm font-medium mb-1">
            Date
          </label>
          <input
            type="date"
            id="date"
            value={formData.date}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, date: e.target.value }))
            }
            className="w-full px-3 py-2 border rounded-md"
            required
          />
        </div>

        <div>
          <label htmlFor="time" className="block text-sm font-medium mb-1">
            Time
          </label>
          <input
            type="time"
            id="time"
            value={formData.time}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, time: e.target.value }))
            }
            className="w-full px-3 py-2 border rounded-md"
            required
          />
        </div>
      </div>

      <div>
        <label htmlFor="duration" className="block text-sm font-medium mb-1">
          Duration (minutes)
        </label>
        <select
          id="duration"
          value={formData.duration}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, duration: Number(e.target.value) }))
          }
          className="w-full px-3 py-2 border rounded-md"
        >
          <option value={15}>15 minutes</option>
          <option value={30}>30 minutes</option>
          <option value={45}>45 minutes</option>
          <option value={60}>1 hour</option>
          <option value={90}>1.5 hours</option>
          <option value={120}>2 hours</option>
        </select>
      </div>

      <div>
        <label htmlFor="participants" className="block text-sm font-medium mb-1">
          Participants (Email addresses, comma-separated)
        </label>
        <input
          type="text"
          id="participants"
          value={formData.participants.join(', ')}
          onChange={(e) =>
            setFormData((prev) => ({
              ...prev,
              participants: e.target.value.split(',').map((email) => email.trim()),
            }))
          }
          className="w-full px-3 py-2 border rounded-md"
          placeholder="email@example.com, another@example.com"
        />
      </div>

      <div>
        <label htmlFor="agendaNotes" className="block text-sm font-medium mb-1">
          Agenda Notes
        </label>
        <textarea
          id="agendaNotes"
          value={formData.agendaNotes}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, agendaNotes: e.target.value }))
          }
          className="w-full px-3 py-2 border rounded-md"
          rows={4}
          placeholder="Add initial agenda items or notes..."
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-blue-500 text-white py-2 rounded-md hover:bg-blue-600 transition-colors disabled:opacity-50"
      >
        {loading ? 'Creating Meeting...' : 'Create Meeting'}
      </button>
    </form>
  );
} 