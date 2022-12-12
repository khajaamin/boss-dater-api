const bcrypt = require("bcryptjs");
const { Op } = require("sequelize");
const APIError = require("../utils/APIError.js");
const sequelize = require("../config/db.config");
const status = require("http-status");
const catchAsync = require("../utils/catchAsync");
const UserSearch = require("../models/UserSearch.model");

const {
  User,
  UserProfile,
  BodyType,
  Ethnicity,
  HairColor,
  Education,
  Children,
  Occupation,
  UserPreference,
  RelationshipStatus,
  UserTag,
  Tag,
  Block,
  Like,
  View
} = require("../models");
const messages = require("../utils/constants");
const haversine = require("haversine-distance");
const {
  getCommonWhereCondition,
  getUserPreferenceCondition
} = require("./user.controller");
const moment = require("moment/moment.js");

// route of this api is in user routes //

exports.matchUser = catchAsync(async (req, res, next) => {
  try {
    let me = req.user;
    let preference = await req.user.getUserPreference();
    // console.log("memememememememememe",preference)

    let weightOnUsers = null;

    let where = await getCommonWhereCondition(req, {
      profileCompletionPercentage: 100,
      [Op.not]: {
        gender: req.user.gender
      },
      isDisabled: false
    });

    let activeUserSearch = await UserSearch.findOne({
      where: {
        isActive: true,
        userId: req.user.id
      }
    });

    const prefrenceWhere = await getUserPreferenceCondition(
      req,
      activeUserSearch
    );

    console.log("prefrenceWhereprefrenceWhere", activeUserSearch);

    // START of NOT IN list
    let finalFavList = [];
    let finalViewedMeList = [];

    if (activeUserSearch && !activeUserSearch.favoritedMe) {
      let likes = await Like.findAll({
        attributes: ["to"],
        where: { to: req.user.id }
      });

      const likeList = likes?.map((u) => u.get("to"));
      if (likeList && likeList.length > 0) {
        finalFavList = likeList || [];
      }
    }

    if (activeUserSearch && !activeUserSearch.viewedMe) {
      let viewed = await View.findAll({
        attributes: ["to"],
        where: { to: req.user.id }
      });

      const viewList = viewed?.map((u) => u.get("to"));

      if (viewList && viewList.length > 0) {
        finalViewedMeList = viewList || [];
      }
    }
    let notInList = [...finalFavList, ...finalViewedMeList];
    if (notInList && notInList.length) {
      where[Op.and] = {
        id: { [Op.notIn]: notInList }
      };
    }
    // END of NOT IN list

    if (
      activeUserSearch &&
      activeUserSearch.minAge &&
      activeUserSearch.maxAge
    ) {
      const start = moment()
        .subtract(activeUserSearch.maxAge, "years")
        .format("YYYY-MM-DD");
      const end = moment()
        .subtract(activeUserSearch.minAge, "years")
        .format("YYYY-MM-DD");
      where.birthDate = {
        [Op.between]: [start, end]
      };
    }

    let users = await User.findAll({
      where: where,
      order: [["id", "DESC"]],
      include: [
        "UserPhotos",
        {
          model: UserProfile,
          required: true,
          where: prefrenceWhere,
          include: [
            {
              model: RelationshipStatus,
              attributes: ["id", "name"]
            },
            {
              model: BodyType,
              attributes: ["id", "name"]
            },
            {
              model: Ethnicity,
              attributes: ["id", "name"]
            },
            {
              model: HairColor,
              attributes: ["id", "name"]
            },
            {
              model: Education,
              attributes: ["id", "name"]
            },
            {
              model: Children,
              attributes: ["id", "name"]
            },
            {
              model: Occupation,
              attributes: ["id", "name"]
            }
          ]
        },
        {
          model: UserPreference,
          include: [
            {
              model: RelationshipStatus,
              attributes: ["id", "name"]
            },
            {
              model: BodyType,
              attributes: ["id", "name"]
            },
            {
              model: Ethnicity,
              attributes: ["id", "name"]
            },
            {
              model: HairColor,
              attributes: ["id", "name"]
            },
            {
              model: Education,
              attributes: ["id", "name"]
            },
            {
              model: Children,
              attributes: ["id", "name"]
            },
            {
              model: Occupation,
              attributes: ["id", "name"]
            },
            {
              model: UserTag,
              include: [
                {
                  model: Tag,
                  attributes: ["id", "name"]
                }
              ]
            }
          ]
        }
      ]
    });

    console.log("usersusersusersusers", users);

    weightOnUsers = users;
    if (activeUserSearch) {
      weightOnUsers = users.map(async (plainUser) => {
        let user = plainUser.get({ plain: true });
        let weight = 0;

        let age = getAge(user.birthDate);
        let height = user.UserProfile.height;
        if (age >= activeUserSearch.minAge && age <= activeUserSearch.maxAge)
          ++weight;

        if (
          height >= parseInt(preference.minHeight) &&
          height <= parseInt(preference.maxHeight)
        )
          ++weight;

        if (
          activeUserSearch.relationshipStatusIds?.includes(
            user.UserProfile.relationshipStatusId
          )
        ) {
          ++weight;
        }
        if (
          activeUserSearch.bodyTypesIds?.includes(user.UserProfile.bodyTypeId)
        ) {
          ++weight;
        }
        if (
          activeUserSearch.heirTypeIds?.includes(user.UserProfile.hairColorId)
        ) {
          ++weight;
        }

        if (
          activeUserSearch.educationIds?.includes(user.UserProfile.educationId)
        ) {
          ++weight;
        }
        if (
          activeUserSearch.childrenIds?.includes(user.UserProfile.childrenId)
        ) {
          ++weight;
        }

        if (
          activeUserSearch.occupations?.includes(user.UserProfile.Occupation)
        ) {
          ++weight;
        }
        if (activeUserSearch.jobTitle?.includes(user.UserProfile.jobTitle)) {
          ++weight;
        }
        // if (
        //   activeUserSearch.minNetWorth <= user.UserProfile.minNetWorth &&
        //   activeUserSearch.maxNetWorth >= user.UserProfile.maxNetWort
        // ) {
        //   ++weight;
        // }
        console.log("UserTagsUserTags",user.UserPreference.UserTags)
        if (activeUserSearch.showMemberSeekengIds) {
          await user.UserPreference.UserTags.map(async (k) => {
            await activeUserSearch.showMemberSeekengIds.map((i) => {
              if (k === i) {
                ++weight;
              }
            });
          });
        }

        // if (activeUserSearch.doNotShowMemberSeekings) {
        //   await user.UserPreference.UserTags.map(async (k) => {
        //     await activeUserSearch.doNotShowMemberSeekings.map((i) => {
        //       if (k != i) {
        //         ++weight;
        //       }
        //     });
        //   });
        // }

        user.weight = weight;
        return user;
      });
    } else {
      weightOnUsers = users.map((plainUser) => {
        let user = plainUser.get({ plain: true });
        let weight = 0;

        let age = getAge(user.birthDate);
        let height = user.UserProfile.height;
        if (age >= preference.minAge && age <= preference.maxAge) ++weight;

        if (
          height >= parseInt(preference.minHeight) &&
          height <= parseInt(preference.maxHeight)
        )
          ++weight;

        if (
          user.UserProfile.relationshipStatusId ===
          preference.relationshipStatusId
        ) {
          ++weight;
        }

        if (user.UserProfile.bodyTypeId === preference.bodyTypeId) {
          ++weight;
        }

        if (user.UserProfile.ethnicityId === preference.ethnicityId) {
          ++weight;
        }

        if (user.UserProfile.hairColorId === preference.ethnicityId) {
          ++weight;
        }

        if (user.UserProfile.educationId === preference.educationId) {
          ++weight;
        }

        if (user.UserProfile.childrenId === preference.childrenId) {
          ++weight;
        }

        if (user.UserProfile.occupationId === preference.occupationId) {
          ++weight;
        }

        if (preference.jobTitle?.includes(user.UserProfile.jobTitle)) {
          ++weight;
        }
        if (
          preference.minNetWorth <= user.UserProfile.minNetWorth &&
          preference.maxNetWorth >= user.UserProfile.maxNetWort
        ) {
          ++weight;
        }

        if (
          preference.showMemberSeekengIds?.includes(
            user.UserProfile.showMemberSeekengId
          ) //Not working
        ) {
          ++weight;
        }
        if (
          preference.doNotShowMemberSeekings?.includes(
            user.UserProfile.doNotShowMemberSeeking
          ) //Not working
        ) {
          ++weight;
        }
        user.weight = weight;
        return user;
      });
      weightOnUsers.sort((obj1, obj2) => {
        if (obj1.weight > obj2.weight) return -1;
        if (obj1.weight < obj2.weight) return 1;

        return 0;
      });
    }
    console.log("activeUserSearch", weightOnUsers);

    res.status(200).send({
      status: "success",
      // token,
      data: weightOnUsers
    });
  } catch (error) {
    console.log(" error.message error.message", error.message);
    res.status(500).send({
      message: error.message
    });
  }
});

function getAge(dateString) {
  var today = new Date();
  var birthDate = new Date(dateString);
  var age = today.getFullYear() - birthDate.getFullYear();
  var m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
}
