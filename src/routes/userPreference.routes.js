const express = require("express");
const { authJwt } = require('../middlewares/authJwt')
const { checkDuplicateEmail } = require("../middlewares/verifySignUp");
const {checkAccountDisableOrDeletion} = require("../middlewares/checkDuplicate");

const { create, searchFilter } = require("../controllers/userPreference.controller");
  const validateRequestSchema = require("../middlewares/validateRequestSchema");
  
  const preferenceRouter = express.Router();

  preferenceRouter.use(authJwt);
  preferenceRouter.route("/create").post(create);
  preferenceRouter.route("/search-filter").post(searchFilter);


  
module.exports = preferenceRouter;