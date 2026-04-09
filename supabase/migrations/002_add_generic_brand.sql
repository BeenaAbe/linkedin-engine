-- Add a "Generic" brand for posts that aren't tied to Logrite or Deployd.
-- Use case: general professional / industry takes, career content, broad
-- knowledge-worker posts. Intentionally minimal messaging so the editor
-- BRAND_FIT check evaluates "does this sound like a thoughtful professional
-- post?" rather than "does this sell a specific product?"

INSERT INTO brands (name, description, target_audience, tone, key_messaging, topics) VALUES
(
  'Generic',
  'General-purpose professional LinkedIn content for broad knowledge-worker audiences. Not tied to a specific product — used for industry commentary, career takes, and thought-leadership posts that stand on their own.',
  'Knowledge workers across tech, product, engineering, operations, and leadership. People who read LinkedIn for insight and perspective, not vendor pitches.',
  'Smart-friend-over-coffee. Conversational, direct, specific. Confident without hype. Avoid corporate jargon and performative vulnerability. Treat the reader as a peer.',
  ARRAY[
    'Say something true, not something safe',
    'Specific beats generic every time',
    'Earn attention, do not demand it',
    'Respect the reader''s time',
    'A good post changes how someone sees their work'
  ],
  ARRAY[
    'Career and professional growth',
    'Engineering culture',
    'Product thinking',
    'Leadership and management',
    'Industry commentary',
    'Working in tech',
    'Lessons learned'
  ]
)
ON CONFLICT (name) DO NOTHING;
