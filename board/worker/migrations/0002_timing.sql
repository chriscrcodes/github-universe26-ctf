-- Mission timing for diagnostics and aggregate rehearsal analysis.
-- startedAt is stamped at registration and never changes; finishedAt is
-- stamped when a team reaches the final `blue` phase.
ALTER TABLE teams ADD COLUMN startedAt TEXT;
ALTER TABLE teams ADD COLUMN finishedAt TEXT;

CREATE INDEX IF NOT EXISTS teams_finished_at_idx ON teams(finishedAt);
