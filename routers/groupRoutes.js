const express=require('express');
const { getAllGroups, fetchStats, fetchMembers, getTimeline, createGroup, updateGroup, deleteGroup, createPost, joinGroup, leaveGroup, updateDisplayPicture, updateBackgroundPicture, addUser, removeUser } = require('../controllers/groupControllers');
const groupRouter=express.Router();
const {isLoggedin} = require('../middleware/isAuthenticated');
const {isGroupAdmin}= require('../middleware/isGroupAdmin');
const {isMember}= require('../middleware/isMember');
const { multerImageUploader } = require('../utils/multerUploader');
const {wrapAsync}=require('../utils/asyncErrorHandler')

groupRouter.get('/',isLoggedin,wrapAsync(getAllGroups)) //get all groups //done
groupRouter.get('/:id/stats',isLoggedin,isMember,wrapAsync(fetchStats)) //fetch stats for a particular group - you get stats only when you are a member of a group//done
groupRouter.get('/:id/members',isLoggedin,wrapAsync(fetchMembers)) //fetch all the members of the group //done
groupRouter.get('/:id/timeline',isLoggedin,isMember,wrapAsync(getTimeline)) //get timeline posts for a particular group
groupRouter.post('/',isLoggedin,wrapAsync(createGroup)) //create a group //done
groupRouter.post('/:id/post',isLoggedin,isMember,wrapAsync(createPost)) //create a post in a group - only group members can create a  post in a group //done
groupRouter.put('/:id',isLoggedin,isGroupAdmin,wrapAsync(updateGroup)) //update the group details - only admin can delete //tbim
groupRouter.put('/:id/join',isLoggedin,wrapAsync(joinGroup))//logged in user can join a group  //done
groupRouter.put('/:id/updatedp',isLoggedin,isGroupAdmin,multerImageUploader,wrapAsync(updateDisplayPicture)) //update group dp
groupRouter.put('/:id/updatebg',isLoggedin,isGroupAdmin,multerImageUploader,wrapAsync(updateBackgroundPicture)) // update group bg
groupRouter.put('/:id/:username/adduser',isLoggedin,isGroupAdmin,wrapAsync(addUser)) //group admin can add users
groupRouter.delete('/:id/leave',isLoggedin,wrapAsync(leaveGroup))//logged in user can leave a group //done
groupRouter.delete('/:id',isLoggedin,isGroupAdmin,wrapAsync(deleteGroup)) //delete a group - only admin can delete //done
groupRouter.delete('/:id/:username/removeuser',isLoggedin,isGroupAdmin,wrapAsync(removeUser)) //group admin can remove users
module.exports= {groupRouter}