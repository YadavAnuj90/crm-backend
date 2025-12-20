const bcrypt = require("bcryptjs");
const User = require("../models/user.model");
const jwt = require("jsonwebtoken");
const constants = require("../utils/constants");
const { generateToken, generateRefreshToken } = require("../utils/token");

exports.signup = async (req, res) => {
  const { name, userId, email, userType, password } = req.body;

  const userStatus =
    !userType || userType === constants.userTypes.customer
      ? constants.userStatuses.approved
      : constants.userStatuses.pending;

  const userObj = {
    name,
    userId,
    email,
    userType,
    userStatus,
    password: await bcrypt.hash(password, 10),
  };

  try {
    const userCreated = await User.create(userObj);

    const response = {
      name: userCreated.name,
      userId: userCreated.userId,
      email: userCreated.email,
      userType: userCreated.userType,
      userStatus: userCreated.userStatus,
      createdAt: userCreated.createdAt,
      updatedAt: userCreated.updatedAt,
    };

    res.status(201).send(response);
  } catch (err) {
    console.error("Error while creating user", err);
    res.status(500).send({
      message: "Internal server error while creating user",
    });
  }
};

exports.login = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).send({ message: "email and password are required" });
  }

  const user = await User.findOne({ email });
  if (!user) {
    return res.status(400).send({ message: "Invalid email or password" });
  }
  if (user.userStatus !== constants.userStatuses.approved) {
    return res.status(403).send({
      message: `User is not approved yet. Current status: ${user.userStatus}`,
    });
  }
  const validPassword = await bcrypt.compare(password, user.password);
  if (!validPassword) {
    return res.status(400).send({ message: "Invalid email or password" });
  }
  const tokenPayload = {
    id: user._id,
    email: user.email,
    userType: user.userType,
  };
  const token = generateToken(tokenPayload);
  const refreshToken = generateRefreshToken({ id: user._id });

  user.refreshToken = refreshToken;
  await user.save();

  res.status(200).send({
    message: "Signin successful",
    data: {
      token,
      refreshToken,
      name: user.name,
      userId: user.userId,
      email: user.email,
      userType: user.userType,
      userStatus: user.userStatus,
    },
  });
};

exports.refreshToken = async (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return res.status(401).send({ message: "Refresh token required" });
  }

  try {
    const decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);

    const user = await User.findOne({
      _id: decoded.id,
      refreshToken,
    });

    if (!user) {
      return res.status(403).send({ message: "Invalid refresh token" });
    }

    const newAccessToken = generateToken({
      id: user._id,
      email: user.email,
      userType: user.userType,
    });

    res.status(200).send({ token: newAccessToken });
  } catch (err) {
    return res.status(403).send({ message: "Refresh token expired" });
  }
};

exports.logout = async (req, res) => {
  try {
    const userId = req.body;

    await User.findByIdAndUpdate(userId, { $unset: { refreshToken: 1 } });
    res.status(200).send({
      message: "Logout successful",
    });
  } catch (error) {
    console.error("Logout error:", err);
    res.status(500).send({
      message: "Internal server error",
    });
  }
};
