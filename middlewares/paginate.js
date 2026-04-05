/**
 * middlewares/paginate.js
 *
 * Cursor-based pagination middleware.
 *
 * How it works:
 *  - The client passes ?limit=20&cursor=<lastId> on GET requests
 *  - cursor is a MongoDB ObjectId of the LAST document seen
 *  - We add a { _id: { $lt: cursor } } filter so we never re-fetch seen docs
 *  - The response always includes `nextCursor` (the last _id in the current page)
 *    or null when there are no more pages
 *
 * Usage in a controller:
 *   const { buildCursorQuery, buildCursorResponse } = require('../middlewares/paginate');
 *
 *   exports.getAllTickets = async (req, res) => {
 *     const { filter, limit } = buildCursorQuery(req);
 *     const tickets = await Ticket.find({ ...myFilter, ...filter })
 *       .sort({ _id: -1 })      // always sort by _id DESC for cursor pagination
 *       .limit(limit);
 *     res.json(buildCursorResponse(tickets, limit));
 *   };
 */

const mongoose = require('mongoose');

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

/**
 * Parse pagination params from the request and return a Mongoose filter fragment.
 *
 * @param {import('express').Request} req
 * @returns {{ filter: object, limit: number }}
 */
function buildCursorQuery(req) {
  const rawLimit = parseInt(req.query.limit, 10);
  const limit = Math.min(
    isNaN(rawLimit) || rawLimit < 1 ? DEFAULT_LIMIT : rawLimit,
    MAX_LIMIT
  );

  const cursor = req.query.cursor;
  const filter = {};

  if (cursor && mongoose.Types.ObjectId.isValid(cursor)) {
    filter._id = { $lt: new mongoose.Types.ObjectId(cursor) };
  }

  return { filter, limit };
}

/**
 * Build a consistent paginated API response.
 *
 * @param {Array} docs      - The documents returned by the query (already limited)
 * @param {number} limit    - The limit that was applied
 * @returns {{ data: Array, nextCursor: string|null, hasMore: boolean, count: number }}
 */
function buildCursorResponse(docs, limit) {
  const hasMore = docs.length === limit;
  const nextCursor = hasMore ? docs[docs.length - 1]._id.toString() : null;

  return {
    data: docs,
    count: docs.length,
    nextCursor,
    hasMore,
  };
}

module.exports = { buildCursorQuery, buildCursorResponse };
