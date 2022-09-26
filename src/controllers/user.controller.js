const User = require("../models/User.model");
const Report = require("../models/Report.model");
const Block = require("../models/Block.model");
const Sequelize = require("sequelize");
const catchAsync = require("../utils/catchAsync");
const APIError = require("../utils/APIError");
const messages = require("../utils/constants");
const status = require("http-status");
const Like = require("../models/Like.model");
const UserProfile = require("../models/UserProfile.model");
const BodyType = require("../models/BodyType.model");
const Ethnicity = require("../models/Ethnicity.model");
const HairColor = require("../models/HairColor.model");
const Education = require("../models/Education.model");
const Children = require("../models/Children.model");
const Occupation = require("../models/Occupation.model");
const UserPreference = require("../models/UserPreference.model");
const RelationshipStatus = require("../models/RelationshipStatus.model");
const UserTag = require("../models/UserTag.model");
const Tag = require("../models/Tag.model");
const View = require("../models/View.model");
const { sendUnscheduledNotification } = require("../utils/sendNotification");
const haversine = require('haversine')

const { BOOLEAN } = require("sequelize");
const { loggers } = require("winston");
const { Pool, Client } = require('pg')




exports.index = catchAsync(async (req, res, next) => {
  res.status(200).send({ message: success });
  // try {
  //   const options = {
  //     select:'*',
  //     limit: 5,
  //     order: [["id", "DESC"]],
  //   };

  //   const users = await User.findAndCountAll(options);
  //   res.status(200).send({
  //     status: "success",
  //     data: {
  //       users: users.rows,
  //       pages: Math.ceil(users.count / 5),
  //     },
  //   });
  // } catch (error) {
  //   res.status(500).send({ message: error.message });
  // }
});

exports.blockUser = async (req, res, next) => {
  try {
    const userExists = await User.findByPk(req.params.id);
    if (!userExists) {
      throw new Error("User you want to report not found");
    }
    const clause = {
      from: req.user.id,
      against: parseInt(req.params.id),
    };
    const alreadyBlocked = await Block.findOne({ where: clause });
    if (alreadyBlocked) {
      throw new Error(messages.ALREADY_BLOCKED);
    }
    const blockObj = await Block.create(clause);
    res.status(200).send({
      status: "success",
      data: blockObj,
    });
  } catch (error) {
    return next(new APIError(error.message, status.BAD_REQUEST));
  }
};

exports.reportUser = async (req, res, next) => {
  try {
    const userExists = await User.findByPk(req.params.id);
    if (!userExists) {
      throw new Error("User you want to report not found");
    }
    let {
      body: { reason, note },
    } = req;
    const clause = {
      from: req.user.id,
      against: parseInt(req.params.id),
    };
    const alreadyReported = await Report.findOne({
      where: clause,
    });
    if (alreadyReported) {
      throw new Error(messages.ALREADY_REPORTED);
    }
    const createObject = { ...clause, reason, note };
    const reportObject = await Report.create(createObject);
    res.status(200).send({
      status: "success",
      data: reportObject,
    });
  } catch (error) {
    return next(new APIError(error.message, status.BAD_REQUEST));
  }
};

exports.likeUser = async (req, res, next) => {
  try {
    const userExists = await User.findByPk(req.params.id);
    if (!userExists) {
      throw new Error("User you want to like not found");
    }
    const clause = {
      where: {
        from: req.user.id,
        to: parseInt(req.params.id),
      },
    };
    const alreadyLiked = await Like.findOne(clause);
    if (alreadyLiked) {
      throw new Error(messages.ALREADY_LIKED);
    }
    const likeObject = await Like.create(clause.where);
    let userFcmTokens = await userFcmTokens.findAll({
      where: {
        userId: req.params.id,         },
    });
    if (userFcmTokens.length) {
      userFcmTokens = userFcmTokens.map(function (user) {
        return user["fcmToken"];
      });
      let notification_options = {
        regTokens: userFcmTokens,
        notificationMsg: {
          data: { title: title, message: description },
          notification: { title: title, message: description },
        },
      };
      sendUnscheduledNotification(notification_options);
    }
    res.status(200).send({
      status: "success",
      data: likeObject,
    });
  } catch (error) {
    return next(new APIError(error.message, status.BAD_REQUEST));
  }
};

exports.getListOfAllUsersLikedByMe = async (req, res, next) => {
  try {
    const likedUsers = await User.findOne({
      where: {
        id: req.user.id,
      },
      include: [
        {
          model: Like,
          as: "likeFrom",
          include: {
            model: User,
            include: [
              "UserPhotos",
              {
                model: UserProfile,
                include: [
                  {
                    model: BodyType,
                    attributes: ["id", "name"],
                  },
                  {
                    model: Ethnicity,
                    attributes: ["id", "name"],
                  },
                  {
                    model: HairColor,
                    attributes: ["id", "name"],
                  },
                  {
                    model: Education,
                    attributes: ["id", "name"],
                  },
                  {
                    model: Children,
                    attributes: ["id", "name"],
                  },
                  {
                    model: Occupation,
                    attributes: ["id", "name"],
                  },
                ],
              },
              {
                model: UserPreference,
                include: [
                  {
                    model: RelationshipStatus,
                    attributes: ["id", "name"],
                  },
                  {
                    model: BodyType,
                    attributes: ["id", "name"],
                  },
                  {
                    model: Ethnicity,
                    attributes: ["id", "name"],
                  },
                  {
                    model: HairColor,
                    attributes: ["id", "name"],
                  },
                  {
                    model: Education,
                    attributes: ["id", "name"],
                  },
                  {
                    model: Children,
                    attributes: ["id", "name"],
                  },
                  {
                    model: Occupation,
                    attributes: ["id", "name"],
                  },
                  {
                    model: UserTag,
                    include: [
                      {
                        model: Tag,
                        attributes: ["id", "name"],
                      },
                    ],
                  },
                ],
              },
            ],
          },
        },
      ],
    });
    let response = likedUsers.likeFrom.map((ins) => {
      return ins.User;
    });
    res.status(200).send({
      status: "success",
      data: response,
    });
  } catch (error) {
    return next(new APIError(error, status.BAD_REQUEST));
  }
};

exports.getListOfAllUsersWhoLikeMe = async (req, res, next) => {
  try {
    const likedUsers = await User.findAll({
      include: [
        {
          where: {
            to: req.user.id,
          },
          model: Like,
          as: "likeFrom",
          include: {
            model: User,
            include: [
              "UserPhotos",
              {
                model: UserProfile,
                include: [
                  {
                    model: BodyType,
                    attributes: ["id", "name"],
                  },
                  {
                    model: Ethnicity,
                    attributes: ["id", "name"],
                  },
                  {
                    model: HairColor,
                    attributes: ["id", "name"],
                  },
                  {
                    model: Education,
                    attributes: ["id", "name"],
                  },
                  {
                    model: Children,
                    attributes: ["id", "name"],
                  },
                  {
                    model: Occupation,
                    attributes: ["id", "name"],
                  },
                ],
              },
              {
                model: UserPreference,
                include: [
                  {
                    model: RelationshipStatus,
                    attributes: ["id", "name"],
                  },
                  {
                    model: BodyType,
                    attributes: ["id", "name"],
                  },
                  {
                    model: Ethnicity,
                    attributes: ["id", "name"],
                  },
                  {
                    model: HairColor,
                    attributes: ["id", "name"],
                  },
                  {
                    model: Education,
                    attributes: ["id", "name"],
                  },
                  {
                    model: Children,
                    attributes: ["id", "name"],
                  },
                  {
                    model: Occupation,
                    attributes: ["id", "name"],
                  },
                  {
                    model: UserTag,
                    include: [
                      {
                        model: Tag,
                        attributes: ["id", "name"],
                      },
                    ],
                  },
                ],
              },
            ],
          },
          required: true,
        },
        "UserPhotos",
        {
          model: UserProfile,
          include: [
            {
              model: BodyType,
              attributes: ["id", "name"],
            },
            {
              model: Ethnicity,
              attributes: ["id", "name"],
            },
            {
              model: HairColor,
              attributes: ["id", "name"],
            },
            {
              model: Education,
              attributes: ["id", "name"],
            },
            {
              model: Children,
              attributes: ["id", "name"],
            },
            {
              model: Occupation,
              attributes: ["id", "name"],
            },
          ],
        },
        {
          model: UserPreference,
          include: [
            {
              model: RelationshipStatus,
              attributes: ["id", "name"],
            },
            {
              model: BodyType,
              attributes: ["id", "name"],
            },
            {
              model: Ethnicity,
              attributes: ["id", "name"],
            },
            {
              model: HairColor,
              attributes: ["id", "name"],
            },
            {
              model: Education,
              attributes: ["id", "name"],
            },
            {
              model: Children,
              attributes: ["id", "name"],
            },
            {
              model: Occupation,
              attributes: ["id", "name"],
            },
            {
              model: UserTag,
              include: [
                {
                  model: Tag,
                  attributes: ["id", "name"],
                },
              ],
            },
          ],
        },
      ],
    });
    res.status(200).send({
      status: "success",
      data: likedUsers,
    });
  } catch (error) {
    return next(new APIError(error, status.BAD_REQUEST));
  }
};

exports.deleteAccount = async (req, res, next) => {
  try {
    if (!req.user) {
      throw new Error("User not found");
    }
    await User.destroy({
      where: {
        id: req.user.id,
      },
    });
    res.status(200).send({
      status: "success",
    });
  } catch (error) {
    return next(new APIError(error.message, status.BAD_REQUEST));
  }
};

exports.disableAccount = async (req, res, next) => {
  try {
    if (!req.user) {
      throw new Error("User not found");
    }
    await User.update(
      {
        isDisabled: true,
      },
      {
        where: {
          id: req.user.id,
        },
      }
    );
    res.status(200).send({
      status: "success",
    });
  } catch (error) {
    return next(new APIError(error.message, status.BAD_REQUEST));
  }
};

exports.getListOfAllUsersViewedByMe = async (req, res, next) => {
  try {
    const viewedUsers = await User.findOne({
      where: {
        id: req.user.id,
      },
      include: [
        {
          model: View,
          as: "viewFrom",
          include: {
            model: User,
            include: [
              "UserPhotos",
              {
                model: UserProfile,
                include: [
                  {
                    model: BodyType,
                    attributes: ["id", "name"],
                  },
                  {
                    model: Ethnicity,
                    attributes: ["id", "name"],
                  },
                  {
                    model: HairColor,
                    attributes: ["id", "name"],
                  },
                  {
                    model: Education,
                    attributes: ["id", "name"],
                  },
                  {
                    model: Children,
                    attributes: ["id", "name"],
                  },
                  {
                    model: Occupation,
                    attributes: ["id", "name"],
                  },
                ],
              },
              {
                model: UserPreference,
                include: [
                  {
                    model: RelationshipStatus,
                    attributes: ["id", "name"],
                  },
                  {
                    model: BodyType,
                    attributes: ["id", "name"],
                  },
                  {
                    model: Ethnicity,
                    attributes: ["id", "name"],
                  },
                  {
                    model: HairColor,
                    attributes: ["id", "name"],
                  },
                  {
                    model: Education,
                    attributes: ["id", "name"],
                  },
                  {
                    model: Children,
                    attributes: ["id", "name"],
                  },
                  {
                    model: Occupation,
                    attributes: ["id", "name"],
                  },
                  {
                    model: UserTag,
                    include: [
                      {
                        model: Tag,
                        attributes: ["id", "name"],
                      },
                    ],
                  },
                ],
              },
            ],
          },
        },
      ],
    });
    let response = viewedUsers.viewFrom.map((ins) => {
      return ins.User;
    });
    res.status(200).send({
      status: "success",
      data: response,
    });
  } catch (error) {
    return next(new APIError(error, status.BAD_REQUEST));
  }
};

exports.getListOfAllUsersWhoViewedMe = async (req, res, next) => {
  try {
    const viewedUsers = await User.findAll({
      include: [
        {
          where: {
            to: req.user.id,
          },
          model: View,
          as: "viewFrom",
          include: {
            model: User,
            include: [
              "UserPhotos",
              {
                model: UserProfile,
                include: [
                  {
                    model: BodyType,
                    attributes: ["id", "name"],
                  },
                  {
                    model: Ethnicity,
                    attributes: ["id", "name"],
                  },
                  {
                    model: HairColor,
                    attributes: ["id", "name"],
                  },
                  {
                    model: Education,
                    attributes: ["id", "name"],
                  },
                  {
                    model: Children,
                    attributes: ["id", "name"],
                  },
                  {
                    model: Occupation,
                    attributes: ["id", "name"],
                  },
                ],
              },
              {
                model: UserPreference,
                include: [
                  {
                    model: RelationshipStatus,
                    attributes: ["id", "name"],
                  },
                  {
                    model: BodyType,
                    attributes: ["id", "name"],
                  },
                  {
                    model: Ethnicity,
                    attributes: ["id", "name"],
                  },
                  {
                    model: HairColor,
                    attributes: ["id", "name"],
                  },
                  {
                    model: Education,
                    attributes: ["id", "name"],
                  },
                  {
                    model: Children,
                    attributes: ["id", "name"],
                  },
                  {
                    model: Occupation,
                    attributes: ["id", "name"],
                  },
                  {
                    model: UserTag,
                    include: [
                      {
                        model: Tag,
                        attributes: ["id", "name"],
                      },
                    ],
                  },
                ],
              },
            ],
          },
          required: true,
        },
        "UserPhotos",
        {
          model: UserProfile,
          include: [
            {
              model: BodyType,
              attributes: ["id", "name"],
            },
            {
              model: Ethnicity,
              attributes: ["id", "name"],
            },
            {
              model: HairColor,
              attributes: ["id", "name"],
            },
            {
              model: Education,
              attributes: ["id", "name"],
            },
            {
              model: Children,
              attributes: ["id", "name"],
            },
            {
              model: Occupation,
              attributes: ["id", "name"],
            },
          ],
        },
        {
          model: UserPreference,
          include: [
            {
              model: RelationshipStatus,
              attributes: ["id", "name"],
            },
            {
              model: BodyType,
              attributes: ["id", "name"],
            },
            {
              model: Ethnicity,
              attributes: ["id", "name"],
            },
            {
              model: HairColor,
              attributes: ["id", "name"],
            },
            {
              model: Education,
              attributes: ["id", "name"],
            },
            {
              model: Children,
              attributes: ["id", "name"],
            },
            {
              model: Occupation,
              attributes: ["id", "name"],
            },
            {
              model: UserTag,
              include: [
                {
                  model: Tag,
                  attributes: ["id", "name"],
                },
              ],
            },
          ],
        },
      ],
    });
    res.status(200).send({
      status: "success",
      data: viewedUsers,
    });
  } catch (error) {
    return next(new APIError(error, status.BAD_REQUEST));
  }
};

exports.viewUser = async (req, res, next) => {
  try {
    const userExists = await User.findByPk(req.params.id);
    if (!userExists) {
      throw new Error("User you want to view not found");
    }
    const clause = {
      where: {
        from: req.user.id,
        to: parseInt(req.params.id),
      },
    };
    const alreadyViewed = await View.findOne(clause);
    if (!alreadyViewed) {
      await View.create(clause.where);
    }
    res.status(200).send({
      status: "success",
    });
  } catch (error) {
    return next(new APIError(error.message, status.BAD_REQUEST));
  }
};

exports.likeUser = async (req, res, next) => {
  try {
    const userExists = await User.findByPk(req.params.id);
    if (!userExists) {
      throw new Error("User you want to like not found");
    }
    const like = {
      where: {
        from: req.user.id,
        to: parseInt(req.params.id),
      },
    };
    const alreadyLiked = await Like.findOne(like);
    if (alreadyLiked) {
      throw new Error(messages.ALREADY_LIKED);
    }
    const likeObject = await Like.create(like.where);
    res.status(200).send({
      status: "success",
      data: likeObject,
    });
  } catch (error) {
    return next(new APIError(error, status.BAD_REQUEST));
  }
};

exports.showOnlineStatus = async (req, res, next) => {
  const user = await User.findOne({ where: { id: req.user.id } });
  // let onlineStatus = !User.onlineStatus;

  try {
    await User.update(
      { onlineStatus: !user.onlineStatus },
      {
        where: {
          id: req.user.id,
        },
      }
    );

    const user1 = await User.findOne({
      where: {
        id: req.user.id,
      },
    });

    res.status(200).send({
      status: "success",
      data: user1,
    });
  } catch (error) {
    console.log("error is", error);
    return next(new APIError(error, status.BAD_REQUEST));
  }
};

exports.showJoiningDate = async (req, res, next) => {
  const user = await User.findOne({ where: { id: req.user.id } });
  // let onlineStatus = !User.onlineStatus;

  try {
    await User.update(
      { joiningDate: !user.joiningDate },
      {
        where: {
          id: req.user.id,
        },
      }
    );

    const user1 = await User.findOne({
      where: {
        id: req.user.id,
      },
    });

    res.status(200).send({
      status: "success",
      data: user1,
    });
  } catch (error) {
    console.log("error is", error);
    return next(new APIError(error, status.BAD_REQUEST));
  }
};

exports.showRecentLoginLocation = async (req, res, next) => {
  const user = await User.findOne({ where: { id: req.user.id } });
  // let onlineStatus = !User.onlineStatus;

  try {
    await User.update(
      { showRecentLocation: !user.showRecentLocation },
      {
        where: {
          id: req.user.id,
        },
      }
    );

    const user1 = await User.findOne({
      where: {
        id: req.user.id,
      },
    });

    res.status(200).send({
      status: "success",
      data: user1,
    });
  } catch (error) {
    console.log("error is", error);
    return next(new APIError(error, status.BAD_REQUEST));
  }
};

exports.showInSearch = async (req, res, next) => {
  const user = await User.findOne({ where: { id: req.user.id } });
  // let onlineStatus = !User.onlineStatus;

  try {
    await User.update(
      { showInSearch: !user.showInSearch },
      {
        where: {
          id: req.user.id,
        },
      }
    );

    const user1 = await User.findOne({
      where: {
        id: req.user.id,
      },
    });

    res.status(200).send({
      status: "success",
      data: user1,
    });
  } catch (error) {
    console.log("error is", error);
    return next(new APIError(error, status.BAD_REQUEST));
  }
};

exports.showFavouritedOne = async (req, res, next) => {
  const user = await User.findOne({ where: { id: req.user.id } });
  // let onlineStatus = !User.onlineStatus;

  try {
    await User.update(
      { showFavouritedOne: !user.showFavouritedOne },
      {
        where: {
          id: req.user.id,
        },
      }
    );

    const user1 = await User.findOne({
      where: {
        id: req.user.id,
      },
    });

    res.status(200).send({
      status: "success",
      data: user1,
    });
  } catch (error) {
    console.log("error is", error);
    return next(new APIError(error, status.BAD_REQUEST));
  }
};

exports.showWhenViewSomeone = async (req, res, next) => {
  const user = await User.findOne({ where: { id: req.user.id } });
  // let onlineStatus = !User.onlineStatus;

  try {
    await User.update(
      { showWhenViewSomeone: !user.showWhenViewSomeone },
      {
        where: {
          id: req.user.id,
        },
      }
    );

    const user1 = await User.findOne({
      where: {
        id: req.user.id,
      },
    });

    res.status(200).send({
      status: "success",
      data: user1,
    });
  } catch (error) {
    console.log("error is", error);
    return next(new APIError(error, status.BAD_REQUEST));
  }
};
exports.showWhenViewSomeOne = async (req, res, next) => {
  try {
    let {
      user: { id },
      body: { showWhenViewSomeOne },
    } = req;

    await User.update(
      {
        showWhenViewSomeOne: showWhenViewSomeOne,
      },
      {
        where: {
          id: id,
        },
      }
    );
    res.status(200).send({
      status: "success",
    });
  } catch (error) {
    return next(new APIError(error.message, status.BAD_REQUEST));
  }
};

exports.showSomeOneFavouritedMe = async (req, res, next) => {
  const user = await User.findOne({ where: { id: req.user.id } });
  try {
    await User.update(
      { someoneFavouritedMe: !user.someoneFavouritedMe },
      {
        where: {
          id: req.user.id,
        },
      }
    );

    const updatedUser = await User.findOne({
      where: {
        id: req.user.id,
      },
    });

    res.status(200).send({
      status: "success",
      data: updatedUser,
    });
  } catch (error) {
    console.log("error is", error);
    return next(new APIError(error, status.BAD_REQUEST));
  }
};

exports.showSomeOneSendMeMessage = async (req, res, next) => {
  const user = await User.findOne({ where: { id: req.user.id } });
  try {
    await User.update(
      { someoneSendMeMessage: !user.someoneSendMeMessage },
      {
        where: {
          id: req.user.id,
        },
      }
    );

    const updatedUser = await User.findOne({
      where: {
        id: req.user.id,
      },
    });

    res.status(200).send({
      status: "success",
      data: updatedUser,
    });
  } catch (error) {
    console.log("error is", error);
    return next(new APIError(error, status.BAD_REQUEST));
  }
};


const { Op } = require("sequelize");

exports.showLatestUser = async (req, res, next) => {
  const user = await User.findAll(
    {
      where: {
        // profileCompletionPercentage: 25,
        [Op.not]: {
          gender: req.user.gender,
        },
        isDisabled: false,
      },
      order: [["id", "DESC"]],
    }
  );

  try {
    await User.update(
      { showLatestUser: !user.showLatestUser },
      {
        where: { id: req.user.id }
      }
    );


    res.status(200).send({
      status: "latest users",
      data: user,
    });
  } catch (error) {
    console.log("error is", error);
    return next(new APIError(error, status.BAD_REQUEST));
  }
};

exports.showNearByUser = async (req, res, next) => {
  try {

  
    // const pool = new Pool({
    //   user: 'postgres',
    //   host: 'localhost',
    //   database: 'boss-dater-backend',
    //   password: 'admin',
    //   port: 5432,
    // })
    // pool.query('SELECT NOW()', (err, res) => {
    //   console.log(err, res)
    //   pool.end()
    // })
  //   let client = new Client({
  //     user: 'postgres',
  //     host: 'localhost',
  //     database: 'boss-dater-backend',
  //     password: 'admin',
  //     port: 5432,
  // })
  //   client.connect()
    // client.query('SELECT NOW()', (err, res) => {
    //   console.log(err, res)
    //   console.log("asdasd")
     
    // })

    // const userLatlng = ["31.465564", "74.417984"]
    // const radius = 10

    // const _q = `SELECT * FROM "UserProfiles" WHERE ( $1 <= ( latitude + (0.00898315284 * $3) ) ) AND ( $1 >= ( latitude - (0.00898315284 * $3) ) ) AND ( $2 <= ( longitude + (0.00898315284 * $3) ) ) AND ( $2 >= ( longitude - (0.00898315284 * $3) ) )`
    
    
    // const query = {
    //   // give the query a unique name
    //   name: 'fetch-user',
    //   // text: 'SELECT * FROM "Users" WHERE id > $1 limit $2',
    //   text: _q,
    //   values: [userLatlng[0], userLatlng[1], radius],
    // }
    // callback
    // client.query(query, (err, res) => {
    //   if (err) {
    //     console.log(err.stack)
    //   } else {
    //     console.log(res.rows[0])
    //   }
    // })
    // promise
    // let myres = await client
    //   .query(query)
      // .then(res => console.log(res.rows[0]))
      // .catch(e => console.error(e.stack))
   
    //   client.end()
    // let res1 = "hhh"
    // return res.send({
    //   "rows": myres
    //   // "hello": await User.findAll()
    // })

    // return res.send({
    //   hello: "world",
    //   query: req.query
    // })

    let { latitude, longitude } = req.query;
    // return res.send({
    //   lat: latitude,
    //   lng: longitude
    // })
    let loggedInUser = await User.findOne({
      where: { id: req.user.id }, include: [
        {
          model: UserProfile,
          include: [
            {
              model: BodyType,
              attributes: ["id", "name"],
            },
            {
              model: Ethnicity,
              attributes: ["id", "name"],
            },
            {
              model: HairColor,
              attributes: ["id", "name"],
            },
            {
              model: Education,
              attributes: ["id", "name"],
            },
            {
              model: Children,
              attributes: ["id", "name"],
            },
            {
              model: Occupation,
              attributes: ["id", "name"],
            },
          ],
        },
      ]
    })

    let users = await User.findAll({
      include: [
        {
          model: UserProfile,
          include: [
            {
              model: BodyType,
              attributes: ["id", "name"],
            },
            {
              model: Ethnicity,
              attributes: ["id", "name"],
            },
            {
              model: HairColor,
              attributes: ["id", "name"],
            },
            {
              model: Education,
              attributes: ["id", "name"],
            },
            {
              model: Children,
              attributes: ["id", "name"],
            },
            {
              model: Occupation,
              attributes: ["id", "name"],
            },
          ],
        },
      ]
    })
    let nearByUsers = []


    for (let i = 0; i < users.length; i++) {
      const plainUser = users[i];
      let user = plainUser

      if(user.UserProfile && user.UserProfile.latitude && user.UserProfile.longitude) {
        let distanceInKM = Math.round(
          haversine(
            {
              latitude: latitude ? latitude : loggedInUser.UserProfile.latitude,
              longitude: longitude ? longitude : loggedInUser.UserProfile.longitude
            },
            {
              latitude: user.UserProfile.latitude,
              longitude: user.UserProfile.longitude,
            }
          ) / 1000)
  
        if (distanceInKM >= 0 && distanceInKM <= 45) {
          nearByUsers.push(user)
        }
      }
    }

    return res.status(200).send({
      status: "nearby users",
      data: nearByUsers,
    });
  } catch (error) {
    console.log("error is", error);
    return next(new APIError(error, status.BAD_REQUEST));
  }
};
exports.showRecentlyActiveUser = async (req, res, next) => {
  const user = await User.findAll(
    {
      where: {
        // profileCompletionPercentage: 25,
        [Op.not]: {
          gender: req.user.gender,
        },
        isDisabled: false,
      },
      order: [["id", "DESC"]],
    }
  );

  try {
    await User.update(
      { showRecentlyActiveUser: !user.showRecentlyActiveUser },
      {
        where: { id: req.user.id }
      }
    );


    res.status(200).send({
      status: "Recently Active users",
      data: user,
    });
  } catch (error) {
    console.log("error is", error);
    return next(new APIError(error, status.BAD_REQUEST));
  }
};
