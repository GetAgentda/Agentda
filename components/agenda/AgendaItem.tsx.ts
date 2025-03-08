import { useState } from 'react';
import { Pencil, Trash2, GripVertical, X, Check } from 'lucide-react';
import type { AgendaItem as AgendaItemType } from '@/types/workspace';

interface AgendaItemProps {
  item: AgendaItemType;
  onUpdate: (id: string, updates: Partial<AgendaItemType>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onReorder: (id: string, newPosition: number) => Promise<void>;
}

export function AgendaItem({ item, onUpdate, onDelete, onReorder }: AgendaItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState(item.title);
  const [description, setDescription] = useState(item.description || '');
  const [owner, setOwner] = useState(item.owner || '');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    try {
      setIsSubmitting(true);
      await onUpdate(item.id, {
        title: title.trim(),
        description: description.trim(),
        owner: owner.trim(),
      });
      setIsEditing(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (confirm('Are you sure you want to delete this agenda item?')) {
      await onDelete(item.id);
    }
  };

  if (isEditing) {
    return (
      <form onSubmit={handleSubmit} className="rounded-lg border bg-white p-4 shadow-sm">
        <div className="space-y-4">
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-700">
              Title
            </label>
            <input
              type="text"
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              required
            />
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700">
              Description
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            />
          </div>

          <div>
            <label htmlFor="owner" className="block text-sm font-medium text-gray-700">
              Owner
            </label>
            <input
              type="text"
              id="owner"
              value={owner}
              onChange={(e) => setOwner(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            />
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                setTitle(item.title);
                setDescription(item.description || '');
                setOwner(item.owner || '');
                setIsEditing(false);
              }}
              className="inline-flex items-center rounded-md px-3 py-2 text-sm font-medium text-gray-700 hover:text-gray-800"
              disabled={isSubmitting}
            >
              <X className="mr-1.5 h-4 w-4" />
              Cancel
            </button>
            <button
              type="submit"
              className="inline-flex items-center rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
              disabled={isSubmitting}
            >
              <Check className="mr-1.5 h-4 w-4" />
              {isSubmitting ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      </form>
    );
  }

  return (
    <div className="group relative flex items-start gap-4 rounded-lg border bg-white p-4 shadow-sm">
      <button
        className="mt-1 cursor-grab opacity-0 group-hover:opacity-100"
        title="Drag to reorder"
      >
        <GripVertical className="h-5 w-5 text-gray-400" />
      </button>

      <div className="flex-1 space-y-1">
        <h3 className="text-base font-medium text-gray-900">{item.title}</h3>
        {item.description && (
          <p className="text-sm text-gray-500">{item.description}</p>
        )}
        {item.owner && (
          <p className="text-sm text-gray-500">
            Owner: <span className="font-medium">{item.owner}</span>
          </p>
        )}
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => setIsEditing(true)}
          className="rounded-md p-1 text-gray-400 hover:text-gray-600"
          title="Edit item"
        >
          <Pencil className="h-4 w-4" />
        </button>
        <button
          onClick={handleDelete}
          className="rounded-md p-1 text-gray-400 hover:text-red-600"
          title="Delete item"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}