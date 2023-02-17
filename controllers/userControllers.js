const {getClient}=require('../db');
const client=getClient();
const _db=client.db('Communityapi');
const path = require('path')
require('dotenv').config({ path: path.resolve(__dirname, '../.env') })
const {ObjectId}=require('mongodb')
const {sendToWorkerQueue}=require('../rabbitmq/publisher')
const mailQueue=process.env.MAILINGQUEUE
const rewardQueue=process.env.REWARDQUEUE;
const getUser = async (req,res)=>{
    try{
        const username=req.params.username;
        const userInfo= await _db.collection('userInfo').findOne({username:username})
        if(userInfo){
            const {_id,userid,email,mobile,...actualInfo}=userInfo; //mask email and mobile
            return res.status(200).json(actualInfo);
        }
        else{
            return res.status(200).json({message:"No such user exists"})
        }
    }
    catch(error){
        console.log(error);
        return res.status(501).json({message:"Could not find the user - Server error"});
    }
}

const followUser = async (req,res)=>{
    try{
        const username=req.params.username;
        const userInfo= await _db.collection('userInfo').findOne({username:username});
        if(userInfo){
            const guestUserId= userInfo.userid;
            const followerid=req.firebaseuserid
            if(guestUserId===followerid){
                return res.status(400).json({message:"You can't follow yourself"})
            }
            else{
                const alreadyFollowing = await _db.collection('follows').findOne({followerid:followerid,followedid:guestUserId});
                if(alreadyFollowing){
                    return res.status(409).json({message:"You are already following this user"});
                }
                else{
                    const followerObject=await _db.collection('userInfo').findOne({userid:followerid});
                    await _db.collection('follows').insertOne({
                        followerid:followerid, //this user requested to follow the below user
                        followedid:guestUserId, //this user gains a follower
                        follwerusername:followerObject.username,
                        followedAt:new Date()
                    })
                    const guestUserObject=await _db.collection('userInfo').findOne({userid:guestUserId});
                    const guestUsermail=guestUserObject.email
                    //mailing service starts
                    try{
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
                    catch(error){
                        console.log(error);
                        return res.status(200).json({message:"Followed the user - but failed to send mail/credit reward"})
                    }
                }
            }
        }
        else{
           return  res.status(200).json({message:"No such user exists"})
        }
    }
    catch(error){
        console.log(error);
        return res.status(501).json({message:"Could not follow the user - Server error"});
    }
}

const unfollowUser = async (req,res)=>{
    try{
        const username=req.params.username;
        const userInfo= await _db.collection('userInfo').findOne({username:username});
        if(userInfo){
            const guestUserId= userInfo.userid;
            const followerid= req.firebaseuserid;
            const notFollowing = await _db.collection('follows').findOne({followerid:followerid,followedid:guestUserId});
            if(!notFollowing){
                return res.status(409).json({message:"You are already not following this user"});
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
                try{
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
                catch(error){
                    console.log(error);
                    return res.status(200).json({message:"Unfollowed the user - Reward/mail service is down at the moment`"})
                }
            }
        }
        else{
            return res.status(200).json({message:"No such user exists"})
        }
    }
    catch(error){
        console.log(error);
        return res.status(501).json({message:"Could not unfollow the user - Server error"});
    }
}

const updateUser= async (req,res)=>{
    const firebaseuserid=req.firebaseuserid
    try{
        let updatedFields={...req.body,updatedAt:new Date()};
        await _db.collection('userInfo').updateOne({userid:firebaseuserid},{
            $set: updatedFields
        })
        const userEmail=req.email;
        try{
            const data={
                receiver:userEmail,
                body:"Your Profile  has been updated"
            }
            await sendToWorkerQueue(mailQueue,data)
            return res.status(200).json({message:"Your Profile has been updated"})
        }
        catch(error){
            console.log(error);
            return res.status(200).json({message:"Your profile has been updated - but unable to send mai"})
        }
    }
    catch(error){
        console.log(error);
        return res.status(501).json({"message":"Can't update your details - Server error"})
    }
}

const getfollowerCount= async (req,res)=>{
    try{
        const username=req.params.username;
        const userInfo= await _db.collection('userInfo').findOne({username:username});
        if(userInfo){
            const guestUserId= userInfo.userid;
            const followerCount= await _db.collection('follows').countDocuments({followedid:guestUserId});
            return res.status(200).json({"followers": `${followerCount}`});
        }
        else{
            return res.status(200).json({message:"No such user exists"})
        }
    }
    catch(error){
        console.log(error);
        return res.status(501).json({message:"Could not find the number of followers - Server error"});
    }
}

const getStats= async (req,res)=>{
    try{
        const username=req.params.username;
        const userInfo= await _db.collection('userInfo').findOne({username:username});
        if(userInfo){
            const firebaseuserid= userInfo.userid
            const postsCount= await _db.collection('posts').countDocuments({creatorid:firebaseuserid}); //the total number of posts user created
            const likesCount= await _db.collection('postlikes').countDocuments({creatorid:firebaseuserid}); //the total likes user got over all his posts combined
            const commentsCount = await _db.collection('comments').countDocuments({commentatorid:firebaseuserid}); //the total number of comments the user made
            const rewardObject = await _db.collection('rewards').findOne({userid:firebaseuserid})
            let rewards=0;
            if(rewardObject){
                rewards=rewardObject.points
            }
            const data={
                postsCount,likesCount,commentsCount,rewards
            }
            return res.status(200).json(data);
        }
        else{
            return res.status(200).json({message:"No such user exists"})
        }
    }
    catch(error){
        console.log(error);
        return res.status(501).json({message:"Could not find the number of stats - Server error"});
    }
}

const myDetails = async (req,res)=>{
    const firebaseuserid = req.firebaseuserid
    try{
        const myInfo=await _db.collection('userInfo').findOne({userid:firebaseuserid});
        const {_id,userid,...safeInfo}=myInfo;
        return res.status(200).json(safeInfo);
    }
    catch(error){
        console.log(error);
        return res.status(501).json({message:"Could not find your details - Server error"});
    }
}

const getFollowers= async (req,res)=>{
    const firebaseuserid= req.firebaseuserid //logged in users firebaseuserid
    try{
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
            return res.status(404).json({message:"No such user Found"})
        }
    }
    catch(error){
        console.log(error);
        return res.status(501).json({message:"Could not find the followers for this user - Server error"});
    }
}

module.exports ={ getUser,followUser,unfollowUser,updateUser,getfollowerCount,getStats,myDetails,getFollowers};