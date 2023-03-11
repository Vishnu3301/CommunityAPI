const express=require('express');
const userRouter=express.Router();
const {isLoggedin} = require('../middleware/isAuthenticated');
const {getUser,getfollowerCount,myDetails,getStats,followUser,unfollowUser,updateUser, getFollowers, updateDisplayPicture, updateBackgroundPicture}=require('../controllers/userControllers');
const { multerImageUploader } = require('../utils/multerUploader');
const {wrapAsync}=require('../utils/asyncErrorHandler')

userRouter.get('/self',isLoggedin,wrapAsync(myDetails)); //get the current users details
userRouter.get('/:username/followers',isLoggedin,wrapAsync(getFollowers)) //get all the followers of the user with the given username
userRouter.get('/:username',isLoggedin,wrapAsync(getUser)); //search for a user, if user exists return the user info with masked email and phone number
userRouter.get('/:username/followercount',isLoggedin,wrapAsync(getfollowerCount)); //get the number of followers for the user
userRouter.get('/:username/stats',isLoggedin,wrapAsync(getStats)); //fetch a user's posts,comments, likes count
userRouter.put('/self',isLoggedin,wrapAsync(updateUser)); //update the details of current user
userRouter.put('/:username/follow',isLoggedin,wrapAsync(followUser)); //follow a user
userRouter.put('/self/updatedp',isLoggedin,multerImageUploader,wrapAsync(updateDisplayPicture)); //update users dp
userRouter.put('/self/updatebg',isLoggedin,multerImageUploader,wrapAsync(updateBackgroundPicture)) //update users bg
userRouter.delete('/:username/follow',isLoggedin,wrapAsync(unfollowUser)); //unfollow a user

module.exports = {userRouter}