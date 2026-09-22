ALTER TABLE teams ADD COLUMN ciStatus TEXT NOT NULL DEFAULT 'pending';
ALTER TABLE teams ADD COLUMN ciRepository TEXT;
ALTER TABLE teams ADD COLUMN ciCommitSha TEXT;
ALTER TABLE teams ADD COLUMN ciCompletedAt TEXT;

CREATE INDEX IF NOT EXISTS teams_ci_status_idx ON teams(ciStatus);
