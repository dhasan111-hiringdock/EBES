import { Hono } from "hono";
import { z } from "zod";

const app = new Hono<{ Bindings: Env }>();

// Middleware to verify Account Manager role
const amOnly = async (c: any, next: any) => {
  const db = c.env.DB;
  const userId = c.req.header("x-user-id");

  if (!userId) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const user = await db
    .prepare("SELECT * FROM users WHERE id = ? AND role = 'account_manager'")
    .bind(userId)
    .first();

  if (!user) {
    return c.json({ error: "Unauthorized - Account Manager only" }, 403);
  }

  c.set("amUser", user);
  await next();
};

// Generate role code
async function generateRoleCode(db: any): Promise<string> {
  const counter = await db
    .prepare("SELECT next_number FROM code_counters WHERE category = 'am_role'")
    .first();

  const number = (counter as any).next_number;
  const code = `ROLE-${number.toString().padStart(4, "0")}`;

  await db
    .prepare("UPDATE code_counters SET next_number = next_number + 1 WHERE category = 'am_role'")
    .run();

  return code;
}

// Get current month key (YYYY-MM)
function getCurrentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

// Get AM assignments
app.get("/api/am/assignments", amOnly, async (c) => {
  const db = c.env.DB;
  const amUser = c.get("amUser");

  try {
    const clients = await db
      .prepare(`
        SELECT c.* FROM clients c
        INNER JOIN client_assignments ca ON c.id = ca.client_id
        WHERE ca.user_id = ?
      `)
      .bind((amUser as any).id)
      .all();

    const teams = await db
      .prepare(`
        SELECT t.* FROM app_teams t
        INNER JOIN team_assignments ta ON t.id = ta.team_id
        WHERE ta.user_id = ?
      `)
      .bind((amUser as any).id)
      .all();

    return c.json({
      clients: clients.results || [],
      teams: teams.results || [],
    });
  } catch (error) {
    return c.json({ error: "Failed to fetch assignments" }, 500);
  }
});

// Check monthly reminder status
app.get("/api/am/reminder-status", amOnly, async (c) => {
  const db = c.env.DB;
  const amUser = c.get("amUser");
  const currentMonth = getCurrentMonth();

  try {
    const reminder = await db
      .prepare("SELECT * FROM am_monthly_reminders WHERE user_id = ? AND reminder_month = ?")
      .bind((amUser as any).id, currentMonth)
      .first();

    return c.json({
      shouldShow: !reminder || !(reminder as any).is_confirmed,
      currentMonth,
    });
  } catch (error) {
    return c.json({ error: "Failed to check reminder status" }, 500);
  }
});

// Confirm monthly reminder
app.post("/api/am/confirm-reminder", amOnly, async (c) => {
  const db = c.env.DB;
  const amUser = c.get("amUser");
  const currentMonth = getCurrentMonth();

  try {
    await db
      .prepare(`
        INSERT INTO am_monthly_reminders (user_id, reminder_month, is_confirmed)
        VALUES (?, ?, 1)
        ON CONFLICT(user_id, reminder_month) DO UPDATE SET is_confirmed = 1
      `)
      .bind((amUser as any).id, currentMonth)
      .run();

    return c.json({ success: true });
  } catch (error) {
    return c.json({ error: "Failed to confirm reminder" }, 500);
  }
});

// Get all roles for AM
app.get("/api/am/roles", amOnly, async (c) => {
  const db = c.env.DB;
  const amUser = c.get("amUser");
  const status = c.req.query("status");

  try {
    let query = `
      SELECT r.*, c.name as client_name, t.name as team_name
      FROM am_roles r
      INNER JOIN clients c ON r.client_id = c.id
      INNER JOIN app_teams t ON r.team_id = t.id
      WHERE r.account_manager_id = ?
    `;

    if (status === "active") {
      query += " AND r.status = 'active'";
    } else if (status === "non-active") {
      query += " AND r.status != 'active'";
    }

    query += " ORDER BY r.created_at DESC";

    const roles = await db.prepare(query).bind((amUser as any).id).all();

    // Get interview counts for each role
    const rolesWithInterviews = await Promise.all(
      (roles.results || []).map(async (role: any) => {
        const interviews = await db
          .prepare(`
            SELECT interview_round, SUM(interview_count) as total
            FROM am_role_interviews
            WHERE role_id = ?
            GROUP BY interview_round
          `)
          .bind(role.id)
          .all();

        const interviewMap: any = { 1: 0, 2: 0, 3: 0 };
        for (const interview of interviews.results || []) {
          const data = interview as any;
          interviewMap[data.interview_round] = data.total;
        }

        return {
          ...role,
          interview_1_count: interviewMap[1],
          interview_2_count: interviewMap[2],
          interview_3_count: interviewMap[3],
          total_interviews: interviewMap[1] + interviewMap[2] + interviewMap[3],
        };
      })
    );

    return c.json(rolesWithInterviews);
  } catch (error) {
    return c.json({ error: "Failed to fetch roles" }, 500);
  }
});

// Create role
app.post("/api/am/roles", amOnly, async (c) => {
  const db = c.env.DB;
  const amUser = c.get("amUser");
  const body = await c.req.json();

  const schema = z.object({
    client_id: z.number(),
    team_id: z.number(),
    title: z.string().min(1),
    description: z.string().optional(),
  });

  try {
    const data = schema.parse(body);

    // Check active role limit
    const activeCount = await db
      .prepare("SELECT COUNT(*) as count FROM am_roles WHERE account_manager_id = ? AND status = 'active'")
      .bind((amUser as any).id)
      .first();

    if ((activeCount as any).count >= 30) {
      return c.json({ error: "You have reached the maximum of 30 active roles. Please update role statuses to continue." }, 400);
    }

    const roleCode = await generateRoleCode(db);

    const result = await db
      .prepare(`
        INSERT INTO am_roles (role_code, client_id, team_id, account_manager_id, title, description, status)
        VALUES (?, ?, ?, ?, ?, ?, 'active')
      `)
      .bind(roleCode, data.client_id, data.team_id, (amUser as any).id, data.title, data.description || "")
      .run();

    return c.json({
      success: true,
      id: result.meta.last_row_id,
      role_code: roleCode,
    });
  } catch (error) {
    console.error("Error creating role:", error);
    return c.json({ error: "Failed to create role" }, 500);
  }
});

// Update role
app.put("/api/am/roles/:id", amOnly, async (c) => {
  const db = c.env.DB;
  const amUser = c.get("amUser");
  const roleId = c.req.param("id");
  const body = await c.req.json();

  const schema = z.object({
    title: z.string().min(1).optional(),
    description: z.string().optional(),
    status: z.enum(["active", "lost", "deal", "on_hold", "cancelled", "no_answer"]).optional(),
  });

  try {
    const data = schema.parse(body);

    // Verify ownership
    const role = await db
      .prepare("SELECT * FROM am_roles WHERE id = ? AND account_manager_id = ?")
      .bind(roleId, (amUser as any).id)
      .first();

    if (!role) {
      return c.json({ error: "Role not found" }, 404);
    }

    const updates: string[] = [];
    const values: any[] = [];

    if (data.title !== undefined) {
      updates.push("title = ?");
      values.push(data.title);
    }
    if (data.description !== undefined) {
      updates.push("description = ?");
      values.push(data.description);
    }
    if (data.status !== undefined) {
      updates.push("status = ?");
      values.push(data.status);
    }

    if (updates.length === 0) {
      return c.json({ error: "No fields to update" }, 400);
    }

    updates.push("updated_at = CURRENT_TIMESTAMP");
    values.push(roleId, (amUser as any).id);

    await db
      .prepare(`UPDATE am_roles SET ${updates.join(", ")} WHERE id = ? AND account_manager_id = ?`)
      .bind(...values)
      .run();

    return c.json({ success: true });
  } catch (error) {
    return c.json({ error: "Failed to update role" }, 500);
  }
});

// Delete role
app.delete("/api/am/roles/:id", amOnly, async (c) => {
  const db = c.env.DB;
  const amUser = c.get("amUser");
  const roleId = c.req.param("id");

  try {
    // Delete interviews first
    await db.prepare("DELETE FROM am_role_interviews WHERE role_id = ?").bind(roleId).run();

    // Delete role
    await db
      .prepare("DELETE FROM am_roles WHERE id = ? AND account_manager_id = ?")
      .bind(roleId, (amUser as any).id)
      .run();

    return c.json({ success: true });
  } catch (error) {
    return c.json({ error: "Failed to delete role" }, 500);
  }
});

// Add interview entry
app.post("/api/am/roles/:id/interviews", amOnly, async (c) => {
  const db = c.env.DB;
  const amUser = c.get("amUser");
  const roleId = c.req.param("id");
  const body = await c.req.json();

  const schema = z.object({
    interview_round: z.number().min(1).max(3),
    interview_count: z.number().min(1),
  });

  try {
    const data = schema.parse(body);

    // Verify ownership
    const role = await db
      .prepare("SELECT * FROM am_roles WHERE id = ? AND account_manager_id = ?")
      .bind(roleId, (amUser as any).id)
      .first();

    if (!role) {
      return c.json({ error: "Role not found" }, 404);
    }

    const currentMonth = getCurrentMonth();

    await db
      .prepare(`
        INSERT INTO am_role_interviews (role_id, interview_round, interview_count, entry_month)
        VALUES (?, ?, ?, ?)
      `)
      .bind(roleId, data.interview_round, data.interview_count, currentMonth)
      .run();

    return c.json({ success: true });
  } catch (error) {
    return c.json({ error: "Failed to add interview entry" }, 500);
  }
});

// Get client analytics
app.get("/api/am/analytics", amOnly, async (c) => {
  const db = c.env.DB;
  const amUser = c.get("amUser");
  
  // Get date range from query params
  const startDate = c.req.query("start_date");
  const endDate = c.req.query("end_date");

  try {
    // Get assigned clients
    const clients = await db
      .prepare(`
        SELECT c.* FROM clients c
        INNER JOIN client_assignments ca ON c.id = ca.client_id
        WHERE ca.user_id = ?
      `)
      .bind((amUser as any).id)
      .all();
    
    // Also get submission counts for clients from recruiter_submissions
    const submissionCounts = await db
      .prepare(`
        SELECT client_id, COUNT(*) as submission_count
        FROM recruiter_submissions
        WHERE account_manager_id = ?
        ${startDate && endDate ? 'AND submission_date BETWEEN ? AND ?' : ''}
        GROUP BY client_id
      `)
      .bind((amUser as any).id, ...(startDate && endDate ? [startDate, endDate] : []))
      .all();

    const currentMonth = getCurrentMonth();
    const now = new Date();
    const lastMonth = `${now.getFullYear()}-${String(now.getMonth() === 0 ? 12 : now.getMonth()).padStart(2, "0")}`;

    const clientAnalytics = await Promise.all(
      (clients.results || []).map(async (client: any) => {
        // Get all roles for this client, filtered by date range if provided
        let rolesQuery = "SELECT * FROM am_roles WHERE client_id = ? AND account_manager_id = ?";
        const rolesParams: any[] = [client.id, (amUser as any).id];
        
        if (startDate && endDate) {
          rolesQuery += " AND created_at BETWEEN ? AND ?";
          rolesParams.push(startDate, endDate + " 23:59:59");
        }
        
        const roles = await db
          .prepare(rolesQuery)
          .bind(...rolesParams)
          .all();

        const allRoles = roles.results || [];
        const totalRoles = allRoles.length;
        const activeRoles = allRoles.filter((r: any) => r.status === "active").length;
        const dealRoles = allRoles.filter((r: any) => r.status === "deal").length;
        const lostRoles = allRoles.filter((r: any) => r.status === "lost").length;
        const onHoldRoles = allRoles.filter((r: any) => r.status === "on_hold").length;
        const cancelledRoles = allRoles.filter((r: any) => r.status === "cancelled").length;
        const noAnswerRoles = allRoles.filter((r: any) => r.status === "no_answer").length;

        // Calculate interview totals
        let totalInterviews = 0;
        let interview1Total = 0;
        let interview2Total = 0;
        let interview3Total = 0;

        for (const role of allRoles) {
          const interviews = await db
            .prepare(`
              SELECT interview_round, SUM(interview_count) as total
              FROM am_role_interviews
              WHERE role_id = ?
              GROUP BY interview_round
            `)
            .bind((role as any).id)
            .all();

          for (const interview of interviews.results || []) {
            const data = interview as any;
            const count = data.total;
            totalInterviews += count;
            if (data.interview_round === 1) interview1Total += count;
            if (data.interview_round === 2) interview2Total += count;
            if (data.interview_round === 3) interview3Total += count;
          }
        }

        // Monthly comparison
        const currentMonthRoles = allRoles.filter((r: any) => 
          r.created_at && r.created_at.startsWith(currentMonth)
        ).length;
        
        const lastMonthRoles = allRoles.filter((r: any) => 
          r.created_at && r.created_at.startsWith(lastMonth)
        ).length;

        const currentMonthDeals = allRoles.filter((r: any) => 
          r.status === "deal" && r.updated_at && r.updated_at.startsWith(currentMonth)
        ).length;

        const lastMonthDeals = allRoles.filter((r: any) => 
          r.status === "deal" && r.updated_at && r.updated_at.startsWith(lastMonth)
        ).length;

        const currentMonthLost = allRoles.filter((r: any) => 
          r.status === "lost" && r.updated_at && r.updated_at.startsWith(currentMonth)
        ).length;

        const lastMonthLost = allRoles.filter((r: any) => 
          r.status === "lost" && r.updated_at && r.updated_at.startsWith(lastMonth)
        ).length;

        // Calculate interviews (filter by date range if provided)
        let currentMonthInterviews = 0;
        let lastMonthInterviews = 0;

        for (const role of allRoles) {
          if (startDate && endDate) {
            // For date range filtering, get interviews within that range
            const rangeInterviews = await db
              .prepare(`
                SELECT SUM(interview_count) as total
                FROM am_role_interviews
                WHERE role_id = ? AND entry_month BETWEEN ? AND ?
              `)
              .bind((role as any).id, startDate.substring(0, 7), endDate.substring(0, 7))
              .first();
            
            currentMonthInterviews += (rangeInterviews as any)?.total || 0;
          } else {
            const currentInterviews = await db
              .prepare(`
                SELECT SUM(interview_count) as total
                FROM am_role_interviews
                WHERE role_id = ? AND entry_month = ?
              `)
              .bind((role as any).id, currentMonth)
              .first();

            const lastInterviews = await db
              .prepare(`
                SELECT SUM(interview_count) as total
                FROM am_role_interviews
                WHERE role_id = ? AND entry_month = ?
              `)
              .bind((role as any).id, lastMonth)
              .first();

            currentMonthInterviews += (currentInterviews as any)?.total || 0;
            lastMonthInterviews += (lastInterviews as any)?.total || 0;
          }
        }

        // Conversion rates
        const rolesToDealConversion = totalRoles > 0 ? (dealRoles / totalRoles) * 100 : 0;
        const interviewToDealConversion = totalInterviews > 0 ? (dealRoles / totalInterviews) * 100 : 0;

        // Interview drop-off
        const stage1To2Dropoff = interview1Total > 0 ? ((interview1Total - interview2Total) / interview1Total) * 100 : 0;
        const stage2To3Dropoff = interview2Total > 0 ? ((interview2Total - interview3Total) / interview2Total) * 100 : 0;

        // Calculate health score (0-100)
        let healthScore = 0;
        
        // Positive factors
        if (totalRoles > 0) healthScore += 20;
        if (dealRoles > 0) healthScore += (dealRoles / Math.max(totalRoles, 1)) * 30;
        if (totalInterviews > 0) healthScore += 15;
        if (rolesToDealConversion > 20) healthScore += 20;
        if (currentMonthDeals > lastMonthDeals) healthScore += 10;
        
        // Negative factors
        if (lostRoles > dealRoles) healthScore -= 15;
        if (cancelledRoles > 3) healthScore -= 10;
        if (noAnswerRoles > 5) healthScore -= 10;
        if (activeRoles > 15 && dealRoles === 0) healthScore -= 20;
        
        healthScore = Math.max(0, Math.min(100, healthScore));

        // Determine health tag
        let healthTag = "Average Account";
        if (healthScore >= 70) healthTag = "Strong Account";
        else if (healthScore < 40) healthTag = "At Risk Account";

        // Risk indicators
        const highActiveRoleLowDeals = activeRoles > 10 && dealRoles < 2;
        const highInterviewsNoClosures = totalInterviews > 20 && dealRoles === 0;
        const consistentClosures = dealRoles >= 3 && currentMonthDeals > 0;
        const repeatedCancellations = cancelledRoles > 3;

        return {
          client_id: client.id,
          client_name: client.name,
          client_code: client.client_code,
          
          // Overview
          total_roles: totalRoles,
          active_roles: activeRoles,
          deal_roles: dealRoles,
          lost_roles: lostRoles,
          on_hold_roles: onHoldRoles,
          cancelled_roles: cancelledRoles,
          no_answer_roles: noAnswerRoles,
          
          // Interviews
          total_interviews: totalInterviews,
          interview_1_count: interview1Total,
          interview_2_count: interview2Total,
          interview_3_count: interview3Total,
          
          // Conversions
          roles_to_deal_conversion: Math.round(rolesToDealConversion * 10) / 10,
          interview_to_deal_conversion: Math.round(interviewToDealConversion * 10) / 10,
          stage_1_to_2_dropoff: Math.round(stage1To2Dropoff * 10) / 10,
          stage_2_to_3_dropoff: Math.round(stage2To3Dropoff * 10) / 10,
          
          // Monthly comparison
          current_month: {
            roles_created: currentMonthRoles,
            interviews: currentMonthInterviews,
            deals: currentMonthDeals,
            lost: currentMonthLost,
          },
          last_month: {
            roles_created: lastMonthRoles,
            interviews: lastMonthInterviews,
            deals: lastMonthDeals,
            lost: lastMonthLost,
          },
          
          // Growth
          roles_growth: lastMonthRoles > 0 ? Math.round(((currentMonthRoles - lastMonthRoles) / lastMonthRoles) * 100) : 0,
          interviews_growth: lastMonthInterviews > 0 ? Math.round(((currentMonthInterviews - lastMonthInterviews) / lastMonthInterviews) * 100) : 0,
          deals_growth: lastMonthDeals > 0 ? Math.round(((currentMonthDeals - lastMonthDeals) / lastMonthDeals) * 100) : 0,
          
          // Health
          health_score: Math.round(healthScore),
          health_tag: healthTag,
          
          // Risk indicators
          high_active_low_deals: highActiveRoleLowDeals,
          high_interviews_no_closures: highInterviewsNoClosures,
          consistent_closures: consistentClosures,
          repeated_cancellations: repeatedCancellations,
        };
      })
    );

    return c.json({
      clients: clientAnalytics,
      summary: {
        total_clients: clientAnalytics.length,
        strong_accounts: clientAnalytics.filter((c: any) => c.health_tag === "Strong Account").length,
        average_accounts: clientAnalytics.filter((c: any) => c.health_tag === "Average Account").length,
        at_risk_accounts: clientAnalytics.filter((c: any) => c.health_tag === "At Risk Account").length,
      },
    });
  } catch (error) {
    console.error("Error fetching analytics:", error);
    return c.json({ error: "Failed to fetch analytics" }, 500);
  }
});

// Get Performance Dashboard Data
app.get("/api/am/performance", amOnly, async (c) => {
  const db = c.env.DB;
  const amUser = c.get("amUser");
  
  const clientId = c.req.query("client_id");
  const teamId = c.req.query("team_id");
  const status = c.req.query("status");
  const dateRange = c.req.query("date_range");
  const startDate = c.req.query("start_date");
  const endDate = c.req.query("end_date");

  try {
    // Build date filter
    let dateFilter = "";
    let dateParams: any[] = [];
    
    if (startDate && endDate) {
      dateFilter = " AND created_at BETWEEN ? AND ?";
      dateParams = [startDate, endDate + " 23:59:59"];
    } else if (dateRange) {
      const now = new Date();
      if (dateRange === "this_week") {
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() - now.getDay());
        dateFilter = " AND created_at >= ?";
        dateParams = [weekStart.toISOString().split('T')[0]];
      } else if (dateRange === "this_month") {
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        dateFilter = " AND created_at >= ?";
        dateParams = [monthStart.toISOString().split('T')[0]];
      } else if (dateRange === "last_month") {
        const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
        dateFilter = " AND created_at BETWEEN ? AND ?";
        dateParams = [
          lastMonthStart.toISOString().split('T')[0],
          lastMonthEnd.toISOString().split('T')[0] + " 23:59:59"
        ];
      }
    }

    // Build role query
    let rolesQuery = "SELECT * FROM am_roles WHERE account_manager_id = ?";
    const rolesParams: any[] = [(amUser as any).id];
    
    if (clientId) {
      rolesQuery += " AND client_id = ?";
      rolesParams.push(clientId);
    }
    if (teamId) {
      rolesQuery += " AND team_id = ?";
      rolesParams.push(teamId);
    }
    if (status && status !== "all") {
      rolesQuery += " AND status = ?";
      rolesParams.push(status);
    }
    
    rolesQuery += dateFilter;
    rolesParams.push(...dateParams);

    const roles = await db.prepare(rolesQuery).bind(...rolesParams).all();
    const allRoles = roles.results || [];

    // Calculate overview metrics
    const totalRoles = allRoles.length;
    const activeRoles = allRoles.filter((r: any) => r.status === "active").length;
    const nonActiveRoles = totalRoles - activeRoles;
    const dealRoles = allRoles.filter((r: any) => r.status === "deal").length;
    const lostRoles = allRoles.filter((r: any) => r.status === "lost").length;
    const onHoldRoles = allRoles.filter((r: any) => r.status === "on_hold").length;
    const noAnswerRoles = allRoles.filter((r: any) => r.status === "no_answer").length;
    const cancelledRoles = allRoles.filter((r: any) => r.status === "cancelled").length;

    // Calculate interview counts
    let interview1Count = 0;
    let interview2Count = 0;
    let interview3Count = 0;

    for (const role of allRoles) {
      const interviews = await db
        .prepare(`
          SELECT interview_round, SUM(interview_count) as total
          FROM am_role_interviews
          WHERE role_id = ?
          GROUP BY interview_round
        `)
        .bind((role as any).id)
        .all();

      for (const interview of interviews.results || []) {
        const data = interview as any;
        if (data.interview_round === 1) interview1Count += data.total;
        if (data.interview_round === 2) interview2Count += data.total;
        if (data.interview_round === 3) interview3Count += data.total;
      }
    }

    const totalInterviews = interview1Count + interview2Count + interview3Count;

    // Calculate EBES Score
    const ebesScore = 
      (totalRoles * 2) +
      (interview1Count * 2) +
      (interview2Count * 2) +
      (dealRoles * 10) -
      (lostRoles * 4) -
      (noAnswerRoles * 2) -
      (onHoldRoles * 1);

    let performanceLabel = "Average";
    if (ebesScore >= 100) performanceLabel = "Excellent";
    else if (ebesScore >= 50) performanceLabel = "Strong";
    else if (ebesScore < 20) performanceLabel = "At Risk";

    // Monthly comparison
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const lastMonth = `${now.getFullYear()}-${String(now.getMonth() === 0 ? 12 : now.getMonth()).padStart(2, "0")}`;

    const currentMonthRoles = allRoles.filter((r: any) => 
      r.created_at && r.created_at.startsWith(currentMonth)
    ).length;
    
    const lastMonthRoles = allRoles.filter((r: any) => 
      r.created_at && r.created_at.startsWith(lastMonth)
    ).length;

    const currentMonthDeals = allRoles.filter((r: any) => 
      r.status === "deal" && r.updated_at && r.updated_at.startsWith(currentMonth)
    ).length;

    const lastMonthDeals = allRoles.filter((r: any) => 
      r.status === "deal" && r.updated_at && r.updated_at.startsWith(lastMonth)
    ).length;

    const currentMonthLost = allRoles.filter((r: any) => 
      r.status === "lost" && r.updated_at && r.updated_at.startsWith(currentMonth)
    ).length;

    const lastMonthLost = allRoles.filter((r: any) => 
      r.status === "lost" && r.updated_at && r.updated_at.startsWith(lastMonth)
    ).length;

    let currentMonthInterviews = 0;
    let lastMonthInterviews = 0;

    for (const role of allRoles) {
      const currentInterviews = await db
        .prepare(`
          SELECT SUM(interview_count) as total
          FROM am_role_interviews
          WHERE role_id = ? AND entry_month = ?
        `)
        .bind((role as any).id, currentMonth)
        .first();

      const lastInterviews = await db
        .prepare(`
          SELECT SUM(interview_count) as total
          FROM am_role_interviews
          WHERE role_id = ? AND entry_month = ?
        `)
        .bind((role as any).id, lastMonth)
        .first();

      currentMonthInterviews += (currentInterviews as any)?.total || 0;
      lastMonthInterviews += (lastInterviews as any)?.total || 0;
    }

    // Conversion rates
    const rolesToInterviewsConversion = totalRoles > 0 ? (totalInterviews / totalRoles) * 100 : 0;
    const interviewsToDealsConversion = totalInterviews > 0 ? (dealRoles / totalInterviews) * 100 : 0;

    // Client-wise performance
    const clientPerformance: any[] = [];
    const clientIds = [...new Set(allRoles.map((r: any) => r.client_id))];
    
    for (const cId of clientIds) {
      const clientRoles = allRoles.filter((r: any) => r.client_id === cId);
      const client = await db.prepare("SELECT * FROM clients WHERE id = ?").bind(cId).first();
      
      if (!client) continue;

      const clientTotalRoles = clientRoles.length;
      const clientActiveRoles = clientRoles.filter((r: any) => r.status === "active").length;
      const clientDeals = clientRoles.filter((r: any) => r.status === "deal").length;
      const clientLost = clientRoles.filter((r: any) => r.status === "lost").length;
      const clientOnHold = clientRoles.filter((r: any) => r.status === "on_hold").length;
      const clientNoAnswer = clientRoles.filter((r: any) => r.status === "no_answer").length;

      let clientInt1 = 0, clientInt2 = 0, clientInt3 = 0;
      for (const role of clientRoles) {
        const interviews = await db
          .prepare(`
            SELECT interview_round, SUM(interview_count) as total
            FROM am_role_interviews
            WHERE role_id = ?
            GROUP BY interview_round
          `)
          .bind((role as any).id)
          .all();

        for (const interview of interviews.results || []) {
          const data = interview as any;
          if (data.interview_round === 1) clientInt1 += data.total;
          if (data.interview_round === 2) clientInt2 += data.total;
          if (data.interview_round === 3) clientInt3 += data.total;
        }
      }

      // Calculate client health
      let health = "Average";
      const dealRate = clientTotalRoles > 0 ? (clientDeals / clientTotalRoles) * 100 : 0;
      if (dealRate >= 30 && clientActiveRoles > 0) health = "Strong";
      else if (dealRate < 10 && (clientLost > clientDeals || clientNoAnswer > 5)) health = "At Risk";

      clientPerformance.push({
        client_id: cId,
        client_name: (client as any).name,
        client_code: (client as any).client_code,
        total_roles: clientTotalRoles,
        active_roles: clientActiveRoles,
        interview_1: clientInt1,
        interview_2: clientInt2,
        interview_3: clientInt3,
        deals: clientDeals,
        lost: clientLost,
        on_hold: clientOnHold,
        no_answer: clientNoAnswer,
        health,
      });
    }

    // Team-wise performance
    const teamPerformance: any[] = [];
    const teamIds = [...new Set(allRoles.map((r: any) => r.team_id))];
    
    for (const tId of teamIds) {
      const teamRoles = allRoles.filter((r: any) => r.team_id === tId);
      const team = await db.prepare("SELECT * FROM app_teams WHERE id = ?").bind(tId).first();
      
      if (!team) continue;

      const teamTotalRoles = teamRoles.length;
      const teamActiveRoles = teamRoles.filter((r: any) => r.status === "active").length;
      const teamDeals = teamRoles.filter((r: any) => r.status === "deal").length;
      const teamLost = teamRoles.filter((r: any) => r.status === "lost").length;

      let teamInterviews = 0;
      for (const role of teamRoles) {
        const interviews = await db
          .prepare(`
            SELECT SUM(interview_count) as total
            FROM am_role_interviews
            WHERE role_id = ?
          `)
          .bind((role as any).id)
          .first();

        teamInterviews += (interviews as any)?.total || 0;
      }

      let performanceLabel = "Average";
      const teamDealRate = teamTotalRoles > 0 ? (teamDeals / teamTotalRoles) * 100 : 0;
      if (teamDealRate >= 30) performanceLabel = "Strong";
      else if (teamDealRate < 10) performanceLabel = "At Risk";

      teamPerformance.push({
        team_id: tId,
        team_name: (team as any).name,
        team_code: (team as any).team_code,
        total_roles: teamTotalRoles,
        active_roles: teamActiveRoles,
        total_interviews: teamInterviews,
        total_deals: teamDeals,
        total_lost: teamLost,
        performance_label: performanceLabel,
      });
    }

    return c.json({
      overview: {
        total_roles: totalRoles,
        active_roles: activeRoles,
        non_active_roles: nonActiveRoles,
        total_interviews: totalInterviews,
        interview_1_count: interview1Count,
        interview_2_count: interview2Count,
        interview_3_count: interview3Count,
        total_deals: dealRoles,
        total_lost: lostRoles,
        total_on_hold: onHoldRoles,
        total_no_answer: noAnswerRoles,
        total_cancelled: cancelledRoles,
        ebes_score: Math.round(ebesScore * 10) / 10,
        performance_label: performanceLabel,
        current_month: {
          roles: currentMonthRoles,
          interviews: currentMonthInterviews,
          deals: currentMonthDeals,
          lost: currentMonthLost,
        },
        last_month: {
          roles: lastMonthRoles,
          interviews: lastMonthInterviews,
          deals: lastMonthDeals,
          lost: lastMonthLost,
        },
        roles_to_interviews_conversion: Math.round(rolesToInterviewsConversion * 10) / 10,
        interviews_to_deals_conversion: Math.round(interviewsToDealsConversion * 10) / 10,
      },
      client_performance: clientPerformance,
      team_performance: teamPerformance,
    });
  } catch (error) {
    console.error("Error fetching performance data:", error);
    return c.json({ error: "Failed to fetch performance data" }, 500);
  }
});

// Get EBES Score for Account Manager
app.get("/api/am/ebes-score", amOnly, async (c) => {
  const db = c.env.DB;
  const amUser = c.get("amUser");
  
  // Get date range from query params
  const startDate = c.req.query("start_date");
  const endDate = c.req.query("end_date");

  try {
    // Get all roles for this AM, filtered by date range if provided
    let rolesQuery = "SELECT * FROM am_roles WHERE account_manager_id = ?";
    const rolesParams: any[] = [(amUser as any).id];
    
    if (startDate && endDate) {
      rolesQuery += " AND created_at BETWEEN ? AND ?";
      rolesParams.push(startDate, endDate + " 23:59:59");
    }
    
    const roles = await db
      .prepare(rolesQuery)
      .bind(...rolesParams)
      .all();

    const allRoles = roles.results || [];
    
    // Count new roles created in the date range
    const newRolesCount = allRoles.length;
    
    // Count roles by status (only count if status was set in date range)
    const dealRoles = allRoles.filter((r: any) => r.status === "deal").length;
    const lostRoles = allRoles.filter((r: any) => r.status === "lost").length;
    const noAnswerRoles = allRoles.filter((r: any) => r.status === "no_answer").length;
    const onHoldRoles = allRoles.filter((r: any) => r.status === "on_hold").length;

    // Calculate interview counts
    let interview1Count = 0;
    let interview2Count = 0;

    for (const role of allRoles) {
      let interviewQuery = `
        SELECT interview_round, SUM(interview_count) as total
        FROM am_role_interviews
        WHERE role_id = ?
      `;
      const interviewParams: any[] = [(role as any).id];
      
      if (startDate && endDate) {
        interviewQuery += " AND entry_month BETWEEN ? AND ?";
        interviewParams.push(startDate.substring(0, 7), endDate.substring(0, 7));
      }
      
      interviewQuery += " GROUP BY interview_round";
      
      const interviews = await db
        .prepare(interviewQuery)
        .bind(...interviewParams)
        .all();

      for (const interview of interviews.results || []) {
        const data = interview as any;
        const count = data.total;
        // Only count Interview 1 and Interview 2, ignore Interview 3
        if (data.interview_round === 1) interview1Count += count;
        if (data.interview_round === 2) interview2Count += count;
      }
    }

    // Calculate EBES Score using the new formula
    // EBES = (New Roles × 2) + (Interview 1 × 2) + (Interview 2 × 2) + (Deals × 10) - (Lost × 4) - (No Answer × 2) - (On Hold × 1)
    const ebesScore = 
      (newRolesCount * 2) +
      (interview1Count * 2) +
      (interview2Count * 2) +
      (dealRoles * 10) -
      (lostRoles * 4) -
      (noAnswerRoles * 2) -
      (onHoldRoles * 1);

    const finalScore = Math.round(ebesScore * 10) / 10;

    // Determine performance label based on score
    let performanceLabel = "Average";
    if (finalScore >= 100) performanceLabel = "Excellent";
    else if (finalScore >= 50) performanceLabel = "Strong";
    else if (finalScore < 20) performanceLabel = "At Risk";

    return c.json({
      score: finalScore,
      performance_label: performanceLabel,
    });
  } catch (error) {
    console.error("Error calculating EBES score:", error);
    return c.json({ error: "Failed to calculate EBES score" }, 500);
  }
});

export default app;
