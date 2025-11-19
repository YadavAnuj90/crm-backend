
// routes/superadmin.dashboard.routes.js
const express = require('express');
const router = express.Router();
const verifyToken = require('../middlewares/authJwt');
const { isSuperAdmin } = require('../middlewares/roleMiddleware');
const ctrl = require('../controllers/superadmin.dashboard.controller');

// summary
router.get('/summary', verifyToken, isSuperAdmin, ctrl.getSystemSummary);

// users management
router.get('/users', verifyToken, isSuperAdmin, ctrl.listUsers);
router.post('/users', verifyToken, isSuperAdmin, ctrl.createAdmin); // create admin via dashboard
router.put('/users/:userId', verifyToken, isSuperAdmin, ctrl.updateUser);
router.post('/users/:userId/status', verifyToken, isSuperAdmin, ctrl.toggleUserStatus);
router.delete('/users/:userId', verifyToken, isSuperAdmin, ctrl.deleteUser);

// audits
router.get('/audits', verifyToken, isSuperAdmin, ctrl.getRecentAudits);

// export
router.get('/export/users', verifyToken, isSuperAdmin, ctrl.exportUsers);

module.exports = router;
