const User = require('../models/user.model');
const constants = require('../utils/constants');
const { buildCursorQuery, buildCursorResponse } = require('../middlewares/paginate');

exports.getAllUsers = async (req, res) => {
  try {
    const { filter, limit } = buildCursorQuery(req);

    const match = { isDeleted: { $ne: true }, ...filter };
    if (req.query.userType) match.userType = req.query.userType;
    if (req.query.userStatus) match.userStatus = req.query.userStatus;

    const users = await User.find(match, '-password -__v -refreshToken')
      .sort({ _id: -1 })
      .limit(limit);

    res.status(200).json({ success: true, ...buildCursorResponse(users, limit) });
  } catch (err) {
    console.error('Error fetching users', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

exports.updateUserStatus = async (req, res) => {
  const { userId } = req.params;
  const { userStatus } = req.body; // Zod-validated via webhook.validator UpdateStatusSchema

  const allowedStatuses = [
    constants.userStatuses.approved,
    constants.userStatuses.pending,
    constants.userStatuses.rejected,
  ];

  if (!allowedStatuses.includes(userStatus)) {
    return res.status(400).json({
      success: false,
      message: `Invalid userStatus. Allowed: ${allowedStatuses.join(', ')}`,
    });
  }

  try {
    const updatedUser = await User.findOneAndUpdate(
      { userId, isDeleted: { $ne: true } },
      { userStatus },
      { new: true }
    ).select('-password -__v -refreshToken');

    if (!updatedUser) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.status(200).json({ success: true, message: 'User status updated successfully', user: updatedUser });
  } catch (err) {
    console.error('Error updating user status', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// ── Soft delete user (GDPR-safe) ──────────────────────────────────────────────

exports.softDeleteUser = async (req, res) => {
  const { userId } = req.params;

  try {
    const user = await User.findOne({ userId, isDeleted: { $ne: true } });
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const RETENTION_DAYS = parseInt(process.env.SOFT_DELETE_RETENTION_DAYS || '90', 10);

    user.isDeleted = true;
    user.deletedAt = new Date();
    user.userStatus = constants.userStatuses.rejected; // Prevent login
    user.refreshToken = null; // Invalidate all active sessions
    user.permanentDeleteAt = new Date(Date.now() + RETENTION_DAYS * 24 * 60 * 60 * 1000);
    await user.save();

    res.status(200).json({
      success: true,
      message: `User soft-deleted. Data will be permanently erased after ${RETENTION_DAYS} days.`,
      permanentDeleteAt: user.permanentDeleteAt,
    });
  } catch (err) {
    console.error('Soft delete user error:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

exports.restoreUser = async (req, res) => {
  const { userId } = req.params;

  try {
    const user = await User.findOne({ userId, isDeleted: true });
    if (!user) return res.status(404).json({ success: false, message: 'Deleted user not found' });

    user.isDeleted = false;
    user.deletedAt = null;
    user.permanentDeleteAt = null;
    user.userStatus = constants.userStatuses.pending; // Require re-approval
    await user.save();

    res.status(200).json({ success: true, message: 'User restored. Re-approval required to activate.' });
  } catch (err) {
    console.error('Restore user error:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};
