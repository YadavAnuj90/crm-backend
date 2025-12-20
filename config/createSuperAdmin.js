const bcrypt = require("bcryptjs");
const User = require("../models/user.model");
const constants = require("../utils/constants");

async function createSuperAdmin() {
  try {
    const existing = await User.findOne({
      userType: constants.userTypes.superadmin
    });

    if (existing) {
      console.error("Super Admin already exists");
      return;
    }

    const {
      SUPERADMIN_NAME,
      SUPERADMIN_USERID,
      SUPERADMIN_EMAIL,
      SUPERADMIN_PASSWORD
    } = process.env;
    if (
      !SUPERADMIN_NAME ||
      !SUPERADMIN_USERID ||
      !SUPERADMIN_EMAIL ||
      !SUPERADMIN_PASSWORD
    ) {
      console.warn("Super Admin env variables missing");
      return;
    }

    const superAdmin = {
      name: SUPERADMIN_NAME,
      userId: SUPERADMIN_USERID,
      email: SUPERADMIN_EMAIL,
      userType: constants.userTypes.superadmin,
      userStatus: constants.userStatuses.approved,
      password: await bcrypt.hash(SUPERADMIN_PASSWORD, 10)
    };

    await User.create(superAdmin);
    console.warn("⭐ Super Admin created successfully!");

  } catch (err) {
    console.error("Super Admin creation error:", err);
  }
}

module.exports = createSuperAdmin;
