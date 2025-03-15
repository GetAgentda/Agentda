'use client';

import { useState } from 'react';
import { addDoc, collection, doc, getDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/hooks/useAuth';
import type { Meeting } from '@/types';

interface SchedulingLinkProps {
  onSuccess?: (meetingId: string) => void;
}

interface TimeSlot {
  date: string;
  time: string;
}

export default function SchedulingLink({ onSuccess }: SchedulingLinkProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [linkGenerated, setLinkGenerated] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    duration: 30,
    availableSlots: [] as TimeSlot[],
  });

  const generateLink = async () => {
    if (!user) return;

    setLoading(true);
    setError('');

    try {
      const schedulingData = {
        title: formData.title,
        description: formData.description,
        duration: formData.duration,
        availableSlots: formData.availableSlots,
        organizer: user.uid,
        createdAt: Timestamp.now(),
      };

      const docRef = await addDoc(collection(db, 'schedulingLinks'), schedulingData);
      const linkUrl = `${window.location.origin}/schedule/${docRef.id}`;
      
      setLinkGenerated(true);
      navigator.clipboard.writeText(linkUrl);
    } catch (err) {
      console.error('Error generating scheduling link:', err);
      setError('Failed to generate scheduling link. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const addTimeSlot = () => {
    setFormData((prev) => ({
      ...prev,
      availableSlots: [
        ...prev.availableSlots,
        { date: '', time: '' },
      ],
    }));
  };

  const removeTimeSlot = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      availableSlots: prev.availableSlots.filter((_, i) => i !== index),
    }));
  };

  const updateTimeSlot = (index: number, field: keyof TimeSlot, value: string) => {
    setFormData((prev) => ({
      ...prev,
      availableSlots: prev.availableSlots.map((slot, i) =>
        i === index ? { ...slot, [field]: value } : slot
      ),
    }));
  };

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {linkGenerated ? (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
          Scheduling link has been copied to your clipboard!
        </div>
      ) : (
        <form onSubmit={(e) => { e.preventDefault(); generateLink(); }} className="space-y-6">
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
            <div className="flex justify-between items-center mb-2">
              <label className="block text-sm font-medium">Available Time Slots</label>
              <button
                type="button"
                onClick={addTimeSlot}
                className="text-blue-500 hover:text-blue-600 text-sm"
              >
                + Add Time Slot
              </button>
            </div>
            <div className="space-y-3">
              {formData.availableSlots.map((slot, index) => (
                <div key={index} className="flex gap-4 items-start">
                  <div className="flex-1">
                    <input
                      type="date"
                      value={slot.date}
                      onChange={(e) => updateTimeSlot(index, 'date', e.target.value)}
                      className="w-full px-3 py-2 border rounded-md"
                      required
                    />
                  </div>
                  <div className="flex-1">
                    <input
                      type="time"
                      value={slot.time}
                      onChange={(e) => updateTimeSlot(index, 'time', e.target.value)}
                      className="w-full px-3 py-2 border rounded-md"
                      required
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => removeTimeSlot(index)}
                    className="text-red-500 hover:text-red-600"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || formData.availableSlots.length === 0}
            className="w-full bg-blue-500 text-white py-2 rounded-md hover:bg-blue-600 transition-colors disabled:opacity-50"
          >
            {loading ? 'Generating Link...' : 'Generate Scheduling Link'}
          </button>
        </form>
      )}
    </div>
  );
} 