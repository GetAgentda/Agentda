import { AgendaItem } from '@/types';

interface AIAgendaSuggestion {
  items: Omit<AgendaItem, 'id' | 'createdAt' | 'updatedAt'>[];
  estimatedDuration: number;
}

export async function getAgendaSuggestions(
  meetingGoals: string,
  existingItems?: AgendaItem[]
): Promise<AIAgendaSuggestion> {
  try {
    const response = await fetch('/api/ai/agenda', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        goals: meetingGoals,
        existingItems,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to get AI suggestions');
    }

    return await response.json();
  } catch (error) {
    console.error('Error getting AI suggestions:', error);
    throw error;
  }
}

export async function summarizeAgendaItem(
  item: AgendaItem,
  notes: string
): Promise<{ summary: string; actionItems: string[] }> {
  try {
    const response = await fetch('/api/ai/summarize', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        item,
        notes,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to get AI summary');
    }

    return await response.json();
  } catch (error) {
    console.error('Error getting AI summary:', error);
    throw error;
  }
} 