const {getClient}=require('../db');
const client=getClient();
const {ObjectId}=require('mongodb');
const { post } = require('../routers/postRoutes');
const { linkWithRedirect } = require('firebase/auth');

const getMyposts= async (req,res)=>{
    const mongodbuserid=req.mongodbuserid;
    try{
        //use aggregation pipeline
        const posts= await client.db('Communityapi').collection('posts').aggregate([{
            $match:{ creator: new ObjectId(mongodbuserid),visible:true}
        },
        {
            $project:{_id:0,title:1,description:1}
        }
    ]).toArray();
        res.status(200).json(posts);
    }
    catch(error){
        console.log(error);
        res.status(501).json({message:"Cant able to get the posts at the moment"})
    }
}

const getTimeline = async (req,res)=>{
    //to be implemented
}

const createPost = async (req,res)=>{
    const mongodbuserid=req.mongodbuserid;
    try{
        const {title,description}=req.body;
        //default visibility of the post will be set to true
        let visible=true;
        if(req.body.visible==="false"){
            visible=false;
        }
        //create new post
        //add conditions to check whether title and description is given or not
        if(title && description){
            await client.db('Communityapi').collection('posts').insertOne({
                title,
                description,
                creator:new ObjectId(mongodbuserid),
                visible
            })
            res.status(200).json({"message":"post created succesfully"})
        }
        else{
            res.status(400).json({"message":"insufficient details"})
        }
    }
    catch(error){
        console.log(error);
        res.status(501).json({message:"Could not create the post"})
    }
}

const updatePost = async (req,res)=>{
    const postId=new ObjectId(req.params.id);
    const updatedFields=req.body;
    try{
        const updatedPost= await client.db('Communityapi').collection('posts').findOneAndUpdate({_id:postId},{
            $set: updatedFields
        },{returnDocument:'after'});
       //to be implemented - return the updated post
        res.status(200).json({message:"Post updated successfully"});
    }
    catch(error){
        console.log(error);
        res.status(501).json({message:"Couldnot update the post - Server side error"})
    }
}

const deletePost = async (req,res)=>{
    const postId=new ObjectId(req.params.id);
    try{
        await client.db('Communityapi').collection('posts').deleteOne({_id:postId});
        res.status(200).json({message:"Post deleted Succesfully"})
    }
    catch(error){
        console.log(error);
        res.status(501).json({message:"Can't delete the post - Server side error"});
    }
}

const makeVisible = async (req,res)=>{
    const postId=new ObjectId(req.params.id);
    try{
        updatedFields={
            visible:true
        }
        await client.db('Communityapi').collection('posts').findOneAndUpdate({_id:postId},{
            $set: updatedFields
        },{returnDocument:'after'});
        res.status(200).json({message:"Unarchived the post"});
    }
    catch(error){
        console.log("error");
        res.status(501).json({message:"Can't update visibility"});
    }
}

const makeInvisible = async (req,res)=>{
    const postId=new ObjectId(req.params.id);
    try{
        updatedFields={
            visible:false
        }
        await client.db('Communityapi').collection('posts').findOneAndUpdate({_id:postId},{
            $set: updatedFields
        },{returnDocument:'after'});
        res.status(200).json({message:"Archived the post"});
    }
    catch(error){
        console.log("error");
        res.status(501).json({message:"Can't update visibility"});
    }
}

const likePost = async (req,res)=>{
    const postId=new ObjectId(req.params.id);
    const mongodbuserid =new ObjectId(req.mongodbuserid);
    try{
        const alreadyLiked=await client.db('Communityapi').collection('likes').findOne({postid:postId,likerid:mongodbuserid});
        if(alreadyLiked){
            res.status(409).json({message:"You already liked the post"});
        }
        else{
            const postObject= await client.db('Communityapi').collection('posts').findOne({
                _id:postId,
            })
            const creatorid= postObject.creator;
            await client.db('Communityapi').collection('likes').insertOne({
                likerid:mongodbuserid,
                postid:postId,
                creatorid:creatorid
            })
            res.status(200).json({message:"You liked the Post"});
        }
    }
    catch(error){
        console.log(error);
        res.status(501).json({message:"Could not like the post"})
    }
}

const unlikePost= async (req,res)=>{
    const postId=new ObjectId(req.params.id);
    const mongodbuserid =new ObjectId(req.mongodbuserid);
    try{
        const liked=await client.db('Communityapi').collection('likes').findOne({postid:postId,likerid:mongodbuserid});
        if(liked){
            await client.db('Communityapi').collection('likes').deleteOne({
                likerid:mongodbuserid,
                postid:postId
            })
            res.status(200).json({message:"You disliked the Post"});
        }
        else{
            res.status(409).json({message:"You didn't like the post"});
        }
    }
    catch(error){
        console.log(error);
        res.status(501).json({message:"Could not unlike the post"})
    }
}
//comments

const getComments=async (req,res)=>{
    
}

const addComment = async (req,res)=>{

}

const updateComment= async (req,res)=>{

}

const deleteComment=async (req,res)=>{

}

const likeComment=async (req,res)=>{

}
module.exports={
    getMyposts,createPost,updatePost,deletePost,getTimeline,makeInvisible,
    makeVisible,likePost,unlikePost,getComments,addComment,updateComment,deleteComment,likeComment
}