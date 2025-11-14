
const mongoose = require('mongoose');
const constants = require('../utils/constants')
const userSchema = new mongoose.Schema({
    name: {
         type: String,
         required: true

    },
    userId: {
         type: String,
         required: true,
         unique: true
    },
     password: {
         type: String,
         required: true

     },
      email : {
         type: String,
         required: true,
         unique: true,
         lowercase: true,
         trim: true,
         minLength: 15
      },
       userType : {
         type: String,
         enum: [constants.userTypes.customer, constants.userTypes.engineer, constants.userTypes.admin],
         required: true,
         default: constants.userTypes.customer

       },
       userStatus: {
         type: String,
         enum: [constants.userStatuses.approved, constants.userStatuses.pending, constants.userStatuses.rejected],
         required: true,
         default: constants.userStatuses.pending
       } 
}, {timestamps: true});

module.exports = mongoose.model('User', userSchema);