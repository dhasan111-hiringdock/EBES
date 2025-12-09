import { Hono } from "hono";
import { cors } from "hono/cors";
import authRoutes from "./auth-routes";
import adminRoutes from "./admin-routes";
import accountManagerRoutes from "./account-manager-routes";
import profileRoutes from "./profile-routes";
import recruiterRoutes from "./recruiter-routes";
import recruitmentManagerRoutes from "./recruitment-manager-routes";

const app = new Hono<{ Bindings: Env }>();

// Enable CORS
app.use("*", cors());

// Mount auth routes
app.route("/", authRoutes);

// Mount admin routes
app.route("/", adminRoutes);
app.route("/", accountManagerRoutes);
app.route("/", profileRoutes);
app.route("/", recruiterRoutes);
app.route("/", recruitmentManagerRoutes);

export default app;
