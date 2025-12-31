const constants = require("../utils/constants");

exports.isSuperAdmin = (req, res, next) => {
  if (req.userType !== constants.userTypes.superadmin) {
    return res.status(403).send({ message: "Only Super Admin can access this" });
  }
  next();
};

exports.isAdmin = (req, res, next) => {
  if (req.userType !== constants.userTypes.admin) {
    return res.status(403).send({ message: "Only Admin can access this" });
  }
  next();
};
exports.isAdminOrEngineer = (req, res, next) => {
  if (
    req.userType === constants.userTypes.admin ||
    req.userType === constants.userTypes.engineer
  ) {
    return next();
  }

  return res.status(403).send({
    message: "Only Admin or Engineer can access this"
  });
};


exports.isEngineer = (req, res, next) => {
  if (req.userType !== constants.userTypes.engineer) {
    return res.status(403).send({ message: "Only Engineer can access this" });
  }
  next();
};


exports.isCustomer = (req, res, next) => {
  if (req.userType !== constants.userTypes.customer) {
    return res.status(403).send({ message: "Only Customer can access this" });
  }
  next();
};
