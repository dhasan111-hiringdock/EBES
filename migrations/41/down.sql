DROP INDEX IF EXISTS idx_candidate_role_status;
DROP INDEX IF EXISTS idx_candidate_role_recruiter;
DROP INDEX IF EXISTS idx_candidate_role_role;
DROP INDEX IF EXISTS idx_candidate_role_candidate;
DROP TABLE IF EXISTS candidate_role_associations;

DROP INDEX IF EXISTS idx_candidates_created_by;
DROP INDEX IF EXISTS idx_candidates_name;
DROP INDEX IF EXISTS idx_candidates_code;
DROP TABLE IF EXISTS candidates;

DELETE FROM code_counters WHERE category = 'candidate';