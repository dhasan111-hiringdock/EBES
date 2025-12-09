import { Hono } from "hono";

const app = new Hono<{ Bindings: Env }>();

// Middleware to check if user is a recruitment manager
const rmOnly = async (c: any, next: any) => {
  const db = c.env.DB;
  
  try {
    // Get user from request header
    const userId = c.req.header('x-user-id');
    
    if (!userId) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const rmUser = await db
      .prepare("SELECT * FROM users WHERE id = ? AND role = 'recruitment_manager' AND is_active = 1")
      .bind(userId)
      .first();

    if (!rmUser) {
      return c.json({ error: "Unauthorized - Recruitment Manager access required" }, 403);
    }

    c.set("rmUser", rmUser);
    await next();
  } catch (error) {
    return c.json({ error: "Unauthorized" }, 401);
  }
};

// Get assigned teams
app.get("/api/rm/teams", rmOnly, async (c) => {
  const db = c.env.DB;
  const rmUser = c.get("rmUser");

  try {
    const teams = await db
      .prepare(`
        SELECT t.* FROM app_teams t
        INNER JOIN team_assignments ta ON t.id = ta.team_id
        WHERE ta.user_id = ?
      `)
      .bind((rmUser as any).id)
      .all();

    return c.json(teams.results || []);
  } catch (error) {
    return c.json({ error: "Failed to fetch teams" }, 500);
  }
});

// Get assigned clients
app.get("/api/rm/clients", rmOnly, async (c) => {
  const db = c.env.DB;
  const rmUser = c.get("rmUser");

  try {
    const clients = await db
      .prepare(`
        SELECT c.* FROM clients c
        INNER JOIN client_assignments ca ON c.id = ca.client_id
        WHERE ca.user_id = ?
      `)
      .bind((rmUser as any).id)
      .all();

    return c.json(clients.results || []);
  } catch (error) {
    return c.json({ error: "Failed to fetch clients" }, 500);
  }
});

// Get all recruiters under RM's teams
app.get("/api/rm/recruiters", rmOnly, async (c) => {
  const db = c.env.DB;
  const rmUser = c.get("rmUser");

  try {
    const recruiters = await db
      .prepare(`
        SELECT DISTINCT u.*, t.id as team_id, t.name as team_name, t.team_code
        FROM users u
        INNER JOIN recruiter_team_assignments rta ON u.id = rta.recruiter_user_id
        INNER JOIN app_teams t ON rta.team_id = t.id
        INNER JOIN team_assignments ta ON t.id = ta.team_id
        WHERE ta.user_id = ? AND u.role = 'recruiter'
      `)
      .bind((rmUser as any).id)
      .all();

    return c.json(recruiters.results || []);
  } catch (error) {
    return c.json({ error: "Failed to fetch recruiters" }, 500);
  }
});

// Get comprehensive analytics for RM
app.get("/api/rm/analytics", rmOnly, async (c) => {
  const db = c.env.DB;
  const rmUser = c.get("rmUser");
  const startDate = c.req.query("start_date");
  const endDate = c.req.query("end_date");
  const teamId = c.req.query("team_id");
  const clientId = c.req.query("client_id");
  const recruiterId = c.req.query("recruiter_id");

  try {
    // Get assigned teams
    const teams = await db
      .prepare(`
        SELECT t.* FROM app_teams t
        INNER JOIN team_assignments ta ON t.id = ta.team_id
        WHERE ta.user_id = ?
      `)
      .bind((rmUser as any).id)
      .all();

    const teamIds = (teams.results || []).map((t: any) => t.id);

    if (teamIds.length === 0) {
      return c.json({
        total_teams: 0,
        total_recruiters: 0,
        total_active_roles: 0,
        total_non_active_roles: 0,
        total_interviews: 0,
        total_deals: 0,
        total_lost: 0,
        total_on_hold: 0,
        total_no_answer: 0,
        team_breakdown: [],
        recruiter_breakdown: [],
      });
    }

    // Build role query with filters
    let roleQuery = `
      SELECT 
        ar.id,
        ar.status,
        ar.team_id,
        ar.account_manager_id,
        ar.client_id,
        t.name as team_name,
        c.name as client_name
      FROM am_roles ar
      INNER JOIN app_teams t ON ar.team_id = t.id
      INNER JOIN clients c ON ar.client_id = c.id
      WHERE ar.team_id IN (${teamIds.join(",")})
    `;

    const roleParams: any[] = [];

    if (teamId) {
      roleQuery += " AND ar.team_id = ?";
      roleParams.push(teamId);
    }

    if (clientId) {
      roleQuery += " AND ar.client_id = ?";
      roleParams.push(clientId);
    }

    if (startDate && endDate) {
      roleQuery += " AND ar.created_at BETWEEN ? AND ?";
      roleParams.push(startDate, endDate);
    }

    const roles = await db.prepare(roleQuery).bind(...roleParams).all();

    // Calculate role statistics
    let total_active_roles = 0;
    let total_non_active_roles = 0;
    let total_deals = 0;
    let total_lost = 0;
    let total_on_hold = 0;
    let total_no_answer = 0;

    for (const role of roles.results || []) {
      const r = role as any;
      if (r.status === 'active') total_active_roles++;
      else total_non_active_roles++;
      
      if (r.status === 'deal') total_deals++;
      if (r.status === 'lost') total_lost++;
      if (r.status === 'on_hold') total_on_hold++;
      if (r.status === 'no_answer') total_no_answer++;
    }

    // Get interview statistics
    const roleIds = (roles.results || []).map((r: any) => r.id);
    let total_interviews = 0;

    if (roleIds.length > 0) {
      const interviews = await db
        .prepare(`
          SELECT SUM(interview_count) as total
          FROM am_role_interviews
          WHERE role_id IN (${roleIds.join(",")})
        `)
        .first();

      total_interviews = (interviews as any)?.total || 0;
    }

    // Get team breakdown
    const teamBreakdown: any[] = [];
    for (const team of teams.results || []) {
      const t = team as any;
      const teamRoles = (roles.results || []).filter((r: any) => r.team_id === t.id);
      
      let active = 0, deals = 0, lost = 0, on_hold = 0, no_answer = 0;
      const teamRoleIds = teamRoles.map((r: any) => r.id);
      
      for (const r of teamRoles) {
        const role = r as any;
        if (role.status === 'active') active++;
        if (role.status === 'deal') deals++;
        if (role.status === 'lost') lost++;
        if (role.status === 'on_hold') on_hold++;
        if (role.status === 'no_answer') no_answer++;
      }

      let interviews = 0;
      if (teamRoleIds.length > 0) {
        const teamInterviews = await db
          .prepare(`
            SELECT SUM(interview_count) as total
            FROM am_role_interviews
            WHERE role_id IN (${teamRoleIds.join(",")})
          `)
          .first();
        interviews = (teamInterviews as any)?.total || 0;
      }

      teamBreakdown.push({
        team_id: t.id,
        team_name: t.name,
        team_code: t.team_code,
        total_roles: teamRoles.length,
        active_roles: active,
        interviews: interviews,
        deals: deals,
        lost: lost,
        on_hold: on_hold,
        no_answer: no_answer,
      });
    }

    // Get recruiter breakdown
    let recruiterQuery = `
      SELECT DISTINCT u.id, u.name, u.user_code
      FROM users u
      INNER JOIN recruiter_team_assignments rta ON u.id = rta.recruiter_user_id
      WHERE rta.team_id IN (${teamIds.join(",")}) AND u.role = 'recruiter'
    `;

    const recruiterParams: any[] = [];

    if (recruiterId) {
      recruiterQuery += " AND u.id = ?";
      recruiterParams.push(recruiterId);
    }

    const recruiters = await db.prepare(recruiterQuery).bind(...recruiterParams).all();

    const recruiterBreakdown: any[] = [];
    for (const recruiter of recruiters.results || []) {
      const r = recruiter as any;
      
      // Get submissions for this recruiter
      let submissionQuery = `
        SELECT 
          COUNT(*) as total_submissions,
          SUM(CASE WHEN entry_type = 'interview' THEN 1 ELSE 0 END) as interviews,
          SUM(CASE WHEN entry_type = 'deal' THEN 1 ELSE 0 END) as deals,
          SUM(CASE WHEN entry_type = 'dropout' THEN 1 ELSE 0 END) as dropouts
        FROM recruiter_submissions
        WHERE recruiter_user_id = ? AND team_id IN (${teamIds.join(",")})
      `;

      const subParams: any[] = [r.id];

      if (teamId) {
        submissionQuery += " AND team_id = ?";
        subParams.push(teamId);
      }

      if (clientId) {
        submissionQuery += " AND client_id = ?";
        subParams.push(clientId);
      }

      if (startDate && endDate) {
        submissionQuery += " AND submission_date BETWEEN ? AND ?";
        subParams.push(startDate, endDate);
      }

      const stats = await db.prepare(submissionQuery).bind(...subParams).first();
      const s = stats as any;

      recruiterBreakdown.push({
        recruiter_id: r.id,
        recruiter_name: r.name,
        recruiter_code: r.user_code,
        total_submissions: s?.total_submissions || 0,
        interviews: s?.interviews || 0,
        deals: s?.deals || 0,
        lost_roles: s?.dropouts || 0,
      });
    }

    return c.json({
      total_teams: teams.results?.length || 0,
      total_recruiters: recruiters.results?.length || 0,
      total_active_roles,
      total_non_active_roles,
      total_interviews,
      total_deals,
      total_lost,
      total_on_hold,
      total_no_answer,
      team_breakdown: teamBreakdown,
      recruiter_breakdown: recruiterBreakdown,
    });
  } catch (error) {
    console.error("Error fetching RM analytics:", error);
    return c.json({ error: "Failed to fetch analytics" }, 500);
  }
});

// Get EBES Score for RM
app.get("/api/rm/ebes-score", rmOnly, async (c) => {
  const db = c.env.DB;
  const rmUser = c.get("rmUser");
  const startDate = c.req.query("start_date");
  const endDate = c.req.query("end_date");

  try {
    // Get assigned teams
    const teams = await db
      .prepare(`
        SELECT t.id FROM app_teams t
        INNER JOIN team_assignments ta ON t.id = ta.team_id
        WHERE ta.user_id = ?
      `)
      .bind((rmUser as any).id)
      .all();

    const teamIds = (teams.results || []).map((t: any) => t.id);

    if (teamIds.length === 0) {
      return c.json({
        score: 0,
        performance_label: "No Data",
      });
    }

    // Get all submissions for RM's teams
    let submissionQuery = `
      SELECT 
        rs.*
      FROM recruiter_submissions rs
      WHERE rs.team_id IN (${teamIds.join(",")})
    `;

    const params: any[] = [];

    if (startDate && endDate) {
      submissionQuery += " AND rs.submission_date BETWEEN ? AND ?";
      params.push(startDate, endDate);
    }

    const submissions = await db.prepare(submissionQuery).bind(...params).all();

    // Calculate table 1 points
    let table1Points = 0;
    let totalInterviews = 0;
    let totalDeals = 0;

    for (const sub of submissions.results || []) {
      const s = sub as any;
      
      // Submission points
      if (s.submission_type === '6h') table1Points += 2.0;
      else if (s.submission_type === '24h') table1Points += 1.5;
      else if (s.submission_type === 'after_24h') table1Points += 1.0;

      // Entry type points
      if (s.entry_type === 'interview') {
        table1Points += 3.0;
        totalInterviews++;
      } else if (s.entry_type === 'deal') {
        table1Points += 7.0;
        totalDeals++;
      }
    }

    // Get all roles for table 2 calculation
    let roleQuery = `
      SELECT ar.id, ar.status
      FROM am_roles ar
      WHERE ar.team_id IN (${teamIds.join(",")})
    `;

    const roleParams: any[] = [];

    if (startDate && endDate) {
      roleQuery += " AND ar.created_at BETWEEN ? AND ?";
      roleParams.push(startDate, endDate);
    }

    const roles = await db.prepare(roleQuery).bind(...roleParams).all();

    // Calculate table 2 points (assigned roles * 3 + active roles * 1)
    let assignedRoles = roles.results?.length || 0;
    let activeRoles = 0;

    for (const role of roles.results || []) {
      const r = role as any;
      if (r.status === 'active') activeRoles++;
    }

    const table2Points = (assignedRoles * 3.0) + (activeRoles * 1.0);

    // Calculate EBES score
    const ebesScore = table2Points > 0 ? (table1Points / table2Points) * 100 : 0;

    // Determine performance label
    let performanceLabel = "At Risk";
    if (ebesScore >= 90) performanceLabel = "Excellent";
    else if (ebesScore >= 75) performanceLabel = "Strong";
    else if (ebesScore >= 60) performanceLabel = "Average";

    return c.json({
      score: Math.round(ebesScore * 10) / 10,
      performance_label: performanceLabel,
      total_submissions: submissions.results?.length || 0,
      total_interviews: totalInterviews,
      total_deals: totalDeals,
      total_roles: assignedRoles,
      active_roles: activeRoles,
    });
  } catch (error) {
    console.error("Error calculating EBES score:", error);
    return c.json({ error: "Failed to calculate EBES score" }, 500);
  }
});

// Legacy routes for backward compatibility
app.get("/api/rm/team-analytics/:teamId", rmOnly, async (c) => {
  const db = c.env.DB;
  const rmUser = c.get("rmUser");
  const teamId = c.req.param("teamId");
  const startDate = c.req.query("start_date");
  const endDate = c.req.query("end_date");

  try {
    // Verify team assignment
    const teamAssignment = await db
      .prepare("SELECT * FROM team_assignments WHERE user_id = ? AND team_id = ?")
      .bind((rmUser as any).id, teamId)
      .first();

    if (!teamAssignment) {
      return c.json({ error: "Team not assigned to this recruitment manager" }, 404);
    }

    // Get team info
    const team = await db
      .prepare("SELECT * FROM app_teams WHERE id = ?")
      .bind(teamId)
      .first();

    // Get all recruiters assigned to this team
    const recruiters = await db
      .prepare(`
        SELECT u.* FROM users u
        INNER JOIN recruiter_team_assignments rta ON u.id = rta.recruiter_user_id
        WHERE rta.team_id = ? AND u.role = 'recruiter'
      `)
      .bind(teamId)
      .all();

    // Get submission stats for the team
    let submissionQuery = `
      SELECT 
        rs.recruiter_user_id,
        u.name as recruiter_name,
        u.user_code as recruiter_code,
        COUNT(*) as total_submissions,
        SUM(CASE WHEN rs.submission_type = '6h' THEN 1 ELSE 0 END) as submission_6h,
        SUM(CASE WHEN rs.submission_type = '24h' THEN 1 ELSE 0 END) as submission_24h,
        SUM(CASE WHEN rs.submission_type = 'after_24h' THEN 1 ELSE 0 END) as submission_after_24h
      FROM recruiter_submissions rs
      INNER JOIN users u ON rs.recruiter_user_id = u.id
      WHERE rs.team_id = ?
    `;

    const params: any[] = [teamId];

    if (startDate && endDate) {
      submissionQuery += " AND rs.submission_date BETWEEN ? AND ?";
      params.push(startDate, endDate);
    }

    submissionQuery += " GROUP BY rs.recruiter_user_id, u.name, u.user_code";

    const submissionStats = await db.prepare(submissionQuery).bind(...params).all();

    // Calculate team totals
    const teamStats = {
      total_recruiters: recruiters.results?.length || 0,
      total_submissions: 0,
      submission_6h: 0,
      submission_24h: 0,
      submission_after_24h: 0,
    };

    for (const stat of submissionStats.results || []) {
      const data = stat as any;
      teamStats.total_submissions += data.total_submissions;
      teamStats.submission_6h += data.submission_6h;
      teamStats.submission_24h += data.submission_24h;
      teamStats.submission_after_24h += data.submission_after_24h;
    }

    return c.json({
      team,
      team_stats: teamStats,
      recruiter_stats: submissionStats.results || [],
    });
  } catch (error) {
    console.error("Error fetching team analytics:", error);
    return c.json({ error: "Failed to fetch team analytics" }, 500);
  }
});

app.get("/api/rm/performance-summary", rmOnly, async (c) => {
  const db = c.env.DB;
  const rmUser = c.get("rmUser");
  const startDate = c.req.query("start_date");
  const endDate = c.req.query("end_date");

  try {
    // Get all assigned teams
    const teams = await db
      .prepare(`
        SELECT t.id, t.name, t.team_code FROM app_teams t
        INNER JOIN team_assignments ta ON t.id = ta.team_id
        WHERE ta.user_id = ?
      `)
      .bind((rmUser as any).id)
      .all();

    const teamIds = (teams.results || []).map((t: any) => t.id);

    if (teamIds.length === 0) {
      return c.json({
        total_submissions: 0,
        total_recruiters: 0,
        teams: [],
      });
    }

    // Get total submissions across all teams
    let submissionQuery = `
      SELECT COUNT(*) as total
      FROM recruiter_submissions
      WHERE recruitment_manager_id = ?
    `;

    const params: any[] = [(rmUser as any).id];

    if (startDate && endDate) {
      submissionQuery += " AND submission_date BETWEEN ? AND ?";
      params.push(startDate, endDate);
    }

    const totalSubmissions = await db.prepare(submissionQuery).bind(...params).first();

    // Get total recruiters across all teams
    const totalRecruiters = await db
      .prepare(`
        SELECT COUNT(DISTINCT recruiter_user_id) as total
        FROM recruiter_team_assignments
        WHERE team_id IN (${teamIds.join(",")})
      `)
      .all();

    return c.json({
      total_submissions: (totalSubmissions as any)?.total || 0,
      total_recruiters: (totalRecruiters.results?.[0] as any)?.total || 0,
      teams: teams.results || [],
    });
  } catch (error) {
    console.error("Error fetching performance summary:", error);
    return c.json({ error: "Failed to fetch performance summary" }, 500);
  }
});

export default app;
