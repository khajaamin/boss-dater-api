const status = require("http-status");
const User = require("../models/User.model");
const APIError = require("../utils/APIError");
const messages = require("../utils/constants");

exports.checkDuplicateEmail = (req, res, next) => {
  // Email
  User.findOne({
    where: {
      email: req.body.email,
    },
  }).then((user) => {
    if (user)
      return next(
        new APIError(messages.EMAIL_ALREADY_EXIST, status.BAD_REQUEST)
      );

    next();
  });
};
