const User = require("../models/user.model");
const bcrypt = require("bcryptjs");

const createAdmin = async () => {
  try {
    const user = await User.findOne({ userId: "admin" });

    if (!user) {
      console.log("Admin user not found. Creating...");

      await User.create({
        name: "Anuj",
        userId: "admin",
        email: "admin@example.com",
        userType: "ADMIN",
        userStatus: "APPROVED",
        password: bcrypt.hashSync("admin123", 10)
      });

      console.log("Admin user created.");
    } else {
      console.log("Admin already exists.");
    }

  } catch (err) {
    console.error("Error creating admin:", err);
  }
};

module.exports = createAdmin;
