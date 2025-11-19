
const bcrypt = require("bcryptjs");
const User = require("../models/user.model");
const constants = require("../utils/constants");


exports.createAdmin = async (req, res) => {
  const { name, userId, email, password } = req.body;

  if (!name || !userId || !email || !password) {
    return res.status(400).send({ message: "All fields are required" });
  }

  try {
    const exists = await User.findOne({ userId });
    if (exists) return res.status(400).send({ message: "UserId already exists" });

    const adminObj = {
      name,
      userId,
      email,
      userType: constants.userTypes.admin,
      userStatus: constants.userStatuses.approved,
      password: bcrypt.hashSync(password, 10),
    };

    const admin = await User.create(adminObj);

    res.status(201).send({
      message: "Admin created successfully",
      admin: {
        name: admin.name,
        userId: admin.userId,
        email: admin.email,
        userType: admin.userType,
        createdAt: admin.createdAt,
      },
    });

  } catch (err) {
    console.error("Error creating admin", err);
    res.status(500).send({ message: "Internal server error" });
  }
};
