const User = require('../models/user.model')
const constants = require('../utils/constants')
validateuserRequestBody = async (req, res, next) => {
    const { name, userId, email, userType, password } = req.body;

    if (!name) {
        return res.status(400).send({ message: "Name is required" });
    }

    if (!userId) {
        return res.status(400).send({ message: "userId is required" });
    }

    if (!email) {
        return res.status(400).send({ message: "Email is required" });
    }
    if (!password) {
        return res.status(400).send({ message: "Password is required" });
    }

    const user = await User.findOne({ userId: req.body.userId });
    if (user != null) {
        return res.status(400).send({ message: "UserId already exists" });
    }

    req.body.email = email.toLowerCase().trim();

    const existingEmail = await User.findOne({ email: req.body.email });
    if (existingEmail) {
        return res.status(400).send({ message: "Email already exists" });
    }


    const validTypes = [constants.userTypes.customer, constants.userTypes.engineer, constants.userTypes.admin];
    if (userType && !validTypes.includes(userType)) {
        return res.status(400).send({
            message: `Invalid userType. Allowed values: ${validTypes.join(", ")}`
        });
    }
    next();
}
module.exports = validateuserRequestBody;
