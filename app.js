const express = require("express");
require("dotenv").config();

const cors = require("cors");
const helmet = require("helmet");

const requestLogger = require("./middlewares/requestLogger");
const logger = require("./config/logger");
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

const swaggerUi = require("swagger-ui-express");
const swaggerSpec = require("./config/swagger");
const {
  apiLimiter,
  authLimiter,
  paymentLimiter,
  paymentHistoryLimiter,
} = require("./middlewares/rateLimiter");

const app = express();

app.set("trust proxy", 1);
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(requestLogger);

if (process.env.NODE_ENV !== "production") {
  app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
}

const apiRouter = express.Router();
apiRouter.use("/auth", authLimiter, authRoutes);
apiRouter.use("/role", roleRoutes);
apiRouter.use("/sla", slaRoutes);
apiRouter.use("/tickets", ticketsRoutes);
apiRouter.use("/export", exportRoutes);
apiRouter.use("/notifications", notificationRoutes);
apiRouter.use("/admin", adminRoutes);
apiRouter.use("/admin/dashboard", adminDashboardRoutes);
apiRouter.use("/admin/analytics", analyticsRoutes);
apiRouter.use("/engineer/dashboard", engineerDashboardRoutes);
apiRouter.use("/customer/dashboard", customerDashboardRoutes);
apiRouter.use("/superadmin", superAdminRoutes);
apiRouter.use("/superadmin/dashboard", superAdminDashboardRoutes);
apiRouter.use("/payment", paymentLimiter, paymentRoutes);
apiRouter.use("/payment/history", paymentHistoryLimiter, paymentHistoryRoutes);
apiRouter.use("/subscription", subscriptionRoutes);
app.use("/api/v1", apiLimiter, apiRouter);


app.use((err, req, res, next) => {
  logger.error(err.stack || err.message);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || "Internal Server Error",
  });
});

module.exports = app;
