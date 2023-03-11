const { ObjectId } = require('mongodb');
const {getClient}=require('../db');
const client=getClient();
const _db=client.db(process.env.DBNAME);
const isCreator=async (req,res,next)=>{
    const postId=new ObjectId(req.params.id); //get the post id passed in parameters
    const firebaseuserid=req.firebaseuserid
    try{
        let postObject=await _db.collection('posts').findOne({_id:postId}) //find the post document
        if(!postObject){
            return res.status(404).json({message:"Post not found"})
        }
        if(postObject){
            if(postObject.creatorid===firebaseuserid){
                next();
            }
            else{
                //the user who is requesting either delete or update for this post is not the creator of it
                return res.status(401).json({message:"User not authorized to do this operation - You are not the creator of the post"})
            }
        }
        else{
            return res.status(409).json({message:"Post doesnot exist anymore"})
        }
    }
    catch(error){
        return res.status(501).json({message:"Server side error"})
    }
}

module.exports ={ isCreator }