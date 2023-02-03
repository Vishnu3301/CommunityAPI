const express=require('express');
const postRouter=express.Router();
const isLoggedin=require('../middleware/tokenChecker');
const {getMyposts,createPost,getTimeline,updatePost,deletePost,makeInvisible, makeVisible, likePost, 
    unlikePost, likeComment,getComments,addComment,updateComment,deleteComment,likeComment}=require('../controllers/postControllers')
const {isCreator}=require('../middleware/authorisedUser')

//for now all posts are public

postRouter.get('/',isLoggedin,getMyposts); //get all the posts of the current logged in user
postRouter.get('/timeline',isLoggedin,getTimeline); //get the timeline posts of the current logged in user
postRouter.post('/',isLoggedin,createPost);  //create a post corresponding to the current logged in user
postRouter.put('/:id',isLoggedin,isCreator,updatePost); //update the details of a specific post made by the current logged in user
postRouter.delete('/:id',isLoggedin,isCreator,deletePost); //delete a specific post created by the current logged in user
postRouter.put('/:id/visible',isLoggedin,isCreator,makeVisible); //make the post visible
postRouter.delete('/:id/visible',isLoggedin,isCreator,makeInvisible);//make the post invisible
postRouter.put('/:id/like',isLoggedin,likePost); //like a post
postRouter.delete('/:id/like',isLoggedin,unlikePost); //unlike post

//comment routes
//to be implemented
postRouter.get('/:id/comments',getComments) //get all comments on that post with pagination
postRouter.post('/:id/comments',addComment) //comment on that post
postRouter.put('/:id/comments/:commentid',updateComment) //update a specific comment
postRouter.delete('/:id/comments/:commentid',deleteComment) //delete a comment
postRouter.put('/:id/comments/:commentid/like',likeComment) //like a comment
module.exports=postRouter