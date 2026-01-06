const Payment = require("../models/payment.model");
const Subscription = require("../models/subscription.model");
const Ticket = require("../models/ticket.model");

const PAYMENT_STATUS = {
  SUCCESS: "SUCCESS",
};

const TICKET_STATUS = {
  RESOLVED: "RESOLVED",
};

function getYearRange(year) {
  return {
    start: new Date(`${year}-01-01T00:00:00Z`),
    end: new Date(`${Number(year) + 1}-01-01T00:00:00Z`),
  };
}

function getMonths(year) {
  return Array.from({ length: 12 }, (_, i) =>
    `${year}-${String(i + 1).padStart(2, "0")}`
  );
}


async function getMonthlyRevenue(year) {
  const { start, end } = getYearRange(year);

  const result = await Payment.aggregate([
    {
      $match: {
        status: PAYMENT_STATUS.SUCCESS,
        createdAt: { $gte: start, $lt: end },
      },
    },
    {
      $group: {
        _id: { $dateToString: { format: "%Y-%m", date: "$createdAt" } },
        totalAmount: { $sum: "$amount" },
        count: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  const map = new Map(result.map(r => [r._id, r]));
  return getMonths(year).map(month => ({
    month,
    totalAmount: map.get(month)?.totalAmount || 0,
    count: map.get(month)?.count || 0,
  }));
}

async function getYearlyRevenue(startYear, endYear) {
  const result = await Payment.aggregate([
    {
      $match: {
        status: PAYMENT_STATUS.SUCCESS,
        createdAt: {
          $gte: new Date(`${startYear}-01-01T00:00:00Z`),
          $lt: new Date(`${endYear + 1}-01-01T00:00:00Z`),
        },
      },
    },
    {
      $group: {
        _id: { $dateToString: { format: "%Y", date: "$createdAt" } },
        totalAmount: { $sum: "$amount" },
        count: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  const map = new Map(result.map(r => [r._id, r]));
  return Array.from({ length: endYear - startYear + 1 }, (_, i) => {
    const year = String(startYear + i);
    return {
      year,
      totalAmount: map.get(year)?.totalAmount || 0,
      count: map.get(year)?.count || 0,
    };
  });
}


async function getTicketsMonthly(year) {
  const { start, end } = getYearRange(year);

  const [created, resolved] = await Promise.all([
    Ticket.aggregate([
      { $match: { createdAt: { $gte: start, $lt: end } } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m", date: "$createdAt" } },
          count: { $sum: 1 },
        },
      },
    ]),
    Ticket.aggregate([
      {
        $match: {
          updatedAt: { $gte: start, $lt: end },
          ticketStatus: TICKET_STATUS.RESOLVED,
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m", date: "$updatedAt" } },
          count: { $sum: 1 },
        },
      },
    ]),
  ]);

  const createdMap = new Map(created.map(r => [r._id, r.count]));
  const resolvedMap = new Map(resolved.map(r => [r._id, r.count]));

  return getMonths(year).map(month => ({
    month,
    created: createdMap.get(month) || 0,
    resolved: resolvedMap.get(month) || 0,
  }));
}


async function getEngineerWorkload(startDate, endDate) {
  const start = new Date(startDate);
  const end = new Date(endDate);

  if (isNaN(start) || isNaN(end)) {
    throw new Error("Invalid date range");
  }

  return Ticket.aggregate([
    {
      $match: {
        assignedTo: { $ne: null },
        createdAt: { $gte: start, $lt: end },
      },
    },
    {
      $group: {
        _id: "$assignedTo",
        assignedCount: { $sum: 1 },
      },
    },
    { $sort: { assignedCount: -1 } },
  ]);
}

module.exports = {
  getMonthlyRevenue,
  getYearlyRevenue,
  getTicketsMonthly,
  getEngineerWorkload,
};
  