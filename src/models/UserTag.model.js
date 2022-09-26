const { Model, DataTypes } = require("sequelize");
const sequelize = require("../config/db.config");

class UserTag extends Model {
  //Functions comes here
}

UserTag.init(
  {
    //
  },
  {
    sequelize,
    modelName: "UserTag",
  }
);

module.exports = UserTag;