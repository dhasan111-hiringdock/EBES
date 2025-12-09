import { Hono } from "hono";
import { z } from "zod";

const app = new Hono<{ Bindings: Env }>();

// Testing mode - simulate recruiter user
const recruiterOnly = async (c: any, next: any) => {
  const db = c.env.DB;

  // For testing, get the first recruiter user
  let recruiterUser = await db
    .prepare("SELECT * FROM users WHERE role = 'recruiter' LIMIT 1")
    .first();

  if (!recruiterUser) {
    return c.json({ error: "No recruiter found" }, 403);
  }

  c.set("recruiterUser", recruiterUser);
  await next();
};

// Get assigned clients for recruiter
app.get("/api/recruiter/clients", recruiterOnly, async (c) => {
  const db = c.env.DB;
  const recruiterUser = c.get("recruiterUser");

  try {
    const assignments = await db
      .prepare(`
        SELECT c.*, t.id as team_id, t.name as team_name, t.team_code
        FROM recruiter_client_assignments rca
        INNER JOIN clients c ON rca.client_id = c.id
        INNER JOIN app_teams t ON rca.team_id = t.id
        WHERE rca.recruiter_user_id = ? AND c.is_active = 1
      `)
      .bind((recruiterUser as any).id)
      .all();

    return c.json(assignments.results || []);
  } catch (error) {
    console.error("Error fetching recruiter clients:", error);
    return c.json({ error: "Failed to fetch clients" }, 500);
  }
});

// Get active roles for a client and team
app.get("/api/recruiter/roles/:clientId/:teamId", recruiterOnly, async (c) => {
  const db = c.env.DB;
  const clientId = c.req.param("clientId");
  const teamId = c.req.param("teamId");

  try {
    const roles = await db
      .prepare(`
        SELECT r.*, u.name as account_manager_name
        FROM am_roles r
        INNER JOIN users u ON r.account_manager_id = u.id
        WHERE r.client_id = ? AND r.team_id = ? AND r.status = 'active'
        ORDER BY r.created_at DESC
      `)
      .bind(clientId, teamId)
      .all();

    return c.json(roles.results || []);
  } catch (error) {
    console.error("Error fetching roles:", error);
    return c.json({ error: "Failed to fetch roles" }, 500);
  }
});

// Get recruiter's team and managers info
app.get("/api/recruiter/team-info", recruiterOnly, async (c) => {
  const db = c.env.DB;
  const recruiterUser = c.get("recruiterUser");

  try {
    // Get recruiter's team assignment
    const teamAssignment = await db
      .prepare(`
        SELECT t.id, t.name, t.team_code
        FROM recruiter_team_assignments rta
        INNER JOIN app_teams t ON rta.team_id = t.id
        WHERE rta.recruiter_user_id = ?
        LIMIT 1
      `)
      .bind((recruiterUser as any).id)
      .first();

    if (!teamAssignment) {
      return c.json({ error: "No team assigned" }, 404);
    }

    // Get recruitment manager for this team
    const recruitmentManager = await db
      .prepare(`
        SELECT u.id, u.name, u.email, u.user_code
        FROM users u
        INNER JOIN team_assignments ta ON u.id = ta.user_id
        WHERE ta.team_id = ? AND u.role = 'recruitment_manager'
        LIMIT 1
      `)
      .bind((teamAssignment as any).id)
      .first();

    return c.json({
      team: teamAssignment,
      recruitment_manager: recruitmentManager || null,
    });
  } catch (error) {
    console.error("Error fetching team info:", error);
    return c.json({ error: "Failed to fetch team info" }, 500);
  }
});

// Get roles with deals (for dropout selection)
app.get("/api/recruiter/deal-roles", recruiterOnly, async (c) => {
  const db = c.env.DB;
  const recruiterUser = c.get("recruiterUser");

  try {
    // Get last 10 roles with deal entries from this recruiter
    const dealRoles = await db
      .prepare(`
        SELECT DISTINCT r.*, c.name as client_name, t.name as team_name
        FROM am_roles r
        INNER JOIN recruiter_submissions rs ON r.id = rs.role_id
        INNER JOIN clients c ON r.client_id = c.id
        INNER JOIN app_teams t ON r.team_id = t.id
        WHERE rs.recruiter_user_id = ? 
          AND (rs.entry_type = 'deal' OR r.status = 'deal')
        ORDER BY rs.created_at DESC
        LIMIT 10
      `)
      .bind((recruiterUser as any).id)
      .all();

    return c.json(dealRoles.results || []);
  } catch (error) {
    console.error("Error fetching deal roles:", error);
    return c.json({ error: "Failed to fetch deal roles" }, 500);
  }
});

// Create submission
app.post("/api/recruiter/submissions", recruiterOnly, async (c) => {
  const db = c.env.DB;
  const recruiterUser = c.get("recruiterUser");
  const body = await c.req.json();

  const schema = z.object({
    client_id: z.number().optional(),
    team_id: z.number().optional(),
    role_id: z.number().optional(),
    submission_type: z.enum(["6h", "24h", "after_24h"]).optional(),
    submission_date: z.string(),
    notes: z.string().optional(),
    entry_type: z.enum(["submission", "interview", "deal", "dropout"]).optional(),
    interview_level: z.number().min(1).max(3).optional(),
    dropout_role_id: z.number().optional(),
  });

  try {
    const data = schema.parse(body);

    // Handle different entry types
    const entryType = data.entry_type || "submission";
    let roleId = data.role_id;
    let clientId = data.client_id;
    let teamId = data.team_id;
    let accountManagerId = null;
    let recruitmentManagerId = null;

    // Handle dropout case
    if (entryType === "dropout" && data.dropout_role_id) {
      roleId = data.dropout_role_id;
      
      // Get role details
      const dropoutRole = await db
        .prepare("SELECT * FROM am_roles WHERE id = ?")
        .bind(data.dropout_role_id)
        .first();

      if (!dropoutRole) {
        return c.json({ error: "Dropout role not found" }, 404);
      }

      clientId = (dropoutRole as any).client_id;
      teamId = (dropoutRole as any).team_id;
      accountManagerId = (dropoutRole as any).account_manager_id;

      // Set role status to pending for AM evaluation
      await db
        .prepare("INSERT INTO role_status_pending (role_id, previous_status, reason, created_by_user_id) VALUES (?, ?, ?, ?)")
        .bind(
          data.dropout_role_id,
          (dropoutRole as any).status,
          "Dropout - Candidate refused offer",
          (recruiterUser as any).id
        )
        .run();
    } else if (roleId) {
      // Get role details including account manager
      const role = await db
        .prepare("SELECT * FROM am_roles WHERE id = ?")
        .bind(roleId)
        .first();

      if (!role) {
        return c.json({ error: "Role not found" }, 404);
      }

      accountManagerId = (role as any).account_manager_id;
      clientId = clientId || (role as any).client_id;
      teamId = teamId || (role as any).team_id;

      // If it's a deal entry, update the role status
      if (entryType === "deal") {
        await db
          .prepare("UPDATE am_roles SET status = 'deal' WHERE id = ?")
          .bind(roleId)
          .run();
      }
    }

    // Get recruitment manager from team assignment if we have a team
    if (teamId) {
      const recruitmentManager = await db
        .prepare(`
          SELECT u.id
          FROM users u
          INNER JOIN team_assignments ta ON u.id = ta.user_id
          WHERE ta.team_id = ? AND u.role = 'recruitment_manager'
          LIMIT 1
        `)
        .bind(teamId)
        .first();

      recruitmentManagerId = recruitmentManager ? (recruitmentManager as any).id : null;
    }

    // Insert submission with new fields
    await db
      .prepare(`
        INSERT INTO recruiter_submissions (
          recruiter_user_id, client_id, team_id, role_id, 
          account_manager_id, recruitment_manager_id, 
          submission_type, submission_date, notes, entry_type,
          interview_level, dropout_role_id
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
      .bind(
        (recruiterUser as any).id,
        clientId || null,
        teamId || null,
        roleId || null,
        accountManagerId,
        recruitmentManagerId,
        data.submission_type || null,
        data.submission_date,
        data.notes || "",
        entryType,
        data.interview_level || null,
        data.dropout_role_id || null
      )
      .run();

    // Also update legacy daily_entries for backward compatibility
    const recruiter = await db
      .prepare("SELECT id FROM recruiters WHERE email = ?")
      .bind((recruiterUser as any).email)
      .first();

    if (recruiter) {
      const entry = await db
        .prepare("SELECT * FROM daily_entries WHERE recruiter_id = ? AND entry_date = ?")
        .bind((recruiter as any).id, data.submission_date)
        .first();

      // Determine which field to update
      let updateField = null;
      if (entryType === "submission" && data.submission_type) {
        updateField = data.submission_type === "6h" ? "submission_6h" 
          : data.submission_type === "24h" ? "submission_24h" 
          : "submission_after_24h";
      } else if (entryType === "interview") {
        updateField = "interviews";
      } else if (entryType === "deal") {
        updateField = "deals";
      } else if (entryType === "dropout") {
        updateField = "pullouts";
      }

      if (updateField) {
        if (entry) {
          // Update existing entry
          await db
            .prepare(`UPDATE daily_entries SET ${updateField} = ${updateField} + 1 WHERE id = ?`)
            .bind((entry as any).id)
            .run();
        } else {
          // Create new entry
          await db
            .prepare(`
              INSERT INTO daily_entries (recruiter_id, entry_date, ${updateField})
              VALUES (?, ?, 1)
            `)
            .bind((recruiter as any).id, data.submission_date)
            .run();
        }
      }
    }

    return c.json({ success: true });
  } catch (error) {
    console.error("Error creating submission:", error);
    return c.json({ error: "Failed to create submission" }, 500);
  }
});

// Get recruiter submissions with analytics
app.get("/api/recruiter/submissions", recruiterOnly, async (c) => {
  const db = c.env.DB;
  const recruiterUser = c.get("recruiterUser");
  const startDate = c.req.query("start_date");
  const endDate = c.req.query("end_date");
  const clientId = c.req.query("client_id");

  try {
    let query = `
      SELECT rs.*, c.name as client_name, t.name as team_name, 
             r.title as role_title, r.role_code,
             u.name as account_manager_name
      FROM recruiter_submissions rs
      INNER JOIN clients c ON rs.client_id = c.id
      INNER JOIN app_teams t ON rs.team_id = t.id
      INNER JOIN am_roles r ON rs.role_id = r.id
      INNER JOIN users u ON rs.account_manager_id = u.id
      WHERE rs.recruiter_user_id = ?
    `;

    const params: any[] = [(recruiterUser as any).id];

    if (clientId) {
      query += " AND rs.client_id = ?";
      params.push(parseInt(clientId));
    }

    if (startDate && endDate) {
      query += " AND rs.submission_date BETWEEN ? AND ?";
      params.push(startDate, endDate);
    }

    query += " ORDER BY rs.submission_date DESC, rs.created_at DESC";

    const submissions = await db.prepare(query).bind(...params).all();

    // Calculate stats
    const stats = {
      total: submissions.results?.length || 0,
      submission_6h: submissions.results?.filter((s: any) => s.entry_type === "submission" && s.submission_type === "6h").length || 0,
      submission_24h: submissions.results?.filter((s: any) => s.entry_type === "submission" && s.submission_type === "24h").length || 0,
      submission_after_24h: submissions.results?.filter((s: any) => s.entry_type === "submission" && s.submission_type === "after_24h").length || 0,
      interviews: submissions.results?.filter((s: any) => s.entry_type === "interview").length || 0,
      deals: submissions.results?.filter((s: any) => s.entry_type === "deal").length || 0,
      dropouts: submissions.results?.filter((s: any) => s.entry_type === "dropout").length || 0,
    };

    return c.json({
      submissions: submissions.results || [],
      stats,
    });
  } catch (error) {
    console.error("Error fetching submissions:", error);
    return c.json({ error: "Failed to fetch submissions" }, 500);
  }
});

// Get EBES score with filters
app.get("/api/recruiter/ebes", recruiterOnly, async (c) => {
  const db = c.env.DB;
  const recruiterUser = c.get("recruiterUser");
  const filter = c.req.query("filter") || "combined"; // date, client, combined
  const clientId = c.req.query("client_id");

  try {
    let query = `
      SELECT rs.*
      FROM recruiter_submissions rs
      WHERE rs.recruiter_user_id = ?
    `;

    const params: any[] = [(recruiterUser as any).id];

    // Apply filters
    if (filter === "date") {
      // Current month only
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split("T")[0];
      query += ` AND rs.submission_date BETWEEN ? AND ?`;
      params.push(startOfMonth, endOfMonth);
    } else if (filter === "client" && clientId) {
      // Specific client only
      query += ` AND rs.client_id = ?`;
      params.push(parseInt(clientId));
    }
    // else combined = all data

    const submissions = await db.prepare(query).bind(...params).all();

    // Calculate EBES score
    const results = submissions.results || [];
    
    // Count different types
    const submission6h = results.filter((s: any) => s.entry_type === "submission" && s.submission_type === "6h").length;
    const submission24h = results.filter((s: any) => s.entry_type === "submission" && s.submission_type === "24h").length;
    const submissionAfter24h = results.filter((s: any) => s.entry_type === "submission" && s.submission_type === "after_24h").length;
    const interviews = results.filter((s: any) => s.entry_type === "interview").length;
    const deals = results.filter((s: any) => s.entry_type === "deal").length;
    const dropouts = results.filter((s: any) => s.entry_type === "dropout").length;

    // EBES calculation (simplified version)
    // Points: 6h=5pts, 24h=3pts, after24h=1pt, interviews=2pts, deals=10pts, dropouts=-5pts
    const totalPoints = 
      (submission6h * 5) + 
      (submission24h * 3) + 
      (submissionAfter24h * 1) + 
      (interviews * 2) + 
      (deals * 10) + 
      (dropouts * -5);

    const totalEntries = results.length || 1;
    const score = totalPoints / totalEntries;

    return c.json({ 
      score: Math.max(0, score), // Don't allow negative scores
      breakdown: {
        submission_6h: submission6h,
        submission_24h: submission24h,
        submission_after_24h: submissionAfter24h,
        interviews,
        deals,
        dropouts,
        totalPoints,
        totalEntries
      }
    });
  } catch (error) {
    console.error("Error calculating EBES:", error);
    return c.json({ error: "Failed to calculate EBES" }, 500);
  }
});

// Get all roles for recruiter (for analytics filters)
app.get("/api/recruiter/all-roles", recruiterOnly, async (c) => {
  const db = c.env.DB;
  const recruiterUser = c.get("recruiterUser");

  try {
    const roles = await db
      .prepare(`
        SELECT DISTINCT r.id, r.title, r.role_code
        FROM am_roles r
        INNER JOIN recruiter_submissions rs ON r.id = rs.role_id
        WHERE rs.recruiter_user_id = ?
        ORDER BY r.title
      `)
      .bind((recruiterUser as any).id)
      .all();

    return c.json(roles.results || []);
  } catch (error) {
    console.error("Error fetching roles:", error);
    return c.json({ error: "Failed to fetch roles" }, 500);
  }
});

// Get recruiter analytics with filters
app.get("/api/recruiter/analytics", recruiterOnly, async (c) => {
  const db = c.env.DB;
  const recruiterUser = c.get("recruiterUser");
  const clientId = c.req.query("client_id");
  const roleId = c.req.query("role_id");
  const entryType = c.req.query("entry_type");
  const dateRange = c.req.query("date_range") || "this_month";
  const startDate = c.req.query("start_date");
  const endDate = c.req.query("end_date");

  try {
    // Build date filter
    let dateFilter = "";
    const now = new Date();
    let dateParams: string[] = [];

    if (dateRange === "today") {
      const today = now.toISOString().split("T")[0];
      dateFilter = "AND rs.submission_date = ?";
      dateParams = [today];
    } else if (dateRange === "this_week") {
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - now.getDay());
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);
      dateFilter = "AND rs.submission_date BETWEEN ? AND ?";
      dateParams = [startOfWeek.toISOString().split("T")[0], endOfWeek.toISOString().split("T")[0]];
    } else if (dateRange === "this_month") {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      dateFilter = "AND rs.submission_date BETWEEN ? AND ?";
      dateParams = [startOfMonth.toISOString().split("T")[0], endOfMonth.toISOString().split("T")[0]];
    } else if (dateRange === "custom" && startDate && endDate) {
      dateFilter = "AND rs.submission_date BETWEEN ? AND ?";
      dateParams = [startDate, endDate];
    }

    // Build base query
    let query = `
      SELECT rs.*
      FROM recruiter_submissions rs
      WHERE rs.recruiter_user_id = ?
    `;
    const params: any[] = [(recruiterUser as any).id];

    if (clientId) {
      query += " AND rs.client_id = ?";
      params.push(parseInt(clientId));
    }
    if (roleId) {
      query += " AND rs.role_id = ?";
      params.push(parseInt(roleId));
    }
    if (entryType) {
      query += " AND rs.entry_type = ?";
      params.push(entryType);
    }
    if (dateFilter) {
      query += ` ${dateFilter}`;
      params.push(...dateParams);
    }

    const submissions = await db.prepare(query).bind(...params).all();
    const results = submissions.results || [];

    // Calculate stats
    const total_submissions = results.filter((s: any) => s.entry_type === "submission").length;
    const total_interviews = results.filter((s: any) => s.entry_type === "interview").length;
    const interview_1 = results.filter((s: any) => s.entry_type === "interview" && s.interview_level === 1).length;
    const interview_2 = results.filter((s: any) => s.entry_type === "interview" && s.interview_level === 2).length;
    const interview_3 = results.filter((s: any) => s.entry_type === "interview" && s.interview_level === 3).length;
    const total_deals = results.filter((s: any) => s.entry_type === "deal").length;
    const total_dropouts = results.filter((s: any) => s.entry_type === "dropout").length;

    // Get active roles count
    const activeRolesQuery = `
      SELECT COUNT(DISTINCT rs.role_id) as count
      FROM recruiter_submissions rs
      INNER JOIN am_roles r ON rs.role_id = r.id
      WHERE rs.recruiter_user_id = ? AND r.status = 'active'
    `;
    const activeRolesResult = await db.prepare(activeRolesQuery).bind((recruiterUser as any).id).first();
    const active_roles_count = (activeRolesResult as any)?.count || 0;

    // Client breakdown
    const clientBreakdown = await db
      .prepare(`
        SELECT c.name as client_name, COUNT(*) as count
        FROM recruiter_submissions rs
        INNER JOIN clients c ON rs.client_id = c.id
        WHERE rs.recruiter_user_id = ? ${roleId ? "AND rs.role_id = ?" : ""} ${entryType ? "AND rs.entry_type = ?" : ""} ${dateFilter}
        GROUP BY c.id, c.name
        ORDER BY count DESC
      `)
      .bind(...[
        (recruiterUser as any).id,
        ...(roleId ? [parseInt(roleId)] : []),
        ...(entryType ? [entryType] : []),
        ...dateParams
      ].filter(p => p !== undefined))
      .all();

    // Team breakdown
    const teamBreakdown = await db
      .prepare(`
        SELECT t.name as team_name, COUNT(*) as count
        FROM recruiter_submissions rs
        INNER JOIN app_teams t ON rs.team_id = t.id
        WHERE rs.recruiter_user_id = ? ${clientId ? "AND rs.client_id = ?" : ""} ${roleId ? "AND rs.role_id = ?" : ""} ${entryType ? "AND rs.entry_type = ?" : ""} ${dateFilter}
        GROUP BY t.id, t.name
        ORDER BY count DESC
      `)
      .bind(...[
        (recruiterUser as any).id,
        ...(clientId ? [parseInt(clientId)] : []),
        ...(roleId ? [parseInt(roleId)] : []),
        ...(entryType ? [entryType] : []),
        ...dateParams
      ].filter(p => p !== undefined))
      .all();

    // Daily trend (last 30 days)
    const dailyTrend = await db
      .prepare(`
        SELECT rs.submission_date as date, COUNT(*) as count
        FROM recruiter_submissions rs
        WHERE rs.recruiter_user_id = ? 
          ${clientId ? "AND rs.client_id = ?" : ""}
          ${roleId ? "AND rs.role_id = ?" : ""}
          ${entryType ? "AND rs.entry_type = ?" : ""}
          AND rs.submission_date >= date('now', '-30 days')
        GROUP BY rs.submission_date
        ORDER BY rs.submission_date DESC
        LIMIT 30
      `)
      .bind(...[
        (recruiterUser as any).id,
        ...(clientId ? [parseInt(clientId)] : []),
        ...(roleId ? [parseInt(roleId)] : []),
        ...(entryType ? [entryType] : [])
      ].filter(p => p !== undefined))
      .all();

    // Monthly trend (last 12 months)
    const monthlyTrend = await db
      .prepare(`
        SELECT strftime('%Y-%m', rs.submission_date) as month, COUNT(*) as count
        FROM recruiter_submissions rs
        WHERE rs.recruiter_user_id = ? 
          ${clientId ? "AND rs.client_id = ?" : ""}
          ${roleId ? "AND rs.role_id = ?" : ""}
          ${entryType ? "AND rs.entry_type = ?" : ""}
          AND rs.submission_date >= date('now', '-12 months')
        GROUP BY month
        ORDER BY month DESC
        LIMIT 12
      `)
      .bind(...[
        (recruiterUser as any).id,
        ...(clientId ? [parseInt(clientId)] : []),
        ...(roleId ? [parseInt(roleId)] : []),
        ...(entryType ? [entryType] : [])
      ].filter(p => p !== undefined))
      .all();

    return c.json({
      total_submissions,
      total_interviews,
      interview_1,
      interview_2,
      interview_3,
      total_deals,
      total_dropouts,
      active_roles_count,
      client_breakdown: clientBreakdown.results || [],
      team_breakdown: teamBreakdown.results || [],
      daily_trend: (dailyTrend.results || []).reverse(),
      monthly_trend: (monthlyTrend.results || []).reverse()
    });
  } catch (error) {
    console.error("Error fetching analytics:", error);
    return c.json({ error: "Failed to fetch analytics" }, 500);
  }
});

// Get recruiter EBES score with date filter
app.get("/api/recruiter/ebes-score", recruiterOnly, async (c) => {
  const db = c.env.DB;
  const recruiterUser = c.get("recruiterUser");
  const filter = c.req.query("filter") || "current_month";
  const startDate = c.req.query("start_date");
  const endDate = c.req.query("end_date");

  try {
    let query = `
      SELECT rs.*
      FROM recruiter_submissions rs
      WHERE rs.recruiter_user_id = ? AND rs.entry_type = 'submission'
    `;
    const params: any[] = [(recruiterUser as any).id];

    const now = new Date();
    if (filter === "current_month") {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split("T")[0];
      query += " AND rs.submission_date BETWEEN ? AND ?";
      params.push(startOfMonth, endOfMonth);
    } else if (filter === "last_month") {
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const startOfLastMonth = new Date(lastMonth.getFullYear(), lastMonth.getMonth(), 1).toISOString().split("T")[0];
      const endOfLastMonth = new Date(lastMonth.getFullYear(), lastMonth.getMonth() + 1, 0).toISOString().split("T")[0];
      query += " AND rs.submission_date BETWEEN ? AND ?";
      params.push(startOfLastMonth, endOfLastMonth);
    } else if (filter === "custom" && startDate && endDate) {
      query += " AND rs.submission_date BETWEEN ? AND ?";
      params.push(startDate, endDate);
    }

    const submissions = await db.prepare(query).bind(...params).all();
    const results = submissions.results || [];

    // EBES calculation based only on submissions
    const submission6h = results.filter((s: any) => s.submission_type === "6h").length;
    const submission24h = results.filter((s: any) => s.submission_type === "24h").length;
    const submissionAfter24h = results.filter((s: any) => s.submission_type === "after_24h").length;

    // Points: 6h=5pts, 24h=3pts, after24h=1pt
    const totalPoints = (submission6h * 5) + (submission24h * 3) + (submissionAfter24h * 1);
    const totalSubmissions = results.length || 1;
    const score = totalPoints / totalSubmissions;

    // Performance label based on score
    let performance_label = "At Risk";
    if (score >= 4.0) performance_label = "Excellent";
    else if (score >= 3.0) performance_label = "Strong";
    else if (score >= 2.0) performance_label = "Average";

    return c.json({
      score: Math.max(0, score),
      performance_label
    });
  } catch (error) {
    console.error("Error calculating EBES score:", error);
    return c.json({ error: "Failed to calculate EBES score" }, 500);
  }
});

export default app;
