'use client';

import { useState, useEffect } from 'react';
import { collection, addDoc, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/hooks/useAuth';
import { Decision, User } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/components/ui/toast';
import { Spinner } from '@/components/ui/spinner';

interface DecisionLoggerProps {
  meetingId: string;
  agendaItemId?: string;
  participants: User[];
}

export function DecisionLogger({ meetingId, agendaItemId, participants }: DecisionLoggerProps) {
  const { user } = useAuth();
  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [loading, setLoading] = useState(true);
  const [newDecision, setNewDecision] = useState({
    title: '',
    description: '',
    status: 'proposed' as Decision['status'],
    selectedParticipants: [] as string[],
  });

  useEffect(() => {
    if (!meetingId || !user) return;

    const decisionsRef = collection(db, 'meetings', meetingId, 'decisions');
    const q = query(decisionsRef, orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const decisionsData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate(),
        updatedAt: doc.data().updatedAt?.toDate(),
      })) as Decision[];
      setDecisions(decisionsData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [meetingId, user]);

  const handleAddDecision = async () => {
    if (!user || !newDecision.title.trim() || !newDecision.description.trim()) return;

    try {
      await addDoc(collection(db, 'meetings', meetingId, 'decisions'), {
        ...newDecision,
        meetingId,
        agendaItemId,
        madeBy: user.id,
        participants: newDecision.selectedParticipants,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      setNewDecision({
        title: '',
        description: '',
        status: 'proposed',
        selectedParticipants: [],
      });

      toast({
        title: 'Success',
        description: 'Decision logged successfully',
      });
    } catch (error) {
      console.error('Error logging decision:', error);
      toast({
        title: 'Error',
        description: 'Failed to log decision',
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return <div className="flex justify-center p-4"><Spinner /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-4">
        <h2 className="text-lg font-semibold mb-4">Log Decision</h2>
        <div className="space-y-4">
          <Input
            placeholder="Decision Title"
            value={newDecision.title}
            onChange={(e) => setNewDecision(prev => ({ ...prev, title: e.target.value }))}
          />
          <Textarea
            placeholder="Decision Description"
            value={newDecision.description}
            onChange={(e) => setNewDecision(prev => ({ ...prev, description: e.target.value }))}
          />
          <select
            value={newDecision.status}
            onChange={(e) => setNewDecision(prev => ({ ...prev, status: e.target.value as Decision['status'] }))}
            className="w-full border rounded p-2"
          >
            <option value="proposed">Proposed</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="deferred">Deferred</option>
          </select>
          <div className="space-y-2">
            <label className="block text-sm font-medium">Participants</label>
            <div className="grid grid-cols-2 gap-2">
              {participants.map((participant) => (
                <label key={participant.id} className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={newDecision.selectedParticipants.includes(participant.id)}
                    onChange={(e) => {
                      const updatedParticipants = e.target.checked
                        ? [...newDecision.selectedParticipants, participant.id]
                        : newDecision.selectedParticipants.filter(id => id !== participant.id);
                      setNewDecision(prev => ({ ...prev, selectedParticipants: updatedParticipants }));
                    }}
                    className="rounded border-gray-300"
                  />
                  <span>{participant.name}</span>
                </label>
              ))}
            </div>
          </div>
          <Button
            onClick={handleAddDecision}
            disabled={!newDecision.title.trim() || !newDecision.description.trim()}
            className="w-full"
          >
            Log Decision
          </Button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-4">
        <h2 className="text-lg font-semibold mb-4">Recent Decisions</h2>
        <div className="space-y-4">
          {decisions.map((decision) => (
            <div key={decision.id} className="border rounded p-4">
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-medium">{decision.title}</h3>
                <span className={`px-2 py-1 rounded text-sm ${
                  decision.status === 'approved' ? 'bg-green-100 text-green-800' :
                  decision.status === 'rejected' ? 'bg-red-100 text-red-800' :
                  decision.status === 'deferred' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-blue-100 text-blue-800'
                }`}>
                  {decision.status.charAt(0).toUpperCase() + decision.status.slice(1)}
                </span>
              </div>
              <p className="text-gray-600 mb-2">{decision.description}</p>
              <div className="text-sm text-gray-500">
                <p>Made by: {participants.find(p => p.id === decision.madeBy)?.name}</p>
                <p>Participants: {decision.participants.map(id => participants.find(p => p.id === id)?.name).join(', ')}</p>
                <p>Date: {decision.createdAt.toLocaleDateString()}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
} 