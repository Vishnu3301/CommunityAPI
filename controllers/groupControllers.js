const { ObjectId } = require('mongodb');
const {getClient}=require('../db')
const client=getClient();
const _db=client.db('Communityapi');

const createGroup = async (req,res)=>{
    try{
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
                userid:firebaseuserid,
                groupid:insertedGroupId,
                joinedAt:new Date()
            })
            return res.status(200).json({message:"Group created Succesfully"})
        }
        else{
            return res.status(400).json({message:"Insufficient details"})
        }
    }
    catch(error){
        console.log(error);
        return res.status(501).json({message:"Can't create group - Server side error"})
    }
}
const getAllGroups = async (req,res)=>{
    //see if this needs pagination 
    //displays group name and bio
    try{
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
    catch(error){
        console.log(error);
        return res.status(501).json({message:"Can't get all the groups - Server side error"})
    }
}

const deleteGroup = async (req,res)=>{
    //to be implemeneted completely
    try{
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
    catch(error){
        console.log(error);
        return res.status(501).json({message:"Can't delete the group - Server Side error"})
    }
}

const fetchStats = async (req,res)=>{
    //return name,bio member count,post count of group
    try{
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
    catch(error){
        console.log(error);
        return res.status(501).json({message:"Can't get stats of this group - Server side error"})
    }
}

const createPost = async (req,res)=>{
    try{
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
            return res.status(200).json({message:"Created a post in this group"})
        }
    }
    catch(error){
        console.log(error);
        return res.status(501).json({message:"can't create a post in this group - server side error"})
    }
}

const joinGroup = async (req,res)=>{
    try{
        const groupid=ObjectId(req.params.id);
        const firebaseuserid=req.firebaseuserid
        const alreadyMember= await _db.collection('groupmembers').findOne({userid:firebaseuserid,groupid:groupid});
        if(alreadyMember){
            return res.status(403).json({message:"You are already a member of this group"})
        }
        else{
            const userObject= await _db.collection('userInfo').findOne({userid:firebaseuserid});
            const username=userObject.username
            await _db.collection('groupmembers').insertOne({
                username,
                userid:firebaseuserid,
                groupid:groupid,
                joinedAt:new Date()
            })
            return res.status(200).json({message:"You have now joined the group"})
        }
    }
    catch(error){
        console.log(error);
        return res.status(501).json({message:"Can't join the group - Server side error"})
    }
}

const leaveGroup = async (req,res)=>{
    try{
        const firebaseuserid=req.firebaseuserid
        const groupid=ObjectId(req.params.id);
        const isMember=await _db.collection('groupmembers').findOne({
            userid:firebaseuserid,
            groupid:groupid
        })
        if(isMember){
            await _db.collection('groupmembers').deleteOne({
                userid:firebaseuserid,
                groupid:groupid
            })
            return res.status(200).json({message:"You have now left the group"})
        }
        else{
            return res.status(409).json({message:"You are not a member of this group"})
        }
    }
    catch(error){
        console.log(error);
        return res.status(501).json({message:"Can't leave the group - Server side error"})
    }
}

const fetchMembers = async (req,res)=>{
    //fetch the usernames of the group members
    try{
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
    catch(error){
        console.log(error);
        return res.status(501).json({message:"Can't fetch members for this group - Server side error"})
    }
}

const getTimeline = async (req,res)=>{
    //to be implemented
}

const updateGroup = async (req,res)=>{
    try{
        const groupid=ObjectId(req.params.id)
        const updatedFields=req.body;
        await _db.collection('groups').updateOne({_id:groupid},
            {$set: updatedFields}
        )
        return res.status(200).json({message:"Updated group details"})
    }
    catch(error){
        console.log(error);
        return res.status(501).json({message:"Can't update group details"})
    }
}


module.exports = { createGroup,updateGroup,getAllGroups,deleteGroup,fetchStats,createPost,
    joinGroup,leaveGroup,fetchMembers,getTimeline }