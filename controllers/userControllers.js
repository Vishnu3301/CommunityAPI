const {getClient}=require('../db');
const client=getClient();
const path = require('path')
require('dotenv').config({ path: path.resolve(__dirname, '../.env') })
const _db=client.db(process.env.DBNAME);
const {ObjectId}=require('mongodb')
const {sendToWorkerQueue}=require('../rabbitmq/publisher');
// const { cloudinary } = require('../utils/cloudinary');
const mailQueue=process.env.MAILINGQUEUE
const rewardQueue=process.env.REWARDQUEUE;
const {ExpressError}=require('../utils/customErrorHandler');
const { mybucket } = require('../utils/gcp');

const getUser = async (req,res)=>{
    const username=req.params.username;
    const userInfo= await _db.collection('userInfo').findOne({username:username})
    if(userInfo){
        const {_id,userid,email,mobile,...actualInfo}=userInfo; //mask email and mobile
        return res.status(200).json(actualInfo);
    }
    else{
        throw new ExpressError("No such user exists",404)
    }
}

const followUser = async (req,res)=>{
    const username=req.params.username;
    const userInfo= await _db.collection('userInfo').findOne({username:username});
    if(userInfo){
        const guestUserId= userInfo.userid;
        const followerid=req.firebaseuserid
        if(guestUserId===followerid){
            throw new ExpressError("You cannot follow yourself",409)
        }
        else{
            const alreadyFollowing = await _db.collection('follows').findOne({followerid:followerid,followedid:guestUserId});
            if(alreadyFollowing){
                throw new ExpressError("You are already following this user",409)
            }
            else{
                const followerObject=await _db.collection('userInfo').findOne({userid:followerid});
                const followerEmail=req.email;
                await _db.collection('follows').insertOne({
                    followerid:followerid, //this user requested to follow the below user
                    followedid:guestUserId, //this user gains a follower
                    follwerusername:followerObject.username,
                    followeremail:followerEmail,
                    followedAt:new Date()
                })
                const guestUserObject=await _db.collection('userInfo').findOne({userid:guestUserId});
                const guestUsermail=guestUserObject.email
                //mailing service starts
                const points=2,userid1=followerid,userid2=guestUserId,type='credit'
                const reward={type,points,userid1,userid2};
                const data={
                    receiver:guestUsermail,
                    body:`${followerObject.username} just followed you`
                }
                await sendToWorkerQueue(mailQueue,data)
                await sendToWorkerQueue(rewardQueue,reward)
                return res.status(200).json({message:"You followed the user"});
                
            }
        }
    }
    else{
        throw new ExpressError("No such user exists",404)
    }
}

const unfollowUser = async (req,res)=>{
        const username=req.params.username;
        const userInfo= await _db.collection('userInfo').findOne({username:username});
        if(userInfo){
            const guestUserId= userInfo.userid;
            const followerid= req.firebaseuserid;
            const notFollowing = await _db.collection('follows').findOne({followerid:followerid,followedid:guestUserId});
            if(!notFollowing){
                throw new ExpressError("You are already not following this user",409)
            }
            else{
                const followerObject=await _db.collection('userInfo').findOne({userid:followerid});
                await _db.collection('follows').deleteOne({
                    followerid:followerid,
                    followedid:guestUserId 
                })
                const guestUserObject=await _db.collection('userInfo').findOne({userid:guestUserId});
                const guestUsermail=guestUserObject.email
                //mailing service starts
                const data={
                    receiver:guestUsermail,
                    body:`${followerObject.username} unfollowed you`
                }
                const type='debit',points=2,userid1=followerid,userid2=guestUserId
                const reward={type,points,userid1,userid2}
                await sendToWorkerQueue(mailQueue,data)
                await sendToWorkerQueue(rewardQueue,reward)
                return res.status(200).json({message:"You unfollowed the user"});
                
            }
        }
        else{
            throw new ExpressError("No Such user exists",404)
        }
}

const updateUser= async (req,res)=>{
    const firebaseuserid=req.firebaseuserid
    let updatedFields={...req.body,updatedAt:new Date()};
    
    if(updatedFields.username){
        const {username}=updatedFields;
        const userObject=await _db.collection('userInfo').findOne({userid:firebaseuserid});
        const previousUsername=userObject.username
        const usernameTaken=await _db.collection('userInfo').findOne({username:username})
        if(usernameTaken && previousUsername!=username){
            throw new ExpressError("Username is already taken",403)
        }
    }
    await _db.collection('userInfo').updateOne({userid:firebaseuserid},{
        $set: updatedFields
    })
    const userEmail=req.email;
    const data={
        receiver:userEmail,
        body:"Your Profile  has been updated"
    }
    await sendToWorkerQueue(mailQueue,data)
    return res.status(200).json({message:"Your Profile has been updated"})
}

const getfollowerCount= async (req,res)=>{
    const username=req.params.username;
    const userInfo= await _db.collection('userInfo').findOne({username:username});
    if(userInfo){
        const guestUserId= userInfo.userid;
        const followerCount= await _db.collection('follows').countDocuments({followedid:guestUserId});
        return res.status(200).json({"followers": `${followerCount}`});
    }
    else{
        throw new ExpressError("No such user exists",404)
    }
}

const getStats= async (req,res)=>{
    const username=req.params.username;
    const userInfo= await _db.collection('userInfo').findOne({username:username});
    if(userInfo){
        const firebaseuserid= userInfo.userid
        const postsCount= await _db.collection('posts').countDocuments({creatorid:firebaseuserid}); //the total number of posts user created
        const likesCount= await _db.collection('postlikes').countDocuments({creatorid:firebaseuserid}); //the total likes user got over all his posts combined
        const commentsCount = await _db.collection('comments').countDocuments({commentatorid:firebaseuserid}); //the total number of comments the user made
        const rewardObject = await _db.collection('rewards').findOne({userid:firebaseuserid}); //get the rewards for the user
        const followers= await _db.collection('follows').countDocuments({followedid:firebaseuserid}) // get the followers count of the user
        let rewards=0;
        if(rewardObject){
            rewards=rewardObject.points
        }
        const data={
            postsCount,likesCount,commentsCount,rewards,followers
        }
        return res.status(200).json(data);
    }
    else{
        throw new ExpressError("No such user exists",404)
    }
}

const myDetails = async (req,res)=>{
    const firebaseuserid = req.firebaseuserid
    const myInfo=await _db.collection('userInfo').findOne({userid:firebaseuserid});
    const {_id,userid,...safeInfo}=myInfo;
    return res.status(200).json(safeInfo);
}

const getFollowers= async (req,res)=>{
    const {page=1,limit:followersPerPage=5} = req.query
    const username=req.params.username;
    const userObject= await _db.collection('userInfo').findOne({username:username});
    if(userObject){
        const userId=userObject.userid;
        const followers=await _db.collection('follows').aggregate([
            {
                $match:{followedid:userId}
            },
            {
                $skip: parseInt((page-1)*followersPerPage)
            },
            {
                $limit:parseInt(followersPerPage)
            },
            {
                $project:{_id:0,follwerusername:1}
            }
        ]).toArray();
        return res.status(200).json(followers);
    }
    else{
        throw new ExpressError("No such user exists",404)
    }
}


const updateDisplayPicture = async (req,res)=>{
    if(!req.file){
        throw new ExpressError("Missing Image to set as display picture",400) 
    }
    const options={
        destination:req.file.filename, //name of the file with which we want our uploaded file to store with- basically the name of the file in bucket
        preconditionOpts:{ifGenerationMatch:0}
    }
    const output=await mybucket.upload(req.file.path,options);
    const publicURL=`https://storage.googleapis.com/${output[0].metadata.bucket}/${req.file.filename}`
    const updatedFields={
        displaypic:publicURL,
        updatedAt:new Date()
    }
    const firebaseuserid=req.firebaseuserid
    await _db.collection('userInfo').updateOne({userid:firebaseuserid},{
        $set:updatedFields
    });
    const userEmail=req.email
    const data={
        receiver:userEmail,
        body:"Your Display Picture has been updated"
    }
    await sendToWorkerQueue(mailQueue,data)
    return res.status(200).json({message:"Display picture updated"})
}

const updateBackgroundPicture = async (req,res)=>{
    if(!req.file){
        throw new ExpressError("Missing Image to set as background picture",400) 
    }
    const options={
        destination:req.file.filename, //name of the file with which we want our uploaded file to store with- basically the name of the file in bucket
        preconditionOpts:{ifGenerationMatch:0}
    }
    const output=await mybucket.upload(req.file.path,options);
    const publicURL=`https://storage.googleapis.com/${output[0].metadata.bucket}/${req.file.filename}`
    const updatedFields={
        backgroundpic:publicURL,
        updatedAt:new Date()
    }
    const firebaseuserid=req.firebaseuserid
    await _db.collection('userInfo').updateOne({userid:firebaseuserid},{
        $set:updatedFields
    });
    const userEmail=req.email
    const data={
        receiver:userEmail,
        body:"Your Background Picture has been updated"
    }
    await sendToWorkerQueue(mailQueue,data)
    return res.status(200).json({message:"Background picture updated"})
}

module.exports ={ getUser,followUser,unfollowUser,updateUser,getfollowerCount,getStats,myDetails,getFollowers,updateDisplayPicture, updateBackgroundPicture};