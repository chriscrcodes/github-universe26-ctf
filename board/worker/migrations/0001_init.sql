CREATE TABLE IF NOT EXISTS teams (
  teamId TEXT PRIMARY KEY,
  alias TEXT NOT NULL,
  phase TEXT NOT NULL,
  source TEXT NOT NULL,
  updatedAt TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS teams_updated_at_idx ON teams(updatedAt);
