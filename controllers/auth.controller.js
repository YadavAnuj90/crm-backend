const bcrypt = require('bcryptjs');
const User = require('../models/user.model');
const jwt = require("jsonwebtoken");
const constants = require('../utils/constants');
const { generateToken } = require("../utils/token");

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
        password: await bcrypt.hash(password, 10)
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
            updatedAt: userCreated.updatedAt
        };

        res.status(201).send(response);
    } catch (err) {
        console.error("Error while creating user", err);
        res.status(500).send({
            message: "Internal server error while creating user"
        });
    }
};

exports.login = async (req, res) => {
       const {userId , password} = req.body;

       if(!userId || !password) {
         return res.status(400).send({ message: "userId and password are required" });
       }

       const user = await User.findOne({ userId});
       if(!user) {
         return res.status(400).send({ message: "Invalid userId or password" });
       }
       if(user.userStatus !== constants.userStatuses.approved) {
        return res.status(403).send({
            message: `User is not approved yet. Current status: ${user.userStatus}`
        });
       }
        const validPassword = await bcrypt.compare(password, user.password);
        if(!validPassword) {
             return res.status(400).send({ message: "Invalid userId or password" });
        }
        const tokenPayload = {
             id: user._id,
             userId: user.userId,
             userType: user.userType
             
        }
        const token  = generateToken(tokenPayload);
        res.status(200).send({
             message: "Signin successful",
             data : {
                token,
                name: user.name,
              userId: user.userId,
               email: user.email,
               userType: user.userType,
               userStatus: user.userStatus
             }
        })
}

