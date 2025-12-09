import { Hono } from "hono";
import { z } from "zod";

const app = new Hono<{ Bindings: Env }>();

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

// Login endpoint
app.post("/api/auth/login", async (c) => {
  const db = c.env.DB;
  
  try {
    const body = await c.req.json();
    const { email, password } = LoginSchema.parse(body);

    // Find user by email
    const user = await db
      .prepare("SELECT * FROM users WHERE email = ?")
      .bind(email.toLowerCase())
      .first();

    if (!user) {
      return c.json({ error: "Invalid email or password" }, 401);
    }

    const userData = user as any;

    // Check if user is active
    if (!userData.is_active) {
      return c.json({ error: "Your account has been deactivated. Please contact your administrator." }, 403);
    }

    // Verify password (simple comparison - in production use proper hashing)
    if (userData.password !== password) {
      return c.json({ error: "Invalid email or password" }, 401);
    }

    // Return user data (excluding password)
    return c.json({
      success: true,
      user: {
        id: userData.id,
        email: userData.email,
        name: userData.name,
        role: userData.role,
        user_code: userData.user_code,
        is_active: userData.is_active,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    return c.json({ error: "An error occurred during login" }, 500);
  }
});

// Logout endpoint
app.post("/api/auth/logout", async (c) => {
  return c.json({ success: true });
});

export default app;
