-- 核心语料库表
CREATE TABLE sentences (
  id         TEXT PRIMARY KEY,
  module     TEXT NOT NULL,
  chinese_context TEXT NOT NULL,
  target_sentence TEXT NOT NULL,
  tier1_warning   TEXT DEFAULT '',
  deep_analysis   TEXT DEFAULT '',
  audio_url       TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 匿名用户学习记录表 (使用localStorage中的匿名ID关联)
CREATE TABLE study_records (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          TEXT NOT NULL,
  sentence_id      TEXT NOT NULL REFERENCES sentences(id) ON DELETE CASCADE,
  repetition_count INT DEFAULT 0,
  ease_factor      FLOAT DEFAULT 2.5,
  interval_days    INT DEFAULT 1,
  next_review_date TIMESTAMPTZ DEFAULT NOW(),
  input_history    JSONB DEFAULT '[]'::jsonb,
  error_tags       TEXT[] DEFAULT '{}',
  dictation_unlocked BOOLEAN DEFAULT FALSE,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, sentence_id)
);

-- 索引：加速每日任务查询
CREATE INDEX idx_study_records_user_review
  ON study_records(user_id, next_review_date);

-- RLS 策略
ALTER TABLE sentences ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Sentences are readable by all"
  ON sentences FOR SELECT
  USING (true);

CREATE POLICY "Users can read own study records"
  ON study_records FOR SELECT
  USING (true);

CREATE POLICY "Users can insert own study records"
  ON study_records FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can update own study records"
  ON study_records FOR UPDATE
  USING (true);

CREATE POLICY "Users can delete own study records"
  ON study_records FOR DELETE
  USING (true);
