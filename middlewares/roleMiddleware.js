const constants = require("../utils/constants");
const User = require("../models/user.model");

const isAdmin = async (req, res, next) => {
    const user = await User.findOne({ userId: req.userId });
    if (!user || user.userType !== constants.userTypes.admin) {
        return res.status(403).send({ message: "Admin role required!" });
    }
    next();
};


const isEngineer = async (req, res, next) => {
    const user = await User.findOne({ userId: req.userId });
    if (!user || user.userType !== constants.userTypes.engineer) {
        return res.status(403).send({ message: "Engineer role required!" });
    }
    next();
};


const isCustomer = async (req, res, next) => {
    const user = await User.findOne({ userId: req.userId });
    if (!user || user.userType !== constants.userTypes.customer) {
        return res.status(403).send({ message: "Customer role required!" });
    }
    next();
};

module.exports = {
    isAdmin,
    isEngineer,
    isCustomer
};
