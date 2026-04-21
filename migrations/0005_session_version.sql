-- Add session_version to terminal_users to allow revoking all active JWTs.
-- Every JWT embeds the `sv` claim at sign time; getSession rejects tokens
-- whose `sv` no longer matches the current row. Bumping the column once
-- logs the user out of every device.

ALTER TABLE terminal_users
    ADD COLUMN IF NOT EXISTS session_version INT NOT NULL DEFAULT 1;
