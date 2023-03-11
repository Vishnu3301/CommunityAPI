const express=require('express');
const postRouter=express.Router();
const {isLoggedin}=require('../middleware/isAuthenticated');
const {getMyposts,createPost,getTimeline,updatePost,deletePost,makeInvisible, makeVisible, likePost, 
    unlikePost,getComments,addComment,updateComment,deleteComment,likeComment,replyComment,unlikeComment, attachFiles, getReplies}=require('../controllers/postControllers')
const {isCreator}=require('../middleware/isPostCreator')
const {isCommentator}=require('../middleware/isCommentator');
const { multerAttachmentFileUploader } = require('../utils/multerUploader');
const {wrapAsync}=require('../utils/asyncErrorHandler')
postRouter.get('/',isLoggedin,wrapAsync(getMyposts)); //get all the posts of the current logged in user
postRouter.get('/timeline',isLoggedin,wrapAsync(getTimeline)); //get the timeline posts of the current logged in user
postRouter.post('/',isLoggedin,wrapAsync(createPost));  //create a post corresponding to the current logged in user
postRouter.put('/:id',isLoggedin,isCreator,wrapAsync(updatePost)); //update the details of a specific post made by the current logged in user
postRouter.put('/:id/visible',isLoggedin,isCreator,wrapAsync(makeVisible)); //make the post visible
postRouter.put('/:id/like',isLoggedin,wrapAsync(likePost)); //like a post
postRouter.put('/:id/attatch',isLoggedin,isCreator,multerAttachmentFileUploader,wrapAsync(attachFiles)) //attach files to a post
postRouter.delete('/:id',isLoggedin,isCreator,wrapAsync(deletePost)); //delete a specific post created by the current logged in user
postRouter.delete('/:id/visible',isLoggedin,isCreator,wrapAsync(makeInvisible));//make the post invisible
postRouter.delete('/:id/like',isLoggedin,wrapAsync(unlikePost)); //unlike post

//comment routes
postRouter.get('/:id/comments',isLoggedin,wrapAsync(getComments)) //get all comments on that post with pagination 
postRouter.get('/:id/comments/:commentid/replies',isLoggedin,wrapAsync(getReplies))
postRouter.post('/:id/comments',isLoggedin,wrapAsync(addComment)) //comment on that post 
postRouter.post('/:id/comments/:commentid/reply',isLoggedin,wrapAsync(replyComment)) //reply to a specific comment
postRouter.put('/:id/comments/:commentid',isLoggedin,isCommentator,wrapAsync(updateComment)) //update a specific comment 
postRouter.delete('/:id/comments/:commentid',isLoggedin,isCommentator,wrapAsync(deleteComment)) //delete a comment 
postRouter.put('/:id/comments/:commentid/like',isLoggedin,wrapAsync(likeComment)) //like a comment 
postRouter.delete('/:id/comments/:commentid/like',isLoggedin,wrapAsync(unlikeComment))//unlike a comment 

module.exports={postRouter}