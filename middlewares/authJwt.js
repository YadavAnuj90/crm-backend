const jwt = require("jsonwebtoken");
const User = require("../models/user.model");

const verifyToken = async (req, res, next) => {
    const token = req.headers["x-access-token"] || req.headers.authorization;

    if (!token) {
        return res.status(403).send({ message: "Token is required" });
    }

    let actualToken = token.startsWith("Bearer ") ? token.slice(7) : token;

    try {
        const decoded = jwt.verify(actualToken, process.env.JWT_SECRET);
        req.userId = decoded.userId; 
        req.id = decoded.id;
        req.userType = decoded.userType;
        req.user = decoded;
        next();
    } catch (err) {
        return res.status(401).send({ message: "Unauthorized! Invalid or expired token." });
    }
};

module.exports = verifyToken;
