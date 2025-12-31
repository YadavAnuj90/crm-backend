const express = require("express");
require("dotenv").config();

const cors = require("cors");
const helmet = require("helmet");

// middlewares
const requestLogger = require("./middlewares/requestLogger");

// routes
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

// swagger
const swaggerUi = require("swagger-ui-express");
const swaggerSpec = require("./config/swagger");

const app = express();

/* -------------------- GLOBAL MIDDLEWARES -------------------- */
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(requestLogger);

/* -------------------- SWAGGER -------------------- */
if (process.env.NODE_ENV !== "production") {
  app.use("/crm/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
}

/* -------------------- ROUTES -------------------- */
const apiRouter = express.Router();

apiRouter.use("/auth", authRoutes);
apiRouter.use("/role", roleRoutes);
apiRouter.use("/sla", slaRoutes);
apiRouter.use("/admin", adminRoutes);
apiRouter.use("/tickets", ticketsRoutes);
apiRouter.use("/admin", adminDashboardRoutes);
apiRouter.use("/engineer", engineerDashboardRoutes);
apiRouter.use("/customer", customerDashboardRoutes);
apiRouter.use("/export", exportRoutes);
apiRouter.use("/superadmin", superAdminRoutes);
apiRouter.use("/superadmin/dashboard", superAdminDashboardRoutes);
apiRouter.use("/payment", paymentRoutes);
apiRouter.use("/payment", paymentHistoryRoutes);
apiRouter.use("/subscription", subscriptionRoutes);
apiRouter.use("/admin/analytics", analyticsRoutes);
apiRouter.use("/notifications", notificationRoutes);

/* -------------------- VERSIONING -------------------- */
app.use("/api/v1", apiRouter); // new
app.use("/", apiRouter);       // backward compatible

/* -------------------- ERROR HANDLER -------------------- */
const logger = require("./config/logger");

app.use((err, req, res, next) => {
  logger.error(err.stack || err.message);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || "Internal Server Error",
  });
});

module.exports = app;
