export const SCHEMA_SQL = `
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS profile (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  name TEXT NOT NULL,
  email TEXT,
  timezone TEXT NOT NULL DEFAULT 'Asia/Kathmandu',
  onboarding_complete INTEGER NOT NULL DEFAULT 0,
  tracking_since TEXT NOT NULL,
  active_phase_id TEXT,
  streak_threshold REAL NOT NULL DEFAULT 0.7,
  rest_days_per_week INTEGER NOT NULL DEFAULT 1,
  theme_mode TEXT NOT NULL DEFAULT 'system',
  wake_time TEXT NOT NULL DEFAULT '05:45',
  bedtime TEXT NOT NULL DEFAULT '21:30',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS routine_phases (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  objective TEXT NOT NULL,
  start_date TEXT,
  end_date TEXT,
  auto INTEGER NOT NULL DEFAULT 1,
  sort_order INTEGER NOT NULL DEFAULT 0,
  color TEXT NOT NULL DEFAULT '#B94DF2',
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS schedule_blocks (
  id TEXT PRIMARY KEY,
  phase_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL,
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  days TEXT NOT NULL,
  trackable INTEGER NOT NULL DEFAULT 1,
  fixed INTEGER NOT NULL DEFAULT 0,
  kind TEXT NOT NULL DEFAULT 'core',
  est_minutes INTEGER NOT NULL DEFAULT 30,
  sort_order INTEGER NOT NULL DEFAULT 0,
  active INTEGER NOT NULL DEFAULT 1,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_blocks_phase ON schedule_blocks(phase_id);

CREATE TABLE IF NOT EXISTS goals (
  id TEXT PRIMARY KEY,
  date TEXT NOT NULL,
  block_id TEXT,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL,
  est_minutes INTEGER NOT NULL DEFAULT 0,
  scheduled_time TEXT,
  kind TEXT NOT NULL DEFAULT 'core',
  status TEXT NOT NULL DEFAULT 'pending',
  skip_reason TEXT,
  completed_at TEXT,
  source TEXT NOT NULL DEFAULT 'routine',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_goals_date ON goals(date);
CREATE UNIQUE INDEX IF NOT EXISTS idx_goals_date_block
  ON goals(date, block_id) WHERE block_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS day_logs (
  date TEXT PRIMARY KEY,
  status TEXT NOT NULL DEFAULT 'none',
  is_rest INTEGER NOT NULL DEFAULT 0,
  is_recovery INTEGER NOT NULL DEFAULT 0,
  note TEXT,
  completed_core INTEGER NOT NULL DEFAULT 0,
  total_core INTEGER NOT NULL DEFAULT 0,
  percent REAL NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS subjects (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  code TEXT NOT NULL DEFAULT '',
  priority INTEGER NOT NULL DEFAULT 3,
  allocation INTEGER NOT NULL DEFAULT 33,
  confidence INTEGER NOT NULL DEFAULT 3,
  color TEXT NOT NULL DEFAULT '#7A28A8',
  exam_date TEXT,
  exam_time TEXT,
  notes TEXT NOT NULL DEFAULT '',
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS topics (
  id TEXT PRIMARY KEY,
  subject_id TEXT NOT NULL,
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'not_started',
  minutes INTEGER NOT NULL DEFAULT 0,
  practice_done INTEGER NOT NULL DEFAULT 0,
  revision_done INTEGER NOT NULL DEFAULT 0,
  confidence INTEGER NOT NULL DEFAULT 3,
  notes TEXT NOT NULL DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_topics_subject ON topics(subject_id);

CREATE TABLE IF NOT EXISTS study_sessions (
  id TEXT PRIMARY KEY,
  day TEXT NOT NULL,
  subject_id TEXT,
  topic_id TEXT,
  kind TEXT NOT NULL DEFAULT 'study',
  minutes INTEGER NOT NULL DEFAULT 0,
  started_at TEXT NOT NULL,
  ended_at TEXT NOT NULL,
  notes TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_study_subject ON study_sessions(subject_id);
CREATE INDEX IF NOT EXISTS idx_study_day ON study_sessions(day);

CREATE TABLE IF NOT EXISTS workout_logs (
  id TEXT PRIMARY KEY,
  date TEXT NOT NULL,
  workout_key TEXT NOT NULL,
  title TEXT NOT NULL,
  kind TEXT NOT NULL,
  duration_min INTEGER NOT NULL DEFAULT 0,
  distance_km REAL,
  intensity TEXT NOT NULL DEFAULT 'normal',
  completed INTEGER NOT NULL DEFAULT 1,
  notes TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_workout_date_key ON workout_logs(date, workout_key);

CREATE TABLE IF NOT EXISTS learning_topics (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'not_started',
  minutes INTEGER NOT NULL DEFAULT 0,
  notes TEXT NOT NULL DEFAULT '',
  code_done INTEGER NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS learning_sessions (
  id TEXT PRIMARY KEY,
  day TEXT NOT NULL,
  topic_id TEXT,
  minutes INTEGER NOT NULL DEFAULT 0,
  notes TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS focus_sessions (
  id TEXT PRIMARY KEY,
  day TEXT NOT NULL,
  label TEXT NOT NULL,
  subject_id TEXT,
  learning_topic_id TEXT,
  minutes INTEGER NOT NULL DEFAULT 0,
  started_at TEXT NOT NULL,
  ended_at TEXT NOT NULL,
  completed INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_focus_day ON focus_sessions(day);

CREATE TABLE IF NOT EXISTS checkins (
  date TEXT PRIMARY KEY,
  sleep TEXT,
  energy TEXT,
  mood TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS journal_entries (
  id TEXT PRIMARY KEY,
  date TEXT NOT NULL,
  accomplished TEXT NOT NULL DEFAULT '',
  difficult TEXT NOT NULL DEFAULT '',
  improve TEXT NOT NULL DEFAULT '',
  free_text TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_journal_date ON journal_entries(date);

CREATE TABLE IF NOT EXISTS achievements (
  key TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  icon TEXT NOT NULL,
  unlocked_at TEXT
);

CREATE TABLE IF NOT EXISTS xp_awards (
  id TEXT PRIMARY KEY,
  source_type TEXT NOT NULL,
  source_id TEXT NOT NULL,
  date TEXT NOT NULL,
  amount INTEGER NOT NULL,
  awarded_at TEXT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_xp_awards_source
  ON xp_awards(source_type, source_id);
CREATE INDEX IF NOT EXISTS idx_xp_awards_date ON xp_awards(date);

CREATE TABLE IF NOT EXISTS outbox (
  id TEXT PRIMARY KEY,
  entity TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  day TEXT,
  payload TEXT NOT NULL,
  created_at TEXT NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  last_error TEXT
);
CREATE INDEX IF NOT EXISTS idx_outbox_created ON outbox(created_at);

CREATE TABLE IF NOT EXISTS sync_meta (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
`;
