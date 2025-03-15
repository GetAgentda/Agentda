'use client';

import { useState, useEffect } from 'react';
import { collection, addDoc, onSnapshot, query, orderBy, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/hooks/useAuth';
import { MeetingSummary as MeetingSummaryType, Decision, ActionItem, User } from '@/types';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/components/ui/toast';
import { Spinner } from '@/components/ui/spinner';

interface MeetingSummaryProps {
  meetingId: string;
  participants: User[];
}

export function MeetingSummary({ meetingId, participants }: MeetingSummaryProps) {
  const { user } = useAuth();
  const [summary, setSummary] = useState<MeetingSummaryType | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [newSummary, setNewSummary] = useState('');

  useEffect(() => {
    if (!meetingId || !user) return;

    const summaryRef = collection(db, 'meetings', meetingId, 'summaries');
    const q = query(summaryRef, orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        const summaryData = {
          id: snapshot.docs[0].id,
          ...snapshot.docs[0].data(),
          createdAt: snapshot.docs[0].data().createdAt?.toDate(),
          updatedAt: snapshot.docs[0].data().updatedAt?.toDate(),
        } as MeetingSummaryType;
        setSummary(summaryData);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [meetingId, user]);

  const generateSummary = async () => {
    if (!user || !meetingId) return;

    setGenerating(true);
    try {
      // Fetch decisions and action items
      const [decisionsSnapshot, actionItemsSnapshot] = await Promise.all([
        getDocs(collection(db, 'meetings', meetingId, 'decisions')),
        getDocs(collection(db, 'meetings', meetingId, 'actionItems')),
      ]);

      const decisions = decisionsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate(),
        updatedAt: doc.data().updatedAt?.toDate(),
      })) as Decision[];

      const actionItems = actionItemsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate(),
        updatedAt: doc.data().updatedAt?.toDate(),
      })) as ActionItem[];

      // Generate summary text
      const summaryText = `Meeting Summary:
      
Key Decisions:
${decisions.map(d => `- ${d.title}: ${d.description} (Status: ${d.status})`).join('\n')}

Action Items:
${actionItems.map(a => `- ${a.title} (Assigned to: ${participants.find(p => p.id === a.assignedTo)?.name})`).join('\n')}

Next Steps:
${actionItems.filter(a => a.status === 'pending').map(a => `- ${a.title}`).join('\n')}`;

      // Save summary
      await addDoc(collection(db, 'meetings', meetingId, 'summaries'), {
        meetingId,
        summary: summaryText,
        keyDecisions: decisions,
        actionItems,
        nextSteps: actionItems.filter(a => a.status === 'pending').map(a => a.title),
        createdBy: user.id,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      toast({
        title: 'Success',
        description: 'Meeting summary generated successfully',
      });
    } catch (error) {
      console.error('Error generating summary:', error);
      toast({
        title: 'Error',
        description: 'Failed to generate meeting summary',
        variant: 'destructive',
      });
    } finally {
      setGenerating(false);
    }
  };

  const handleUpdateSummary = async () => {
    if (!user || !meetingId || !newSummary.trim()) return;

    try {
      await addDoc(collection(db, 'meetings', meetingId, 'summaries'), {
        meetingId,
        summary: newSummary,
        keyDecisions: summary?.keyDecisions || [],
        actionItems: summary?.actionItems || [],
        nextSteps: summary?.nextSteps || [],
        createdBy: user.id,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      setNewSummary('');
      toast({
        title: 'Success',
        description: 'Meeting summary updated successfully',
      });
    } catch (error) {
      console.error('Error updating summary:', error);
      toast({
        title: 'Error',
        description: 'Failed to update meeting summary',
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
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">Meeting Summary</h2>
          <Button
            onClick={generateSummary}
            disabled={generating}
          >
            {generating ? <Spinner className="mr-2" /> : null}
            Generate Summary
          </Button>
        </div>

        {summary ? (
          <div className="space-y-4">
            <div className="prose max-w-none">
              <pre className="whitespace-pre-wrap">{summary.summary}</pre>
            </div>
            <div className="text-sm text-gray-500">
              <p>Last updated: {summary.updatedAt.toLocaleDateString()}</p>
              <p>Created by: {participants.find(p => p.id === summary.createdBy)?.name}</p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <Textarea
              placeholder="Enter meeting summary..."
              value={newSummary}
              onChange={(e) => setNewSummary(e.target.value)}
              className="min-h-[200px]"
            />
            <Button
              onClick={handleUpdateSummary}
              disabled={!newSummary.trim()}
              className="w-full"
            >
              Save Summary
            </Button>
          </div>
        )}
      </div>
    </div>
  );
} 