import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import type { Workspace, AgendaItem } from '@/types/workspace';

export function useWorkspace(workspaceId: string) {
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [agendaItems, setAgendaItems] = useState<AgendaItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let subscription: ReturnType<typeof supabase.channel> | null = null;

    async function initWorkspace() {
      try {
        // Fetch workspace details
        const { data: workspaceData, error: workspaceError } = await supabase
          .from('workspaces')
          .select('*')
          .eq('id', workspaceId)
          .single();

        if (workspaceError) throw workspaceError;
        setWorkspace(workspaceData);

        // Fetch agenda items
        const { data: itemsData, error: itemsError } = await supabase
          .from('agenda_items')
          .select('*')
          .eq('workspace_id', workspaceId)
          .order('position');

        if (itemsError) throw itemsError;
        setAgendaItems(itemsData || []);

        // Subscribe to real-time changes
        subscription = supabase
          .channel(`workspace:${workspaceId}`)
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'agenda_items',
              filter: `workspace_id=eq.${workspaceId}`,
            },
            async (payload) => {
              const { data: updatedData, error: refreshError } = await supabase
                .from('agenda_items')
                .select('*')
                .eq('workspace_id', workspaceId)
                .order('position');

              if (!refreshError && updatedData) {
                setAgendaItems(updatedData);
              }
            }
          )
          .subscribe();

      } catch (err) {
        console.error('Error initializing workspace:', err);
        setError('Failed to load workspace');
      } finally {
        setIsLoading(false);
      }
    }

    initWorkspace();

    return () => {
      subscription?.unsubscribe();
    };
  }, [workspaceId]);

  const addAgendaItem = async (title: string, description?: string, owner?: string) => {
    try {
      const newPosition = agendaItems.length;
      const { error } = await supabase
        .from('agenda_items')
        .insert([
          {
            workspace_id: workspaceId,
            title,
            description,
            owner,
            position: newPosition,
          },
        ]);

      if (error) throw error;
    } catch (err) {
      console.error('Error adding agenda item:', err);
      setError('Failed to add agenda item');
    }
  };

  const updateAgendaItem = async (id: string, updates: Partial<AgendaItem>) => {
    try {
      const { error } = await supabase
        .from('agenda_items')
        .update(updates)
        .eq('id', id);

      if (error) throw error;
    } catch (err) {
      console.error('Error updating agenda item:', err);
      setError('Failed to update agenda item');
    }
  };

  const deleteAgendaItem = async (id: string) => {
    try {
      const { error } = await supabase
        .from('agenda_items')
        .delete()
        .eq('id', id);

      if (error) throw error;

      // Update positions of remaining items
      const updatedItems = agendaItems
        .filter(item => item.id !== id)
        .map((item, index) => ({
          ...item,
          position: index,
        }));

      for (const item of updatedItems) {
        await supabase
          .from('agenda_items')
          .update({ position: item.position })
          .eq('id', item.id);
      }
    } catch (err) {
      console.error('Error deleting agenda item:', err);
      setError('Failed to delete agenda item');
    }
  };

  const reorderAgendaItems = async (itemId: string, newPosition: number) => {
    try {
      const item = agendaItems.find(i => i.id === itemId);
      if (!item) return;

      const oldPosition = item.position;
      const updatedItems = [...agendaItems];
      
      // Remove item from old position
      updatedItems.splice(oldPosition, 1);
      // Insert at new position
      updatedItems.splice(newPosition, 0, item);
      
      // Update positions
      const updates = updatedItems.map((item, index) => ({
        id: item.id,
        position: index,
      }));

      for (const update of updates) {
        await supabase
          .from('agenda_items')
          .update({ position: update.position })
          .eq('id', update.id);
      }
    } catch (err) {
      console.error('Error reordering agenda items:', err);
      setError('Failed to reorder agenda items');
    }
  };

  return {
    workspace,
    agendaItems,
    isLoading,
    error,
    addAgendaItem,
    updateAgendaItem,
    deleteAgendaItem,
    reorderAgendaItems,
  };
}