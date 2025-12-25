-- Create candidates table
CREATE TABLE candidates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  candidate_code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  resume_url TEXT,
  notes TEXT,
  is_active INTEGER DEFAULT 1,
  created_by_user_id INTEGER NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_candidates_code ON candidates(candidate_code);
CREATE INDEX idx_candidates_name ON candidates(name);
CREATE INDEX idx_candidates_created_by ON candidates(created_by_user_id);

-- Create candidate_role_associations table
CREATE TABLE candidate_role_associations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  candidate_id INTEGER NOT NULL,
  role_id INTEGER NOT NULL,
  recruiter_user_id INTEGER NOT NULL,
  client_id INTEGER NOT NULL,
  team_id INTEGER NOT NULL,
  status TEXT DEFAULT 'submitted',
  is_discarded INTEGER DEFAULT 0,
  discarded_at DATETIME,
  discarded_reason TEXT,
  submission_date DATE NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_candidate_role_candidate ON candidate_role_associations(candidate_id);
CREATE INDEX idx_candidate_role_role ON candidate_role_associations(role_id);
CREATE INDEX idx_candidate_role_recruiter ON candidate_role_associations(recruiter_user_id);
CREATE INDEX idx_candidate_role_status ON candidate_role_associations(status);

-- Add candidate code counter to code_counters table
INSERT INTO code_counters (category, next_number) 
SELECT 'candidate', 1
WHERE NOT EXISTS (SELECT 1 FROM code_counters WHERE category = 'candidate');