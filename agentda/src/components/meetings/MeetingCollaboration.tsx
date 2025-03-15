'use client';

import { useState, useEffect, useRef } from 'react';
import { doc, collection, onSnapshot, addDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '@/lib/firebase';
import { useAuth } from '@/hooks/useAuth';
import { usePermissions } from '@/hooks/usePermissions';
import { Meeting, User, AgendaItem, ActionItem } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Spinner } from '@/components/ui/spinner';
import { toast } from '@/components/ui/toast';
import { AgendaBuilder } from '@/components/agenda/AgendaBuilder';
import { DecisionLogger } from './DecisionLogger';
import { MeetingSummary } from './MeetingSummary';
import { Timestamp } from 'firebase/firestore';

interface Message {
  id: string;
  content: string;
  sender: string;
  senderName: string;
  timestamp: Timestamp;
}

interface Attachment {
  id: string;
  name: string;
  url: string;
  type: string;
  size: number;
  uploadedBy: string;
  uploadedAt: Timestamp;
}

interface MeetingCollaborationProps {
  meeting: Meeting;
  participants: User[];
}

export function MeetingCollaboration({ meeting, participants }: MeetingCollaborationProps) {
  const { user } = useAuth();
  const { isAdmin, isAssociate, isGuest, hasAccess, loading: permissionsLoading } = usePermissions(meeting.organizerId);
  const [messages, setMessages] = useState<Message[]>([]);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [actionItems, setActionItems] = useState<ActionItem[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [newActionItem, setNewActionItem] = useState('');
  const [assignee, setAssignee] = useState('');
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!meeting.id || !user) return;

    // Subscribe to messages
    const messagesQuery = collection(db, `meetings/${meeting.id}/messages`);
    const unsubscribeMessages = onSnapshot(messagesQuery, (snapshot) => {
      const newMessages = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().timestamp?.toDate(),
      })) as Message[];
      setMessages(newMessages);
    });

    // Subscribe to attachments
    const attachmentsQuery = collection(db, `meetings/${meeting.id}/attachments`);
    const unsubscribeAttachments = onSnapshot(attachmentsQuery, (snapshot) => {
      const newAttachments = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        uploadedAt: doc.data().uploadedAt?.toDate(),
      })) as Attachment[];
      setAttachments(newAttachments);
    });

    // Subscribe to action items
    const actionItemsQuery = collection(db, `meetings/${meeting.id}/actionItems`);
    const unsubscribeActionItems = onSnapshot(actionItemsQuery, (snapshot) => {
      const newActionItems = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        dueDate: doc.data().dueDate?.toDate(),
        createdAt: doc.data().createdAt?.toDate(),
        updatedAt: doc.data().updatedAt?.toDate(),
      })) as ActionItem[];
      setActionItems(newActionItems);
    });

    setLoading(false);

    return () => {
      unsubscribeMessages();
      unsubscribeAttachments();
      unsubscribeActionItems();
    };
  }, [meeting.id, user]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newMessage.trim()) return;

    try {
      await addDoc(collection(db, `meetings/${meeting.id}/messages`), {
        content: newMessage.trim(),
        sender: user.id,
        senderName: user.name || 'Anonymous',
        timestamp: serverTimestamp(),
      });
      setNewMessage('');
    } catch (err) {
      console.error('Error sending message:', err);
      toast({
        title: 'Error',
        description: 'Failed to send message',
        variant: 'destructive',
      });
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setUploading(true);
    try {
      const storageRef = ref(storage, `meetings/${meeting.id}/attachments/${file.name}`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);

      await addDoc(collection(db, `meetings/${meeting.id}/attachments`), {
        name: file.name,
        url,
        type: file.type,
        size: file.size,
        uploadedBy: user.id,
        uploadedAt: serverTimestamp(),
      });

      toast({
        title: 'Success',
        description: 'File uploaded successfully',
      });
    } catch (err) {
      console.error('Error uploading file:', err);
      toast({
        title: 'Error',
        description: 'Failed to upload file',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleAddActionItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newActionItem.trim() || !assignee) return;

    try {
      await addDoc(collection(db, `meetings/${meeting.id}/actionItems`), {
        title: newActionItem.trim(),
        assignedTo: assignee,
        status: 'pending',
        createdBy: user.id,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      setNewActionItem('');
      setAssignee('');
    } catch (err) {
      console.error('Error adding action item:', err);
      toast({
        title: 'Error',
        description: 'Failed to add action item',
        variant: 'destructive',
      });
    }
  };

  if (loading || permissionsLoading) {
    return <Spinner />;
  }

  if (!hasAccess) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">You don't have access to this meeting.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div className="md:col-span-2 space-y-6">
        <AgendaBuilder meetingId={meeting.id} readOnly={isGuest} />
        <DecisionLogger meetingId={meeting.id} participants={participants} />
        <MeetingSummary meetingId={meeting.id} participants={participants} />
      </div>

      <div className="space-y-6">
        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="font-semibold mb-4">Chat</h3>
          <div
            ref={chatContainerRef}
            className="h-64 overflow-y-auto mb-4 space-y-2"
          >
            {messages.map((message) => (
              <div
                key={message.id}
                className={`p-2 rounded-lg ${
                  message.sender === user?.id
                    ? 'bg-blue-100 ml-8'
                    : 'bg-gray-100 mr-8'
                }`}
              >
                <p className="text-sm font-medium">{message.senderName}</p>
                <p className="text-sm">{message.content}</p>
                <p className="text-xs text-gray-500">
                  {message.timestamp.toDate().toLocaleTimeString()}
                </p>
              </div>
            ))}
          </div>
          <form onSubmit={handleSendMessage} className="flex gap-2">
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type a message..."
              className="flex-1"
            />
            <Button type="submit" disabled={!newMessage.trim()}>
              Send
            </Button>
          </form>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="font-semibold mb-4">Attachments</h3>
          <div className="space-y-2 mb-4">
            {attachments.map((attachment) => (
              <a
                key={attachment.id}
                href={attachment.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center p-2 hover:bg-gray-50 rounded"
              >
                <span className="flex-1 truncate">{attachment.name}</span>
                <span className="text-sm text-gray-500">
                  {(attachment.size / 1024).toFixed(1)} KB
                </span>
              </a>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              className="hidden"
            />
            <Button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="w-full"
            >
              {uploading ? 'Uploading...' : 'Upload File'}
            </Button>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="font-semibold mb-4">Action Items</h3>
          <div className="space-y-2 mb-4">
            {actionItems.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between p-2 bg-gray-50 rounded"
              >
                <div>
                  <p className="font-medium">{item.title}</p>
                  <p className="text-sm text-gray-500">
                    Assigned to:{' '}
                    {participants.find((p) => p.id === item.assignedTo)?.name ||
                      'Unknown'}
                  </p>
                </div>
                <span
                  className={`text-xs px-2 py-1 rounded ${
                    item.status === 'completed'
                      ? 'bg-green-100 text-green-800'
                      : item.status === 'in-progress'
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  {item.status}
                </span>
              </div>
            ))}
          </div>
          <form onSubmit={handleAddActionItem} className="space-y-2">
            <Input
              value={newActionItem}
              onChange={(e) => setNewActionItem(e.target.value)}
              placeholder="New action item..."
            />
            <select
              value={assignee}
              onChange={(e) => setAssignee(e.target.value)}
              className="w-full px-3 py-2 border rounded-md"
            >
              <option value="">Assign to...</option>
              {participants.map((participant) => (
                <option key={participant.id} value={participant.id}>
                  {participant.name}
                </option>
              ))}
            </select>
            <Button
              type="submit"
              disabled={!newActionItem.trim() || !assignee}
              className="w-full"
            >
              Add Action Item
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
} 