-- Auth + billing tables for agent + paper trading tiers.
-- Namespaced with `terminal_` prefix because this Neon DB is shared with other
-- projects that already have `users` / `subscriptions` tables with UUID ids.

CREATE TABLE IF NOT EXISTS terminal_users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    name TEXT,
    picture TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS terminal_subscriptions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES terminal_users(id) ON DELETE CASCADE,
    tier TEXT NOT NULL CHECK (tier IN ('starter','pro','institutional')),
    status TEXT NOT NULL CHECK (status IN ('active','expired','cancelled','pending')),
    mayar_invoice_id TEXT,
    started_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_terminal_sub_active ON terminal_subscriptions(user_id, status) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_terminal_sub_expires ON terminal_subscriptions(expires_at) WHERE status = 'active';
