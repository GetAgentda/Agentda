'use client';

import { useState, useEffect, useCallback } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { doc, onSnapshot, updateDoc, setDoc, deleteDoc } from 'firebase/firestore';
import { collection } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/hooks/useAuth';
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition';
import { getAgendaSuggestions, summarizeAgendaItem } from '@/lib/ai';
import { AgendaItem, Agenda } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Spinner } from '@/components/ui/spinner';
import { toast } from '@/components/ui/toast';

interface AgendaBuilderProps {
  meetingId: string;
  readOnly?: boolean;
}

export function AgendaBuilder({ meetingId, readOnly = false }: AgendaBuilderProps) {
  const { user } = useAuth();
  const [agenda, setAgenda] = useState<Agenda | null>(null);
  const [loading, setLoading] = useState(true);
  const [aiLoading, setAiLoading] = useState(false);
  const [meetingGoals, setMeetingGoals] = useState('');
  const [newItemTitle, setNewItemTitle] = useState('');
  const [selectedItem, setSelectedItem] = useState<AgendaItem | null>(null);
  const { transcript, startListening, stopListening, resetTranscript, isListening } = useSpeechRecognition();

  // Subscribe to agenda updates
  useEffect(() => {
    if (!meetingId || !user) return;

    const agendaRef = doc(db, 'agendas', meetingId);
    const unsubscribe = onSnapshot(agendaRef, (doc) => {
      if (doc.exists()) {
        setAgenda(doc.data() as Agenda);
      } else {
        // Create new agenda if it doesn't exist
        const newAgenda: Agenda = {
          id: meetingId,
          meetingId,
          items: [],
          createdAt: new Date(),
          updatedAt: new Date(),
          lastEditedBy: user.uid,
        };
        setDoc(agendaRef, newAgenda);
        setAgenda(newAgenda);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [meetingId, user]);

  // Handle drag and drop reordering
  const handleDragEnd = useCallback(async (result: DropResult) => {
    if (!result.destination || !agenda) return;

    const items = Array.from(agenda.items);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    // Update order numbers
    const updatedItems = items.map((item, index) => ({
      ...item,
      order: index,
    }));

    const agendaRef = doc(db, 'agendas', meetingId);
    await updateDoc(agendaRef, {
      items: updatedItems,
      updatedAt: new Date(),
      lastEditedBy: user?.uid,
    });
  }, [agenda, meetingId, user]);

  // Add new agenda item
  const handleAddItem = useCallback(async () => {
    if (!newItemTitle.trim() || readOnly) return;

    const newItem: AgendaItem = {
      id: crypto.randomUUID(),
      title: newItemTitle,
      order: agenda?.items.length || 0,
      status: 'pending',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const agendaRef = doc(db, 'agendas', meetingId);
    await updateDoc(agendaRef, {
      items: [...agenda?.items || [], newItem],
      updatedAt: new Date(),
      lastEditedBy: user?.uid,
    });

    setNewItemTitle('');
  }, [newItemTitle, agenda, meetingId, user, readOnly]);

  // Update agenda item
  const handleUpdateItem = useCallback(async (itemId: string, updates: Partial<AgendaItem>) => {
    if (readOnly) return;

    const updatedItems = agenda?.items.map(item =>
      item.id === itemId ? { ...item, ...updates, updatedAt: new Date() } : item
    ) || [];

    const agendaRef = doc(db, 'agendas', meetingId);
    await updateDoc(agendaRef, {
      items: updatedItems,
      updatedAt: new Date(),
      lastEditedBy: user?.uid,
    });
  }, [agenda, meetingId, user, readOnly]);

  // Delete agenda item
  const handleDeleteItem = useCallback(async (itemId: string) => {
    if (readOnly) return;

    const updatedItems = agenda?.items
      .filter(item => item.id !== itemId)
      .map((item, index) => ({ ...item, order: index })) || [];

    const agendaRef = doc(db, 'agendas', meetingId);
    await updateDoc(agendaRef, {
      items: updatedItems,
      updatedAt: new Date(),
      lastEditedBy: user?.uid,
    });
  }, [agenda, meetingId, user, readOnly]);

  // Get AI suggestions
  const handleGetSuggestions = useCallback(async () => {
    if (!meetingGoals.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter meeting goals first',
        variant: 'destructive',
      });
      return;
    }

    setAiLoading(true);
    try {
      const suggestions = await getAgendaSuggestions(meetingGoals, agenda?.items);
      
      if (!agenda || !user) return;

      const newItems = suggestions.items.map((item, index) => ({
        ...item,
        id: crypto.randomUUID(),
        order: agenda.items.length + index,
        createdAt: new Date(),
        updatedAt: new Date(),
      }));

      const agendaRef = doc(db, 'agendas', meetingId);
      await updateDoc(agendaRef, {
        items: [...agenda.items, ...newItems],
        updatedAt: new Date(),
        lastEditedBy: user.uid,
      });

      toast({
        title: 'Success',
        description: 'AI suggestions added to agenda',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to get AI suggestions',
        variant: 'destructive',
      });
    } finally {
      setAiLoading(false);
    }
  }, [meetingGoals, agenda, meetingId, user]);

  // Handle voice input
  useEffect(() => {
    if (transcript && selectedItem) {
      handleUpdateItem(selectedItem.id, { notes: transcript });
    }
  }, [transcript, selectedItem, handleUpdateItem]);

  if (loading) {
    return <div className="flex justify-center p-4"><Spinner /></div>;
  }

  return (
    <div className="space-y-6 p-4">
      {/* Meeting Goals and AI Suggestions */}
      <div className="space-y-2">
        <Textarea
          placeholder="Enter meeting goals for AI suggestions..."
          value={meetingGoals}
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setMeetingGoals(e.target.value)}
          className="min-h-[100px]"
        />
        <Button
          onClick={handleGetSuggestions}
          disabled={aiLoading || !meetingGoals.trim()}
        >
          {aiLoading ? <Spinner className="mr-2" /> : null}
          Get AI Suggestions
        </Button>
      </div>

      {/* Add New Item */}
      <div className="flex space-x-2">
        <Input
          placeholder="New agenda item"
          value={newItemTitle}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewItemTitle(e.target.value)}
          onKeyPress={(e: React.KeyboardEvent<HTMLInputElement>) => e.key === 'Enter' && handleAddItem()}
          disabled={readOnly}
        />
        <Button onClick={handleAddItem} disabled={!newItemTitle.trim() || readOnly}>
          Add Item
        </Button>
      </div>

      {/* Agenda Items List */}
      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId="agenda-items">
          {(provided) => (
            <div
              {...provided.droppableProps}
              ref={provided.innerRef}
              className="space-y-2"
            >
              {agenda?.items.sort((a, b) => a.order - b.order).map((item, index) => (
                <Draggable
                  key={item.id}
                  draggableId={item.id}
                  index={index}
                  isDragDisabled={readOnly}
                >
                  {(provided) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      {...provided.dragHandleProps}
                      className="border rounded-lg p-4 bg-white shadow-sm"
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1 space-y-2">
                          <Input
                            value={item.title}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                              handleUpdateItem(item.id, { title: e.target.value })
                            }
                            disabled={readOnly}
                          />
                          <Textarea
                            placeholder="Add description..."
                            value={item.description || ''}
                            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                              handleUpdateItem(item.id, {
                                description: e.target.value,
                              })
                            }
                            disabled={readOnly}
                          />
                          <div className="flex items-center space-x-2">
                            <Input
                              type="number"
                              placeholder="Duration (min)"
                              value={item.duration || ''}
                              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                handleUpdateItem(item.id, {
                                  duration: parseInt(e.target.value) || undefined,
                                })
                              }
                              className="w-32"
                              disabled={readOnly}
                            />
                            <select
                              value={item.status}
                              onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                                handleUpdateItem(item.id, {
                                  status: e.target.value as AgendaItem['status'],
                                })
                              }
                              className="border rounded p-2"
                              disabled={readOnly}
                            >
                              <option value="pending">Pending</option>
                              <option value="in-progress">In Progress</option>
                              <option value="completed">Completed</option>
                            </select>
                          </div>
                          {/* Voice Input for Notes */}
                          <div className="space-y-2">
                            <div className="flex items-center space-x-2">
                              <Button
                                onClick={() => {
                                  setSelectedItem(item);
                                  if (isListening) {
                                    stopListening();
                                  } else {
                                    resetTranscript();
                                    startListening();
                                  }
                                }}
                                disabled={readOnly}
                              >
                                {isListening && selectedItem?.id === item.id
                                  ? 'Stop Recording'
                                  : 'Record Notes'}
                              </Button>
                              {isListening && selectedItem?.id === item.id && (
                                <span className="text-red-500 animate-pulse">
                                  Recording...
                                </span>
                              )}
                            </div>
                            <Textarea
                              placeholder="Notes..."
                              value={item.notes || ''}
                              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                                handleUpdateItem(item.id, { notes: e.target.value })
                              }
                              disabled={readOnly}
                            />
                          </div>
                        </div>
                        <Button
                          variant="destructive"
                          onClick={() => handleDeleteItem(item.id)}
                          className="ml-2"
                          disabled={readOnly}
                        >
                          Delete
                        </Button>
                      </div>
                    </div>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>
    </div>
  );
} 