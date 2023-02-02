const {getClient}=require('../db');
const client=getClient();
const {ObjectId}=require('mongodb')
const getUser = async (req,res)=>{
    try{
        const username=req.params.username;
        const userInfo= await client.db('Communityapi').collection('userInfo').findOne({username:username})
        if(userInfo){
            const {_id,userid,email,mobile,...actualInfo}=userInfo;
            res.status(200).json(actualInfo);
        }
        else{
            res.status(200).json({message:"No such user exists"})
        }
    }
    catch(error){
        console.log(error);
        res.status(501).json({message:"Could not find the user - Server error"});
    }
}

const followUser = async (req,res)=>{
    try{
        const username=req.params.username;
        const userInfo= await client.db('Communityapi').collection('userInfo').findOne({username:username});
        if(userInfo){
            const guestUserId= userInfo._id;
            const followerid= req.mongodbuserid;
            const alreadyFollowing = await client.db('Communityapi').collection('follows').findOne({followerid:followerid,followedid:guestUserId});
            if(alreadyFollowing){
                res.status(409).json({message:"You are already following this user"});
            }
            else{
                await client.db('Communityapi').collection('follows').insertOne({
                    followerid:followerid, //this user requested to follow the below user
                    followedid:guestUserId //this user gains a follower
                })
                res.status(200).json({message:"You are now following the user"})
            }
        }
        else{
            res.status(200).json({message:"No such user exists"})
        }
    }
    catch(error){
        console.log(error);
        res.status(501).json({message:"Could not follow the user - Server error"});
    }
}

const unfollowUser = async (req,res)=>{
    try{
        const username=req.params.username;
        const userInfo= await client.db('Communityapi').collection('userInfo').findOne({username:username});
        if(userInfo){
            const guestUserId= userInfo._id;
            const followerid= req.mongodbuserid;
            const notFollowing = await client.db('Communityapi').collection('follows').findOne({followerid:followerid,followedid:guestUserId});
            if(!notFollowing){
                res.status(409).json({message:"You are already not following this user"});
            }
            else{
                await client.db('Communityapi').collection('follows').deleteOne({
                    followerid:followerid,
                    followedid:guestUserId 
                })
                res.status(200).json({message:"You have unfollowed this user"})
            }
        }
        else{
            res.status(200).json({message:"No such user exists"})
        }
    }
    catch(error){
        console.log(error);
        res.status(501).json({message:"Could not unfollow the user - Server error"});
    }
}

const updateUser= async (req,res)=>{
    //pass
}

const getfollowerCount= async (req,res)=>{
    try{
        const username=req.params.username;
        const userInfo= await client.db('Communityapi').collection('userInfo').findOne({username:username});
        if(userInfo){
            const guestUserId= userInfo._id;
            const followerCount= await client.db('Communityapi').collection('follows').countDocuments({followedid:guestUserId});
            res.status(200).json({"followers": `${followerCount}`});
        }
        else{
            res.status(200).json({message:"No such user exists"})
        }
    }
    catch(error){
        console.log(error);
        res.status(501).json({message:"Could not find the number of followers - Server error"});
    }
}

const getStats= async (req,res)=>{
    //for now we are doing posts count
    try{
        const username=req.params.username;
        const userInfo= await client.db('Communityapi').collection('userInfo').findOne({username:username});
        if(userInfo){
            const mongodbuserid= userInfo._id
            const postsCount= await client.db('Communityapi').collection('posts').countDocuments({creator:mongodbuserid});
            res.status(200).json({"postscount": `${postsCount}`});
        }
        else{
            res.status(200).json({message:"No such user exists"})
        }
    }
    catch(error){
        console.log(error);
        res.status(501).json({message:"Could not find the number of posts - Server error"});
    }
}

const myDetails = async (req,res)=>{
    const mongodbuserid = new ObjectId(req.mongodbuserid);
    try{
        const myInfo=await client.db('Communityapi').collection('userInfo').findOne({_id:mongodbuserid});
        const {_id,...safeInfo}=myInfo;
        res.status(200).json(safeInfo);
    }
    catch(error){
        console.log(error);
        res.status(501).json({message:"ould not find your details - Server error"});
    }
}

module.exports ={ getUser,followUser,unfollowUser,updateUser,getfollowerCount,getStats,myDetails};