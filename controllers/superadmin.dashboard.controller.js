
const User = require('../models/user.model');
const Ticket = require('../models/ticket.model');
const Audit = require('../models/audit.model');
const { logAudit } = require('../utils/auditLogger');
const constants = require('../utils/constants');
const { Parser } = require('json2csv'); 
exports.getSystemSummary = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalCustomers = await User.countDocuments({ userType: constants.userTypes.customer });
    const totalEngineers = await User.countDocuments({ userType: constants.userTypes.engineer });
    const totalAdmins = await User.countDocuments({ userType: constants.userTypes.admin });
    const pendingUsers = await User.countDocuments({ userStatus: constants.userStatuses.pending });

    const totalTickets = await Ticket.countDocuments();
    const ticketsByStatus = await Ticket.aggregate([
      { $group: { _id: "$ticketStatus", count: { $sum: 1 } } }
    ]);
    const ticketsByPriority = await Ticket.aggregate([
      { $group: { _id: "$ticketPriority", count: { $sum: 1 } } }
    ]);
    const assignedTickets = await Ticket.countDocuments({ assignedTo: { $ne: null } });
    const unassignedTickets = totalTickets - assignedTickets;

    res.status(200).send({
      users: { totalUsers, totalCustomers, totalEngineers, totalAdmins, pendingUsers },
      tickets: { totalTickets, ticketsByStatus, ticketsByPriority, assignedTickets, unassignedTickets }
    });
  } catch (err) {
    console.error('System summary error', err);
    res.status(500).send({ message: 'Internal server error' });
  }
};
exports.listUsers = async (req, res) => {
  try {
    const { page = 1, limit = 20, role, status, q } = req.query;
    const filter = {};
    if (role) filter.userType = role;
    if (status) filter.userStatus = status;
    if (q) filter.$or = [
      { name: new RegExp(q, 'i') },
      { userId: new RegExp(q, 'i') },
      { email: new RegExp(q, 'i') }
    ];

    const skip = (Math.max(1, page) - 1) * limit;
    const users = await User.find(filter, '-password -__v')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit, 10));

    const total = await User.countDocuments(filter);
    res.status(200).send({ total, page: parseInt(page, 10), limit: parseInt(limit, 10), users });
  } catch (err) {
    console.error('List users error', err);
    res.status(500).send({ message: 'Internal server error' });
  }
};

exports.createAdmin = async (req, res) => {
  const { name, userId, email, password } = req.body;
  if (!name || !userId || !email || !password) {
    return res.status(400).send({ message: 'All fields are required' });
  }
  try {
    const exists = await User.findOne({ $or: [{ userId }, { email }] });
    if (exists) return res.status(400).send({ message: 'userId/email already exists' });

    const adminObj = {
      name, userId, email, password, userType: constants.userTypes.admin,
      userStatus: constants.userStatuses.approved
    };
    const bcrypt = require('bcryptjs');
    adminObj.password = bcrypt.hashSync(password, 10);

    const admin = await User.create(adminObj);
    await logAudit(req.userId, 'ADMIN_CREATED', 'USER', admin.userId, { name: admin.name });

    res.status(201).send({ message: 'Admin created', admin: { name: admin.name, userId: admin.userId, email: admin.email, userType: admin.userType } });
  } catch (err) {
    console.error('Create admin error', err);
    res.status(500).send({ message: 'Internal server error' });
  }
};

exports.updateUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const update = req.body;
    delete update.password;

    const user = await User.findOneAndUpdate({ userId }, update, { new: true }).select('-password -__v');
    if (!user) return res.status(404).send({ message: 'User not found' });

    await logAudit(req.userId, 'USER_UPDATED', 'USER', user.userId, update);
    res.status(200).send({ message: 'User updated', user });
  } catch (err) {
    console.error('Update user error', err);
    res.status(500).send({ message: 'Internal server error' });
  }
};

exports.toggleUserStatus = async (req, res) => {
  try {
    const { userId } = req.params;
    const { action } = req.body; 
    if (!['suspend', 'activate'].includes(action)) return res.status(400).send({ message: 'Invalid action' });

    const user = await User.findOne({ userId });
    if (!user) return res.status(404).send({ message: 'User not found' });

    user.userStatus = action === 'suspend' ? constants.userStatuses.pending : constants.userStatuses.approved;
    await user.save();

    await logAudit(req.userId, action === 'suspend' ? 'USER_SUSPENDED' : 'USER_ACTIVATED', 'USER', user.userId);
    res.status(200).send({ message: `User ${action}ed`, user: { userId: user.userId, userStatus: user.userStatus } });
  } catch (err) {
    console.error('Toggle status error', err);
    res.status(500).send({ message: 'Internal server error' });
  }
};

exports.deleteUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const deleted = await User.findOneAndDelete({ userId });
    if (!deleted) return res.status(404).send({ message: 'User not found' });
    await logAudit(req.userId, 'USER_DELETED', 'USER', deleted.userId);
    res.status(200).send({ message: 'User deleted' });
  } catch (err) {
    console.error('Delete user error', err);
    res.status(500).send({ message: 'Internal server error' });
  }
};

exports.getRecentAudits = async (req, res) => {
  try {
    const { limit = 20 } = req.query;
    const logs = await Audit.find().sort({ createdAt: -1 }).limit(parseInt(limit, 10));
    res.status(200).send({ total: logs.length, logs });
  } catch (err) {
    console.error('Get audits error', err);
    res.status(500).send({ message: 'Internal server error' });
  }
};

exports.exportUsers = async (req, res) => {
  try {
    const { format = 'json' } = req.query;
    const users = await User.find({}, '-password -__v').sort({ createdAt: -1 }).lean();
    if (format === 'csv') {
      const fields = ['name', 'userId', 'email', 'userType', 'userStatus', 'createdAt'];
      const parser = new Parser({ fields });
      const csv = parser.parse(users);
      res.header('Content-Type', 'text/csv');
      return res.attachment('users.csv').send(csv);
    }
    res.status(200).send({ total: users.length, users });
  } catch (err) {
    console.error('Export users error', err);
    res.status(500).send({ message: 'Internal server error' });
  }
};
