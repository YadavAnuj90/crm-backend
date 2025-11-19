const express = require("express");
require("dotenv").config();
const connectDB = require("./config/db");
const auth_route = require('./routes/auth.routes');
const restRoutes = require("./routes/role.routes");
const adminRoutes = require("./routes/admin.routes");
const ticketRoutes = require('./routes/ticket.routes');
const commentRoutes = require('./routes/comment.routes');
const activityRoutes = require("./routes/activity.routes");
const adminDashboardRoutes = require("./routes/admin.dashboard.routes");
const engineerDashboardRoutes = require("./routes/engineer.dashboard.routes");
const customerDashboardRoutes = require('./routes/customer.dashboard.routes');
const exportRoutes = require('./routes/export.routes');
const slaRoutes = require('./routes/sla.routes');
const { checkSla } = require("./utils/slaChecker");
const superAdminRoutes = require("./routes/superadmin.routes");
const createSuperAdmin = require("./config/createSuperAdmin");
const paymentRoutes = require("./routes/payment.routes");
const superAdminDashboardRoutes = require('./routes/superadmin.dashboard.routes');
const subscriptionRoutes = require("./routes/subscription.routes");
const app = express();
app.use(express.json());

app.use('/auth', auth_route);
app.use("/role", restRoutes);
app.use("/sla", slaRoutes);
app.use("/admin", adminRoutes);
app.use("/tickets", ticketRoutes);
app.use("/tickets", commentRoutes);
app.use("/tickets", activityRoutes);
app.use("/admin", adminDashboardRoutes);
app.use("/engineer", engineerDashboardRoutes);
app.use('/customer', customerDashboardRoutes);
app.use("/export", exportRoutes);
app.use("/superadmin", superAdminRoutes);
app.use("/payment", paymentRoutes);
app.use('/superadmin/dashboard', superAdminDashboardRoutes);
app.use("/subscription", subscriptionRoutes);



connectDB();
createSuperAdmin();
setInterval(checkSla, 5 * 60 * 1000);


app.listen(process.env.PORT, () => {
  console.warn(`Server running on port ${process.env.PORT}`);
});
