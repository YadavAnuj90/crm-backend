
const analyticsService = require("../services/analytics.service");


exports.revenueMonthly = async (req, res) => {
  const year = req.query.year || new Date().getFullYear();
  try {
    const data = await analyticsService.getMonthlyRevenue(String(year));
    res.status(200).send({ year: String(year), monthly: data });
  } catch (err) {
    console.error("Revenue monthly error:", err);
    res.status(500).send({ message: "Internal server error" });
  }
};


exports.revenueYearly = async (req, res) => {
  const start = parseInt(req.query.start || (new Date().getFullYear() - 4));
  const end = parseInt(req.query.end || new Date().getFullYear());
  try {
    const data = await analyticsService.getYearlyRevenue(start, end);
    res.status(200).send({ start, end, yearly: data });
  } catch (err) {
    console.error("Revenue yearly error:", err);
    res.status(500).send({ message: "Internal server error" });
  }
};


exports.ticketsMonthly = async (req, res) => {
  const year = req.query.year || new Date().getFullYear();
  try {
    const data = await analyticsService.getTicketsMonthly(String(year));
    res.status(200).send({ year: String(year), monthly: data });
  } catch (err) {
    console.error("Tickets monthly error:", err);
    res.status(500).send({ message: "Internal server error" });
  }
};


exports.engineerWorkload = async (req, res) => {
  const start = req.query.start || new Date(new Date().getFullYear(), 0, 1).toISOString();
  const end = req.query.end || new Date().toISOString();
  try {
    const data = await analyticsService.getEngineerWorkload(start, end);
    res.status(200).send({ start, end, workload: data });
  } catch (err) {
    console.error("Engineer workload error:", err);
    res.status(500).send({ message: "Internal server error" });
  }
};
