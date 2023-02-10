const { ObjectId } = require('mongodb');
const {getClient}=require('../db');
const client=getClient();
const _db=client.db('Communityapi');
const isCommentator=async (req,res,next)=>{
    const commentId=new ObjectId(req.params.commentid)
    const firebaseuserid=req.firebaseuserid 
    try{
        const commentObject=await _db.collection('comments').findOne({_id:commentId}) //find the post document
        if(commentObject.commentatorid===firebaseuserid){
            next();
        }
        else{
            //the user who is requesting either delete or update for this post is not the creator of it
            return res.status(401).json({message:"User not authorized to do this operation - You are not the creator of the comment"})
        }
    }
    catch(error){
        console.log(error);
        return res.status(501).json({message:"Server side error"})
    }
}

module.exports ={ isCommentator }