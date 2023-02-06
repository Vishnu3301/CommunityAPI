const {getClient}=require('../db');
const client=getClient();
const _db=client.db('Communityapi');
const {ObjectId}=require('mongodb')
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
                        follwerusername:followerObject.username
                    })
                    return res.status(200).json({message:"You are now following the user"})
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
                await _db.collection('follows').deleteOne({
                    followerid:followerid,
                    followedid:guestUserId 
                })
                return res.status(200).json({message:"You have unfollowed this user"})
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
        const updatedFields=req.body;
        const ans=await _db.collection('userInfo').updateOne({userid:firebaseuserid},{
            $set: updatedFields
        })
        return res.status(200).json({message:"Updated your Info"})
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
            const postsCount= await _db.collection('posts').countDocuments({creator:firebaseuserid}); //the total number of posts user created
            const likesCount= await _db.collection('postlikes').countDocuments({creatorid:firebaseuserid}); //the total likes user got over all his posts combined
            const commentsCount = await _db.collection('comments').countDocuments({commentatorid:firebaseuserid}); //the total number of comments the user made
            return res.status(200).json({"postscount": `${postsCount}`,"likescount":`${likesCount}`,"commentscount":`${commentsCount}`});
        }
        else{
            return res.status(200).json({message:"No such user exists"})
        }
    }
    catch(error){
        console.log(error);
        return res.status(501).json({message:"Could not find the number of posts - Server error"});
    }
}

const myDetails = async (req,res)=>{
    const firebaseuserid = req.firebaseuserid
    try{
        const myInfo=await _db.collection('userInfo').findOne({user:firebaseuserid});
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
    catch(error){
        console.log(error);
        return res.status(501).json({message:"Could not find the followers for this user - Server error"});
    }
}

module.exports ={ getUser,followUser,unfollowUser,updateUser,getfollowerCount,getStats,myDetails,getFollowers};