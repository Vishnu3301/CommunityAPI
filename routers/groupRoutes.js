const express=require('express');
const { getAllGroups, fetchStats, fetchMembers, getTimeline, createGroup, updateGroup, deleteGroup, createPost, joinGroup, leaveGroup } = require('../controllers/groupControllers');
const groupRouter=express.Router();
const {isLoggedin} = require('../middleware/isAuthenticated');
const {isGroupAdmin}= require('../middleware/isGroupAdmin');
const {isMember}= require('../middleware/isMember');

groupRouter.get('/',isLoggedin,getAllGroups) //get all groups //done
groupRouter.get('/:id/stats',isLoggedin,isMember,fetchStats) //fetch stats for a particular group //done
groupRouter.get('/:id/members',isLoggedin,fetchMembers) //fetch all the members of the group //done
groupRouter.get('/:id/timeline',isLoggedin,isMember,getTimeline) //get timeline posts for a particular group
groupRouter.post('/',isLoggedin,createGroup) //create a group //done
groupRouter.put('/:id',isLoggedin,isGroupAdmin,updateGroup) //update the group details - only admin can delete //tbim
groupRouter.delete('/:id',isLoggedin,isGroupAdmin,deleteGroup) //delete a group - only admin can delete //done
groupRouter.post('/:id/post',isLoggedin,isMember,createPost) //create a post in a group - only group members can create a  post in a group //done
groupRouter.put('/:id/join',isLoggedin,joinGroup)//logged in user can join a group  //done
groupRouter.delete('/:id/leave',isLoggedin,leaveGroup)//logged in user can leave a group //done
module.exports= {groupRouter}