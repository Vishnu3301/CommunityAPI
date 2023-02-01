const express=require('express');
const postRouter=express.Router();
const isLoggedin=require('../middleware/auth');
const {getMyposts,createPost,getTimeline,updatePost,deletePost}=require('../controllers/postControllers')
const {isCreator}=require('../middleware/authorisedUser')

//for now all posts are public

postRouter.get('/',isLoggedin,getMyposts); //get all the posts of the current logged in user
postRouter.get('/timeline',isLoggedin,getTimeline); //get the timeline posts of the current logged in user
postRouter.post('/',isLoggedin,createPost);  //create a post corresponding to the current logged in user
postRouter.put('/:id',isLoggedin,/*isCreator,*/updatePost); //update the details of a specific post made by the current logged in user
postRouter.delete('/:id',isLoggedin,/*isCreator,*/deletePost); //delete a specific post created by the current logged in user

module.exports=postRouter