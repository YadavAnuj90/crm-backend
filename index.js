const express = require("express");
require("dotenv").config();

const connectDB = require("./config/db");
const createSuperAdmin = require("./config/createSuperAdmin");
const logger = require("./config/logger");
const requestLogger = require("./middlewares/requestLogger");
const { checkSla } = require("./utils/slaChecker");

const auth_route = require("./routes/auth.routes");
const restRoutes = require("./routes/role.routes");
const adminRoutes = require("./routes/admin.routes");
const ticketRoutes = require("./routes/ticket.routes");
const commentRoutes = require("./routes/comment.routes");
const activityRoutes = require("./routes/activity.routes");
const adminDashboardRoutes = require("./routes/admin.dashboard.routes");
const engineerDashboardRoutes = require("./routes/engineer.dashboard.routes");
const customerDashboardRoutes = require("./routes/customer.dashboard.routes");
const exportRoutes = require("./routes/export.routes");
const slaRoutes = require("./routes/sla.routes");
const superAdminRoutes = require("./routes/superadmin.routes");
const paymentRoutes = require("./routes/payment.routes");
const superAdminDashboardRoutes = require("./routes/superadmin.dashboard.routes");
const subscriptionRoutes = require("./routes/subscription.routes");
const paymentHistoryRoutes = require("./routes/payment.history.routes");
const analyticsRoutes = require("./routes/analytics.routes");
const notificationRoutes = require("./routes/notification.routes");

const app = express();
const PORT = process.env.PORT || 5000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(requestLogger);

app.use("/auth", auth_route);
app.use("/role", restRoutes);
app.use("/sla", slaRoutes);
app.use("/admin", adminRoutes);
app.use("/tickets", ticketRoutes);
app.use("/tickets", commentRoutes);
app.use("/tickets", activityRoutes);
app.use("/admin", adminDashboardRoutes);
app.use("/engineer", engineerDashboardRoutes);
app.use("/customer", customerDashboardRoutes);
app.use("/export", exportRoutes);
app.use("/superadmin", superAdminRoutes);
app.use("/payment", paymentRoutes);
app.use("/superadmin/dashboard", superAdminDashboardRoutes);
app.use("/subscription", subscriptionRoutes);
app.use("/payment", paymentHistoryRoutes);
app.use("/admin/analytics", analyticsRoutes);
app.use("/notifications", notificationRoutes);

app.use((err, req, res, next) => {
  logger.error(err.stack || err.message);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || "Internal Server Error",
  });
});


(async () => {
  try {
    await connectDB();
    await createSuperAdmin();
    setInterval(checkSla, 5 * 60 * 1000);

    app.listen(PORT, () => {
      logger.info(`Server running on port ${PORT}`);
    });
  } catch (err) {
    logger.error("Startup failed", err);
    process.exit(1);
  }
})();
