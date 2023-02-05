const express=require('express');
const postRouter=express.Router();
const isLoggedin=require('../middleware/tokenChecker');
const {getMyposts,createPost,getTimeline,updatePost,deletePost,makeInvisible, makeVisible, likePost, 
    unlikePost,getComments,addComment,updateComment,deleteComment,likeComment,replyComment,unlikeComment}=require('../controllers/postControllers')
const {isCreator}=require('../middleware/authorisedUser')
const {isCommentator}=require('../middleware/commentatorCheck')
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
postRouter.get('/:id/comments',isLoggedin,getComments) //get all comments on that post with pagination 
postRouter.post('/:id/comment',isLoggedin,addComment) //comment on that post 
postRouter.post('/:id/comments/:commentid/reply',isLoggedin,replyComment) //reply to a specific comment
postRouter.put('/:id/comments/:commentid',isLoggedin,isCommentator,updateComment) //update a specific comment 
postRouter.delete('/:id/comments/:commentid',isLoggedin,isCommentator,deleteComment) //delete a comment 
postRouter.put('/:id/comments/:commentid/like',isLoggedin,likeComment) //like a comment 
postRouter.delete('/:id/comments/:commentid/like',isLoggedin,unlikeComment)//unlike a comment 

module.exports=postRouter