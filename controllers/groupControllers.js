const { ObjectId } = require('mongodb');
const {getClient}=require('../db')
const {sendToWorkerQueue}=require('../rabbitmq/publisher')
const client=getClient();
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') })
const _db=client.db(process.env.DBNAME);
const {ExpressError}=require('../utils/customErrorHandler')
const {mybucket}=require('../utils/gcp')

const createGroup = async (req,res)=>{
        const firebaseuserid=req.firebaseuserid
        const {name,bio}=req.body;
        if( name && bio){
            //create  a document with group details
            const insertedGroupAck=await _db.collection('groups').insertOne({
                name,
                bio,
                creatorid:firebaseuserid,
                createdAt:new Date()
            })
            //get the inserted document's id for referencing
            const insertedGroupId=insertedGroupAck.insertedId
            //create a document to maintain creator is also a member of that group
            const userObject= await _db.collection('userInfo').findOne({userid:firebaseuserid});
            const username=userObject.username
            await _db.collection('groupmembers').insertOne({
                username,
                memberid:firebaseuserid,
                groupid:insertedGroupId,
                joinedAt:new Date()
            })
            return res.status(200).json({message:"Group created Succesfully"})
        }
        else{
            throw new ExpressError("Can't create group, Insufficient Details",500)
        }
}
const getAllGroups = async (req,res)=>{
    //see if this needs pagination 
    //displays group name and bio
        const allGroups= await _db.collection('groups').aggregate([
            {
                $match:{}
            },
            {
                $project:{_id:0,name:1,bio:1}
            }
        ]).toArray()
        return res.status(200).json(allGroups)
}

const deleteGroup = async (req,res)=>{
    //to be implemeneted completely
        const firebaseuserid=req.firebaseuserid
        const groupid=ObjectId(req.params.id)
        //this become hectic we have to delete
        // 1. all the posts in the group
        // 2. their likes and comments and the likes of their comments
        //3. change the postlikes and comments,comments likes sections - to contain group id if the post has group id
        //to be implemented - delete the posts likes and comments, comments likes
        await _db.collection('groups').deleteOne({_id:groupid});
        await _db.collection('groupmembers').deleteMany({groupid:groupid}) //delete all the group members
        await _db.collection('posts').deleteMany({groupid:groupid}); //delete all the posts in the group
        await _db.collection('postlikes').deleteMany({groupid:groupid}) //delete likes to the posts
        await _db.collection('comments').deleteMany({groupid:groupid}) //delete comments on the posts
        await _db.collection('commentlikes').deleteMany({groupid:groupid}) //delete likes to the comments
        return res.status(200).json({message:"Deleted the group and related info"})
}

const fetchStats = async (req,res)=>{
    //return name,bio member count,post count of group
        const groupid=ObjectId(req.params.id);
        const groupInfo=await _db.collection('groups').aggregate([
            {
                $match:{
                    groupid:groupid
                }
            },
            {
                $project:{
                    _id:0,name:1,bio:1
                }
            }
        ]).toArray()[0]
        const memberCount= await _db.collection('groupmembers').countDocuments({groupid:groupid});
        const postCount=await _db.collection('posts').countDocuments({groupid:groupid})
        const data={
            ...groupInfo,
            members:memberCount,posts:postCount
        }
        return res.status(200).json(data);
}

const createPost = async (req,res)=>{
        const firebaseuserid=req.firebaseuserid
        const groupid=ObjectId(req.params.id)
        const {title,description}=req.body;
        if(title && description){
            const userObject= await _db.collection('userInfo').findOne({userid:firebaseuserid});
            const username=userObject.username
            await _db.collection('posts').insertOne({
                title,
                description,
                groupid,
                creatorid:firebaseuserid,
                username,
                ingroup:true, //this specifies that this post is restricted in this group
                createdAt:new Date()
            })
            const rewardQueue=process.env.REWARDQUEUE;
            const data={
                type:'credit',
                points:5,
                userid1:firebaseuserid
            }
            await sendToWorkerQueue(rewardQueue,data)
            return res.status(200).json({"message":"Post created succesfully in the group"})
        }
        else{
            throw new ExpressError("Insufficient Details to create a post",400)
        }
   
}

const joinGroup = async (req,res)=>{
        const groupid=ObjectId(req.params.id);
        const firebaseuserid=req.firebaseuserid
        const alreadyMember= await _db.collection('groupmembers').findOne({memberid:firebaseuserid,groupid:groupid});
        if(alreadyMember){
            throw new ExpressError("You are already a member",409)
        }
        else{
            const userObject= await _db.collection('userInfo').findOne({userid:firebaseuserid});
            const username=userObject.username
            await _db.collection('groupmembers').insertOne({
                username,
                memberid:firebaseuserid,
                groupid:groupid,
                joinedAt:new Date()
            })
            return res.status(200).json({message:"You have now joined the group"})
        }
}

const leaveGroup = async (req,res)=>{
        const firebaseuserid=req.firebaseuserid
        const groupid=ObjectId(req.params.id);
        const isMember=await _db.collection('groupmembers').findOne({
            memberid:firebaseuserid,
            groupid:groupid
        })
        if(isMember){
            await _db.collection('groupmembers').deleteOne({
                memberid:firebaseuserid,
                groupid:groupid
            })
            return res.status(200).json({message:"You have now left the group"})
        }
        else{
            throw new ExpressError("You are not a member of this group",409)
        }
}

const fetchMembers = async (req,res)=>{
    //fetch the usernames of the group members
        const groupid=ObjectId(req.params.id);
        const members= await _db.collection('groupmembers').aggregate([
            {
                $match:{groupid:groupid}
            },
            {
                $project:{_id:0,username:1}
            }
        ]).toArray();
        return res.status(200).json(members);
}

const getTimeline = async (req,res)=>{
        const groupid=ObjectId(req.params.id);
        const timelinePosts=await _db.collection('posts').aggregate([
            {
                $match:{groupid:groupid}
            },
            {
                $sort:{createdAt:-1,updatedAt:-1}
            },
            {
                $project:{_id:0,title:1,description:1}
            }
        ]).toArray()
        return res.status(200).json(timelinePosts);
}

const updateGroup = async (req,res)=>{
        const groupid=ObjectId(req.params.id)
        const updatedFields=req.body;
        await _db.collection('groups').updateOne({_id:groupid},
            {$set: updatedFields}
        )
        return res.status(200).json({message:"Updated group details"})
}


const updateDisplayPicture = async (req,res)=>{
    if(!req.file){
        throw new ExpressError("Missing file to upload",400);       
    }
    const options={
        destination:req.file.filename, //name of the file with which we want our uploaded file to store with- basically the name of the file in bucket
        preconditionOpts:{ifGenerationMatch:0}
    }
    const output=await mybucket.upload(req.file.path,options);
    const publicURL=`https://storage.googleapis.com/${output[0].metadata.bucket}/${req.file.filename}`
    const groupid= ObjectId(req.params.id);
    const updatedFields={
        displaypic:publicURL,
        updatedAt:new Date()
    }
    await _db.collection('groups').updateOne({_id:groupid},
        {
            $set:updatedFields
        })
    return res.status(200).json({message:"Display picture updated"})
}

const updateBackgroundPicture = async (req,res)=>{
    if(!req.file){
        throw new ExpressError("Missing file to upload",400);
    }
    const options={
        destination:req.file.filename, //name of the file with which we want our uploaded file to store with- basically the name of the file in bucket
        preconditionOpts:{ifGenerationMatch:0}
    }
    const output=await mybucket.upload(req.file.path,options);
    const publicURL=`https://storage.googleapis.com/${output[0].metadata.bucket}/${req.file.filename}`
    const groupid= ObjectId(req.params.id);
    const updatedFields={
        backgroundpic:publicURL,
        updatedAt:new Date()
    }
    await _db.collection('groups').updateOne({_id:groupid},
    {
        $set:updatedFields
    })
    return res.status(200).json({message:"Background picture updated"})
}

const addUser = async (req,res)=>{
    const groupid=ObjectId(req.params.id);
    const username=req.params.username
    const alreadyMember= await _db.collection('groupmembers').findOne({groupid:groupid,username:username});
    if(alreadyMember){
        throw ExpressError("User is already a member of this group",403)
    }
    const userObject=await _db.collection('userInfo').findOne({username:username});
    if(!userObject){
        throw  new ExpressError("User doesn't Exists",404);
    }
    const firebaseuserid=userObject.userid
    await _db.collection('groupmembers').insertOne({
        groupid,
        username,
        memberid:firebaseuserid,
        joinedAt:new Date()
    })
    res.status(200).json({"message":"User is added to the group"})
}

const removeUser = async (req,res)=>{
    const groupid=ObjectId(req.params.id);
    const username=req.params.username
    const userObject=await _db.collection('userInfo').findOne({username:username});
    if(!userObject){
        throw  new ExpressError("User doesn't Exists",404);
    }
    const isMember=await _db.collection('groupmembers').findOne({groupid:groupid,username:username});
    if(isMember){
        await _db.collection('groupmembers').deleteOne({username:username})
        return res.status(200).json({message:"User is removed from the group"})
    }
    else{
        throw new ExpressError("User is not a member of this group in the first place",403)
    }
}
module.exports = { createGroup,updateGroup,getAllGroups,deleteGroup,fetchStats,createPost,
    joinGroup,leaveGroup,fetchMembers,getTimeline, updateDisplayPicture,updateBackgroundPicture, addUser, removeUser}