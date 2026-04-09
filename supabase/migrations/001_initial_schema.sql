-- Brands table
CREATE TABLE brands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL,
  target_audience TEXT NOT NULL,
  tone TEXT NOT NULL,
  key_messaging TEXT[] NOT NULL DEFAULT '{}',
  topics TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Posts table
CREATE TABLE posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  topic TEXT NOT NULL,
  goal TEXT NOT NULL CHECK (goal IN ('thought_leadership', 'product', 'educational', 'personal_brand', 'interactive', 'inspirational')),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'review', 'approved', 'posted', 'rejected')),
  research_brief TEXT,
  content_strategy JSONB,
  hooks JSONB,
  post_body TEXT,
  cta TEXT,
  hashtags TEXT[],
  visual_suggestion JSONB,
  editor_score INTEGER,
  editor_feedback TEXT,
  performance_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Post history for anti-repetition
CREATE TABLE post_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  hook_type TEXT NOT NULL,
  hook_text TEXT NOT NULL,
  angle TEXT NOT NULL,
  key_phrases TEXT[] NOT NULL DEFAULT '{}',
  cta_text TEXT NOT NULL DEFAULT '',
  post_body_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Notification settings
CREATE TABLE notification_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  channel TEXT NOT NULL CHECK (channel IN ('whatsapp', 'slack', 'teams')),
  config JSONB NOT NULL DEFAULT '{}',
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, channel)
);

-- Indexes
CREATE INDEX idx_posts_brand_id ON posts(brand_id);
CREATE INDEX idx_posts_status ON posts(status);
CREATE INDEX idx_posts_created_at ON posts(created_at DESC);
CREATE INDEX idx_post_history_brand_id ON post_history(brand_id);
CREATE INDEX idx_post_history_hook_text ON post_history(hook_text);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER brands_updated_at BEFORE UPDATE ON brands
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER posts_updated_at BEFORE UPDATE ON posts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Seed brand profiles
INSERT INTO brands (name, description, target_audience, tone, key_messaging, topics) VALUES
(
  'Logrite',
  'Comprehensive logging platform managing the complete lifecycle from code generation through production observation to incident investigation. AI-powered root cause analysis, pre-runtime governance, and runtime intelligence.',
  'Developers, SREs, DevOps engineers, Platform Engineers, Security/Compliance teams, CTOs',
  'Professional yet approachable. Technical credibility with accessible language. Action-oriented. Balance sophisticated concepts with engaging explanations.',
  ARRAY[
    'Logging as a first-class engineering practice',
    'Shift-left quality assurance',
    '10x faster incident response',
    'One unified platform — no more tool fragmentation',
    'Built-in compliance (HIPAA, SOC 2, GDPR, PCI-DSS)'
  ],
  ARRAY[
    'Logging best practices',
    'Observability',
    'Incident response',
    'Compliance and security',
    'CI/CD pipelines',
    'Developer productivity',
    'AI-powered debugging',
    'Pre-runtime governance',
    'Semantic log search'
  ]
),
(
  'Deployd',
  'Enterprise test automation and quality engineering services specializing in Worksoft Connective Automation Platform (CAP). End-to-end testing across ERP, CRM, and custom applications.',
  'Large enterprises using SAP, Oracle, Salesforce, ServiceNow. Organizations with stuck automation programs. Companies evaluating or using Worksoft CAP.',
  'Professional and direct. Confident without hype. Conversational enterprise voice. Boutique expertise feel — not corporate jargon.',
  ARRAY[
    'Boutique expertise vs big system integrators',
    'When someone actually owns your Worksoft, transformation happens',
    'We have seen your problem before',
    'One license, seven products',
    'Proven results: 0.01% defect rate, 98% test coverage'
  ],
  ARRAY[
    'Test automation',
    'Worksoft CAP',
    'SAP S/4HANA testing',
    'Quality engineering',
    'Managed testing services',
    'Automation ROI',
    'Enterprise software testing',
    'Codeless automation',
    'Digital transformation testing'
  ]
);
