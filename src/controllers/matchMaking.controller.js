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
  View,
} = require("../models");
const messages = require("../utils/constants");
const haversine = require("haversine-distance");
const {getCommonWhereCondition, getUserPreferenceCondition} =  require('./user.controller');
const moment = require("moment/moment.js");

// route of this api is in user routes //

exports.matchUser = catchAsync(async (req, res, next) => {
  try {
    let me = req.user;
    let preference = await req.user.getUserPreference();
    let profile = await req.user.getUserProfile();
    let weightOnUsers = null;
    
    let where = await getCommonWhereCondition(req,{
      profileCompletionPercentage: 100,
      [Op.not]: {
        gender: req.user.gender,
      },
    isDisabled: false,
  })

  let activeUserSearch =await  UserSearch.findOne({
    isActive: true,
    userId: req.user.id,
  })
  
  const prefrenceWhere = await getUserPreferenceCondition(req, activeUserSearch)
    

   // START of NOT IN list 
  let finalFavList = []
  let finalViewedMeList = []

  if(activeUserSearch && !activeUserSearch.favoritedMe){
    let  likes = await Like.findAll(({
        attributes:['to'],
        to : req.user.id
      }))
        
      const likeList =likes?.map(u => u.get("to"))
      if(likeList && likeList.length>0){
        finalFavList = likeList || []
      }
    }

    if(activeUserSearch && !activeUserSearch.viewedMe){
      let  viewed = await View.findAll(({
          attributes:['to'],
          to : req.user.id
        }))
          
        const viewList =viewed?.map(u => u.get("to"))
  
        if(viewList && viewList.length>0){
          finalViewedMeList = viewList || []
        }
      }
      let notInList = [...finalFavList,...finalViewedMeList]
      if(notInList && notInList.length){
        where[Op.and]={
          id :{[Op.notIn]: notInList }
        }
      }
      // END of NOT IN list 

    if(activeUserSearch && activeUserSearch.minAge && activeUserSearch.maxAge){
      const start =  moment().subtract(activeUserSearch.maxAge, 'years').format('YYYY-MM-DD');
      const end =  moment().subtract(activeUserSearch.minAge, 'years').format('YYYY-MM-DD');
      where.birthDate={
        [Op.between]: [start, end]
      }
    }

    let users = await User.findAll({
      where: where,
      order: [["id", "DESC"]],
      include: [
        "UserPhotos",
        {
          model: UserProfile,
          required:true,
          where: prefrenceWhere,
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

    const blockedUsers = await User.findOne({
      where: {
        id: req.user.id,
      },
      include: [
        {
          model: Block,
          as: "blockFrom",
        },
      ],
    });
    let response = blockedUsers.blockFrom.map((ins) => {
      return ins.against;
    });
    for (let i = 0; i < users.length; i++) {
      const user = users[i];
      if (response.includes(user.id)) {
        users.splice(i, 1);
        i--; //decrement
      }
    }
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
      user.weight = weight;
      return user;
    });

    weightOnUsers.sort((obj1, obj2) => {
      if (obj1.weight > obj2.weight) return -1;
      if (obj1.weight < obj2.weight) return 1;

      return 0;
    });

    res.status(200).send({
      status: "success",
      // token,
      data: weightOnUsers,
    });
  } catch (error) {
    console.log(' error.message error.message', error.message)
    res.status(500).send({
      message: error.message,
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
