export type AgendaItem = {
  id: string;
  workspace_id: string;
  title: string;
  description?: string;
  owner?: string;
  position: number;
  created_at: string;
  updated_at: string;
};

export type Workspace = {
  id: string;
  created_at: string;
  expires_at: string;
  last_accessed_at: string;
};

export type WorkspaceContextType = {
  workspace: Workspace | null;
  agendaItems: AgendaItem[];
  isLoading: boolean;
  error: string | null;
  addAgendaItem: (title: string, description?: string, owner?: string) => Promise<void>;
  updateAgendaItem: (id: string, updates: Partial<AgendaItem>) => Promise<void>;
  deleteAgendaItem: (id: string) => Promise<void>;
  reorderAgendaItems: (itemId: string, newPosition: number) => Promise<void>;
};