const bcrypt = require("bcryptjs");
const User = require("../models/user.model");
const constants = require("../utils/constants");

async function createSuperAdmin() {
  try {
    const existing = await User.findOne({
      userType: constants.userTypes.superadmin  
    });

    if (existing) {
      console.warn("Super Admin already exists.");
      return;
    }

    const superAdmin = {
      name: "Anuj Yadav",
      userId: "YadavAnuj11",
      email: "anujyadav11@gmail.com",
      userType: constants.userTypes.superadmin, 
      userStatus: constants.userStatuses.approved,
      password: bcrypt.hashSync("superadmin@123", 10),
    };

    await User.create(superAdmin);
    console.warn("⭐ Super Admin created successfully!");

  } catch (err) {
    console.error("Super Admin creation error:", err);
  }
}

module.exports = createSuperAdmin;
