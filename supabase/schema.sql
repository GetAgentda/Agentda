-- Create workspaces table
CREATE TABLE workspaces (
  id TEXT PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  last_accessed_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Create agenda_items table
CREATE TABLE agenda_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id TEXT REFERENCES workspaces(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  owner TEXT,
  position INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Enable Row Level Security
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE agenda_items ENABLE ROW LEVEL SECURITY;

-- Create policies for workspaces
CREATE POLICY "Allow public read access to valid workspaces" ON workspaces
  FOR SELECT
  USING (expires_at > TIMEZONE('utc', NOW()));

CREATE POLICY "Allow public create access" ON workspaces
  FOR INSERT
  WITH CHECK (true);

-- Create policies for agenda_items
CREATE POLICY "Allow public read access to agenda items of valid workspaces" ON agenda_items
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM workspaces
      WHERE workspaces.id = agenda_items.workspace_id
      AND workspaces.expires_at > TIMEZONE('utc', NOW())
    )
  );

CREATE POLICY "Allow public write access to agenda items of valid workspaces" ON agenda_items
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM workspaces
      WHERE workspaces.id = agenda_items.workspace_id
      AND workspaces.expires_at > TIMEZONE('utc', NOW())
    )
  );

CREATE POLICY "Allow public update access to agenda items of valid workspaces" ON agenda_items
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM workspaces
      WHERE workspaces.id = agenda_items.workspace_id
      AND workspaces.expires_at > TIMEZONE('utc', NOW())
    )
  );

CREATE POLICY "Allow public delete access to agenda items of valid workspaces" ON agenda_items
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM workspaces
      WHERE workspaces.id = agenda_items.workspace_id
      AND workspaces.expires_at > TIMEZONE('utc', NOW())
    )
  );

-- Enable real-time subscriptions
ALTER PUBLICATION supabase_realtime ADD TABLE agenda_items;

-- Create function to update workspace last_accessed_at
CREATE OR REPLACE FUNCTION update_workspace_last_accessed()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE workspaces
  SET last_accessed_at = TIMEZONE('utc', NOW())
  WHERE id = NEW.workspace_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updating workspace last_accessed_at
CREATE TRIGGER update_workspace_last_accessed_trigger
AFTER INSERT OR UPDATE ON agenda_items
FOR EACH ROW
EXECUTE FUNCTION update_workspace_last_accessed();
