const express=require('express');
const { getAllGroups, fetchStats, fetchMembers, getTimeline } = require('../controllers/groupControllers');
const groupRouter=express.Router();
const {isLoggedin} = require('../middleware/tokenChecker');
const {isGroupAdmin}= require('../middleware/isGroupAdmin');

groupRouter.get('/',isLoggedin,getAllGroups) //get all groups
groupRouter.get('/:id/stats',fetchStats) //fetch stats for a particular group
groupRouter.get('/:id/members',fetchMembers) //fetch all the members of the group
groupRouter.get('/:id/timeline',getTimeline) //get timeline posts for a particular group

module.exports= {groupRouter}