const {getClient}=require('../db');
const client=getClient();
const {ObjectId}=require('mongodb');

const getMyposts= async (req,res)=>{
    const mongodbuserid=req.mongodbuserid;
    console.log(mongodbuserid);
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
        await client.db('Communityapi').collection('posts').insertOne({
            title,
            description,
            creator:new ObjectId(mongodbuserid),
            visible
        })
        res.status(200).json({"message":"post created succesfully"})
    }
    catch(error){
        console.log(error);
        res.status(501).json({message:"Could not create the post"})
    }
}

const updatePost = async (req,res)=>{
    //to be implemented
}

const deletePost = async (req,res)=>{
    //to be implemented
}

module.exports={
    getMyposts,createPost,updatePost,deletePost,getTimeline
}