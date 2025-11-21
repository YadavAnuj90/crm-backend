
const Payment = require("../models/payment.model");
const Subscription = require("../models/subscription.model");
const Ticket = require("../models/ticket.model");

function monthFormat(dateObj) {
  const yyyy = dateObj.getFullYear();
  const mm = String(dateObj.getMonth() + 1).padStart(2, "0");
  return `${yyyy}-${mm}`;
}

async function getMonthlyRevenue(year) {
  const start = new Date(`${year}-01-01T00:00:00Z`);
  const end = new Date(`${parseInt(year) + 1}-01-01T00:00:00Z`);

  const pipeline = [
    {
      $match: {
        status: "SUCCESS",
        createdAt: { $gte: start, $lt: end }
      }
    },
    {
      $group: {
        _id: { $dateToString: { format: "%Y-%m", date: "$createdAt" } },
        totalAmount: { $sum: "$amount" },
        count: { $sum: 1 }
      }
    },
    { $sort: { _id: 1 } }
  ];

  const result = await Payment.aggregate(pipeline);
  const months = [];
  for (let m = 1; m <= 12; m++) {
    const mm = String(m).padStart(2, "0");
    months.push(`${year}-${mm}`);
  }
  const map = new Map(result.map(r => [r._id, r]));
  return months.map(month => {
    const r = map.get(month);
    return {
      month,
      totalAmount: r ? r.totalAmount : 0,
      count: r ? r.count : 0
    };
  });
}

async function getYearlyRevenue(startYear, endYear) {
  const pipeline = [
    {
      $match: {
        status: "SUCCESS",
        createdAt: {
          $gte: new Date(`${startYear}-01-01T00:00:00Z`),
          $lt: new Date(`${endYear + 1}-01-01T00:00:00Z`)
        }
      }
    },
    {
      $group: {
        _id: { $dateToString: { format: "%Y", date: "$createdAt" } },
        totalAmount: { $sum: "$amount" },
        count: { $sum: 1 }
      }
    },
    { $sort: { _id: 1 } }
  ];

  const result = await Payment.aggregate(pipeline);
  const map = new Map(result.map(r => [r._id, r]));
  const years = [];
  for (let y = startYear; y <= endYear; y++) years.push(String(y));
  return years.map(year => {
    const r = map.get(year);
    return { year, totalAmount: r ? r.totalAmount : 0, count: r ? r.count : 0 };
  });
}


async function getTicketsMonthly(year) {
  const start = new Date(`${year}-01-01T00:00:00Z`);
  const end = new Date(`${parseInt(year) + 1}-01-01T00:00:00Z`);

  const createdPipe = [
    { $match: { createdAt: { $gte: start, $lt: end } } },
    { $group: { _id: { $dateToString: { format: "%Y-%m", date: "$createdAt" } }, count: { $sum: 1 } } },
    { $sort: { _id: 1 } }
  ];
  const resolvedPipe = [
    { $match: { updatedAt: { $gte: start, $lt: end }, ticketStatus: "RESOLVED" } },
    { $group: { _id: { $dateToString: { format: "%Y-%m", date: "$updatedAt" } }, count: { $sum: 1 } } },
    { $sort: { _id: 1 } }
  ];

  const [created, resolved] = await Promise.all([
    Ticket.aggregate(createdPipe),
    Ticket.aggregate(resolvedPipe)
  ]);

  const months = [];
  for (let m = 1; m <= 12; m++) months.push(`${year}-${String(m).padStart(2, "0")}`);

  const cMap = new Map(created.map(r => [r._id, r.count]));
  const rMap = new Map(resolved.map(r => [r._id, r.count]));

  return months.map(month => ({
    month,
    created: cMap.get(month) || 0,
    resolved: rMap.get(month) || 0
  }));
}


async function getEngineerWorkload(startDate, endDate) {
  const pipeline = [
    {
      $match: {
        assignedTo: { $ne: null },
        createdAt: { $gte: new Date(startDate), $lt: new Date(endDate) }
      }
    },
    {
      $group: {
        _id: "$assignedTo",
        assignedCount: { $sum: 1 }
      }
    },
    { $sort: { assignedCount: -1 } }
  ];
  return await Ticket.aggregate(pipeline);
}

module.exports = {
  getMonthlyRevenue,
  getYearlyRevenue,
  getTicketsMonthly,
  getEngineerWorkload
};
