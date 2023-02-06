const express=require('express');
const userRouter=express.Router();
const {isLoggedin} = require('../middleware/tokenChecker');
const {getUser,getfollowerCount,myDetails,getStats,followUser,unfollowUser,updateUser, getFollowers}=require('../controllers/userControllers')

userRouter.get('/self',isLoggedin,myDetails); //get the current users details
userRouter.get('/:username/followers',isLoggedin,getFollowers) //get all the followers of the user with the given username
userRouter.get('/:username',isLoggedin,getUser); //search for a user, if user exists return the user info with masked email and phone number
userRouter.get('/:username/followercount',isLoggedin,getfollowerCount); //get the number of followers for the user
userRouter.put('/self',isLoggedin,updateUser); //update the details of current user
userRouter.get('/:username/stats',isLoggedin,getStats); //fetch a user's posts,comments, likes count
userRouter.put('/:username/follow',isLoggedin,followUser); //follow a user
userRouter.delete('/:username/follow',isLoggedin,unfollowUser); //unfollow a user


module.exports = {userRouter}