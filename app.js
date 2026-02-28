const express = require("express");
require("dotenv").config();
const cors = require("cors");
const helmet = require("helmet");
let compression; try { compression = require("compression"); } catch(e) { compression = null; }
const requestLogger = require("./middlewares/requestLogger");
const logger = require("./config/logger");

// ROUTES
const authRoutes = require("./routes/auth.routes");
const roleRoutes = require("./routes/role.routes");
const adminRoutes = require("./routes/admin.routes");
const slaRoutes = require("./routes/sla.routes");
const ticketsRoutes = require("./routes/tickets.index");
const adminDashboardRoutes = require("./routes/admin.dashboard.routes");
const engineerDashboardRoutes = require("./routes/engineer.dashboard.routes");
const customerDashboardRoutes = require("./routes/customer.dashboard.routes");
const exportRoutes = require("./routes/export.routes");
const superAdminRoutes = require("./routes/superadmin.routes");
const paymentRoutes = require("./routes/payment.routes");
const paymentHistoryRoutes = require("./routes/payment.history.routes");
const subscriptionRoutes = require("./routes/subscription.routes");
const superAdminDashboardRoutes = require("./routes/superadmin.dashboard.routes");
const analyticsRoutes = require("./routes/analytics.routes");
const notificationRoutes = require("./routes/notification.routes");
const healthRoutes = require("./routes/health.routes");
const webhookRoutes = require("./routes/webhook.routes");
const twoFARoutes = require("./routes/twofa.routes");

const swaggerUi = require("swagger-ui-express");
const swaggerSpec = require("./config/swagger");

const app = express();

// CORS - hardened
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
  : ['http://localhost:3000', 'http://localhost:5173'];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`CORS policy: origin ${origin} not allowed`));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-access-token'],
  credentials: true
}));

// Security & parsing
app.use(helmet());
if (compression) app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(requestLogger);

// Health check (no auth)
app.use('/health', healthRoutes);

// Swagger (non-production)
if (process.env.NODE_ENV !== "production") {
  app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
}

// API Router
const apiRouter = express.Router();

apiRouter.use("/auth", authRoutes);
apiRouter.use("/auth/2fa", twoFARoutes);
apiRouter.use("/role", roleRoutes);
apiRouter.use("/sla", slaRoutes);
apiRouter.use("/tickets", ticketsRoutes);
apiRouter.use("/export", exportRoutes);
apiRouter.use("/notifications", notificationRoutes);
apiRouter.use("/webhooks", webhookRoutes);

apiRouter.use("/admin", adminRoutes);
apiRouter.use("/admin/dashboard", adminDashboardRoutes);
apiRouter.use("/admin/analytics", analyticsRoutes);

apiRouter.use("/engineer", engineerDashboardRoutes);
apiRouter.use("/customer", customerDashboardRoutes);

apiRouter.use("/superadmin", superAdminRoutes);
apiRouter.use("/superadmin/dashboard", superAdminDashboardRoutes);

apiRouter.use("/payment", paymentRoutes);
apiRouter.use("/payment/history", paymentHistoryRoutes);
apiRouter.use("/subscription", subscriptionRoutes);

app.use("/api/v1", apiRouter);

// Global error handler
app.use((err, req, res, next) => {
  logger.error(err.stack || err.message);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || "Internal Server Error",
  });
});

module.exports = app;
