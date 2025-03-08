'use client';

import { useState } from 'react';
import { useWorkspace } from '@/hooks/useWorkspace';
import { AgendaItem } from '@/components/agenda/AgendaItem';
import { AddAgendaItem } from '@/components/agenda/AddAgendaItem';
import { formatDistanceToNow } from 'date-fns';

export default function WorkspacePage({
  params: { workspaceId },
}: {
  params: { workspaceId: string };
}) {
  const {
    workspace,
    agendaItems,
    isLoading,
    error,
    addAgendaItem,
    updateAgendaItem,
    deleteAgendaItem,
    reorderAgendaItems,
  } = useWorkspace(workspaceId);

  const [isCopied, setIsCopied] = useState(false);

  const copyWorkspaceUrl = () => {
    navigator.clipboard.writeText(window.location.href);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-lg">Loading workspace...</div>
      </div>
    );
  }

  if (error || !workspace) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-lg text-red-600">
          {error || 'Workspace not found'}
        </div>
      </div>
    );
  }

  const expiresIn = formatDistanceToNow(new Date(workspace.expires_at), {
    addSuffix: true,
  });

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="mx-auto max-w-4xl space-y-8 px-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Meeting Agenda</h1>
            <p className="mt-1 text-sm text-gray-500">
              Workspace expires {expiresIn}
            </p>
          </div>
          <button
            onClick={copyWorkspaceUrl}
            className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-gray-600 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            {isCopied ? 'Copied!' : 'Share Workspace'}
          </button>
        </div>

        <div className="space-y-4">
          <AddAgendaItem onAdd={addAgendaItem} />

          {agendaItems.length === 0 ? (
            <p className="text-center text-gray-500 py-8">
              No agenda items yet. Add one to get started!
            </p>
          ) : (
            <div className="space-y-2">
              {agendaItems.map((item) => (
                <AgendaItem
                  key={item.id}
                  item={item}
                  onUpdate={updateAgendaItem}
                  onDelete={deleteAgendaItem}
                  onReorder={reorderAgendaItems}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}