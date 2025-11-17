const User = require("../models/user.model");
const constants = require("../utils/constants");

exports.getAllUsers = async (req, res) => {
    try {
        const users = await User.find({}, "-password -__v");
        res.status(200).send(users);
    } catch (err) {
        console.error("Error fetching users", err);
        res.status(500).send({ message: "Internal server error" });
    }
};

exports.updateUserStatus = async (req, res) => {
    const { userId } = req.params;
    const { userStatus } = req.body;

    if (!userStatus) {
        return res.status(400).send({ message: "userStatus is required" });
    }

    const allowedStatuses = [
        constants.userStatuses.approved,
        constants.userStatuses.pending
    ];

    if (!allowedStatuses.includes(userStatus)) {
        return res.status(400).send({
            message: `Invalid userStatus. Allowed: ${allowedStatuses.join(", ")}`
        });
    }

    try {
        const updatedUser = await User.findOneAndUpdate(
            { userId },
            { userStatus },
            { new: true }
        ).select("-password -__v");

        if (!updatedUser) {
            return res.status(404).send({ message: "User not found" });
        }

        res.status(200).send({
            message: "User status updated successfully",
            user: updatedUser
        });
    } catch (err) {
        console.error("Error updating user status", err);
        res.status(500).send({ message: "Internal server error" });
    }
};
