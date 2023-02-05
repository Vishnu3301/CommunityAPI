const { ObjectId } = require('mongodb');
const {getClient}=require('../db');
const client=getClient();
const isCommentator=async (req,res,next)=>{
    const commentId=new ObjectId(req.params.commentid)
    const mongodbuserid=new ObjectId(req.mongodbuserid); 
    try{
        const commentObject=await client.db('Communityapi').collection('comments').findOne({_id:commentId}) //find the post document
        if(commentObject.commentatorid.equals(mongodbuserid)){
            next();
        }
        else{
            //the user who is requesting either delete or update for this post is not the creator of it
            res.status(401).json({message:"User not authorized to do this operation - You are not the creator of the comment"})
        }
    }
    catch(error){
        console.log(error);
        res.status(501).json({message:"Server side error"})
    }
}

module.exports ={ isCommentator }