-- Exclusive financial research content + per-user delivery prefs.
-- Lives in AUTH_DATABASE_URL (same Neon DB as terminal_users/terminal_subscriptions)
-- so reads/subscriptions join cleanly.

CREATE TABLE IF NOT EXISTS terminal_research_articles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug TEXT UNIQUE NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('am_brief','deep_dive','sector','earnings_preview','earnings_recap','power_map','macro')),
    title TEXT NOT NULL,
    summary TEXT NOT NULL,            -- teaser / preview lede
    body_md TEXT NOT NULL,            -- full article in markdown
    tickers TEXT[] NOT NULL DEFAULT '{}',
    sectors TEXT[] NOT NULL DEFAULT '{}',
    tags TEXT[] NOT NULL DEFAULT '{}',
    data_refs JSONB NOT NULL DEFAULT '{}'::jsonb,
    required_tier TEXT NOT NULL DEFAULT 'pro' CHECK (required_tier IN ('starter','pro','institutional')),
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','reviewed','published','archived')),
    published_at TIMESTAMPTZ,
    generated_by TEXT,                -- llm model id, or 'manual'
    reviewed_by TEXT,                 -- editor email
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tr_articles_published
    ON terminal_research_articles (published_at DESC)
    WHERE status = 'published';
CREATE INDEX IF NOT EXISTS idx_tr_articles_type_published
    ON terminal_research_articles (type, published_at DESC)
    WHERE status = 'published';
CREATE INDEX IF NOT EXISTS idx_tr_articles_tickers
    ON terminal_research_articles USING GIN (tickers);
CREATE INDEX IF NOT EXISTS idx_tr_articles_tags
    ON terminal_research_articles USING GIN (tags);

CREATE TABLE IF NOT EXISTS terminal_research_subscriptions (
    user_id TEXT NOT NULL REFERENCES terminal_users(id) ON DELETE CASCADE,
    channel TEXT NOT NULL CHECK (channel IN ('email','telegram')),
    types TEXT[] NOT NULL DEFAULT '{}',
    telegram_chat_id TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, channel)
);

CREATE TABLE IF NOT EXISTS terminal_research_reads (
    user_id TEXT NOT NULL REFERENCES terminal_users(id) ON DELETE CASCADE,
    article_id UUID NOT NULL REFERENCES terminal_research_articles(id) ON DELETE CASCADE,
    read_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, article_id)
);

CREATE INDEX IF NOT EXISTS idx_tr_reads_article ON terminal_research_reads (article_id);
