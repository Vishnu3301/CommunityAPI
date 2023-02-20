const {getClient}=require('../db');
const client=getClient();
const path = require('path')
require('dotenv').config({ path: path.resolve(__dirname, '../.env') })
const {ObjectId}=require('mongodb');
const {sendToWorkerQueue}=require('../rabbitmq/publisher')
const _db=client.db(process.env.DBNAME);
const mailQueue=process.env.MAILINGQUEUE
const rewardQueue=process.env.REWARDQUEUE;
const getMyposts= async (req,res)=>{
    const firebaseuserid=req.firebaseuserid;
    try{
        //sorting to be implemented
        const {page=1,limit:postsPerPage=5} = req.query
        const posts= await _db.collection('posts').aggregate([{
            $match:{ creatorid: firebaseuserid,visible:true}
        },
        {
            $sort:{createdAt:-1} //for now the default sorting is  by created date -desc
        },
        {
            $skip:parseInt((page-1)*postsPerPage)
        },
        {
            $limit:parseInt(postsPerPage)
        },
        {
            $project:{_id:0,title:1,description:1}
        }
    ]).toArray();
        return res.status(200).json(posts);
    }
    catch(error){
        console.log(error);
        return res.status(501).json({message:"Cant able to get the posts at the moment"})
    }
}

const getTimeline = async (req,res)=>{
    //to be implemented
}

//creating post by this method means  the post is public and can be viewed by anyone
//add 3 points reward
const createPost = async (req,res)=>{
    const firebaseuserid=req.firebaseuserid;
    try{
        const {title,description}=req.body;
        //default visibility of the post will be set to true
        let visible=true;
        if(req.body.visible==="false"){
            visible=false;
        }
        //create new post
        //conditions to check whether title and description is given or not
        if(title && description){
            const userObject= await _db.collection('userInfo').findOne({userid:firebaseuserid});
            const username=userObject.username
            await _db.collection('posts').insertOne({
                title,
                description,
                creatorid:firebaseuserid,
                visible,
                username,
                ingroup:false,
                createdAt:new Date()
            })
            try{
                const data={
                    type:'credit',
                    points:3,
                    userid1:firebaseuserid
                }
                await sendToWorkerQueue(rewardQueue,data)
                return res.status(200).json({"message":"post created succesfully"})
            }
            catch(error){
                console.log(error);
                return res.status(200).json({message:"Post created - Reward service is down at the moment"})
            }
        }
        else{
            return res.status(400).json({"message":"Insufficient details"})
        }
    }
    catch(error){
        console.log(error);
        return res.status(501).json({message:"Could not create the post"})
    }
}

const updatePost = async (req,res)=>{
    const postId=new ObjectId(req.params.id);
    let updatedFields=req.body;
    updatedFields={...updatedFields,updatedAt:new Date(),updaterid:req.firebaseuserid} //for now only the post creator can update the post
    try{
        const updatedPost= await _db.collection('posts').findOneAndUpdate({_id:postId},{
            $set: updatedFields
        },{returnDocument:'after'});
       //to be implemented - return the updated post
       return res.status(200).json({message:"Post updated successfully"});
    }
    catch(error){
        console.log(error);
        return res.status(501).json({message:"Couldnot update the post - Server side error"})
    }
}

const deletePost = async (req,res)=>{
    const postId=new ObjectId(req.params.id);
    try{
        const postObject= await _db.collection('posts').findOne({_id:postId})
        await _db.collection('posts').deleteOne({_id:postId}); //delete the post
        await _db.collection('postlikes').deleteMany({postid:postId}) //delete the likes associated with the posts
        await _db.collection('comments').deleteMany({postid:postId}) //delete the comments associated with the post
        await _db.collection('commentlikes').deleteMany({postid:postId}) //delete the comment likes stored in different collection
        //when user deletes the post the credits regarding the post is only deleted
        try{
            const firebaseuserid=req.firebaseuserid
            const type='debit',points=3,userid1=firebaseuserid
            if(postObject.ingroup){
                points=5;
            }
            const reward={type,points,userid1}
            await sendToWorkerQueue(rewardQueue,reward)
            return res.status(200).json({message:"You deleted the post"})
        }
        catch(error){
            console.log(error);
            return res.status(200).json({message:"You deleted the post - Reward service is down at the moment"})
        }
    }
    catch(error){
        console.log(error);
        return res.status(501).json({message:"Can't delete the post - Server side error"});
    }
}

const makeVisible = async (req,res)=>{
    const postId=new ObjectId(req.params.id);
    try{
        updatedFields={
            visible:true
        }
        await _db.collection('posts').findOneAndUpdate({_id:postId},{
            $set: updatedFields
        },{returnDocument:'after'});
        return res.status(200).json({message:"Unarchived the post"});
    }
    catch(error){
        console.log("error");
        return res.status(501).json({message:"Can't update visibility"});
    }
}

const makeInvisible = async (req,res)=>{
    const postId=new ObjectId(req.params.id);
    try{
        updatedFields={
            visible:false
        }
        await _db.collection('posts').findOneAndUpdate({_id:postId},{
            $set: updatedFields
        },{returnDocument:'after'});
        return res.status(200).json({message:"Archived the post"});
    }
    catch(error){
        console.log("error");
        return res.status(501).json({message:"Can't update visibility"});
    }
}

const likePost = async (req,res)=>{
    const postId=new ObjectId(req.params.id);
    const firebaseuserid =req.firebaseuserid
    try{
        const alreadyLiked=await _db.collection('postlikes').findOne({postid:postId,likerid:firebaseuserid});
        if(alreadyLiked){
            res.status(409).json({message:"You already liked the post"});
        }
        else{
            const postObject= await _db.collection('posts').findOne({
                _id:postId,
            })
            const creatorid= postObject.creatorid;
            const receiverObject=await _db.collection('userInfo').findOne({userid:creatorid})
            const likerObject= await _db.collection('userInfo').findOne({userid:firebaseuserid})
            const likerUsername=likerObject.username //get likers username to memtion in mail
            const receiverEmail=receiverObject.email //get post creator's email id to send email
            await _db.collection('postlikes').insertOne({
                likerid:firebaseuserid,
                postid:postId,
                creatorid:creatorid
            })
            if(firebaseuserid!==creatorid){
                try{
                    const points=1,userid1=firebaseuserid,userid2=creatorid,type='credit';
                    const reward={type,points,userid1,userid2}
                    const data={
                        receiver:receiverEmail,
                        body:`${likerUsername} just Liked your Post`
                    }
                    await sendToWorkerQueue(mailQueue,data)
                    await sendToWorkerQueue(rewardQueue,reward)
                    return res.status(200).json({message:"You liked the Post"});
                }
                catch(error){
                    console.log(error);
                    return res.status(200).json({message:"Liked the post - but failed to send mail/credit reward"})
                }
            }
            return res.status(200).json({message:"You liked the Post"});
        }
    }
    catch(error){
        console.log(error);
        res.status(501).json({message:"Could not like the post"})
    }
}

const unlikePost= async (req,res)=>{
    const postId=new ObjectId(req.params.id);
    const firebaseuserid =req.firebaseuserid
    try{
        const liked=await _db.collection('postlikes').findOne({postid:postId,likerid:firebaseuserid});
        if(liked){
            await _db.collection('postlikes').deleteOne({
                likerid:firebaseuserid,
                postid:postId
            })
            try{
                const postObject=await _db.collection('posts').findOne({_id:postId});
                const creatorId=postObject.creatorid
                const type='debit',points=1,userid1=firebaseuserid,userid2=creatorId
                const reward={type,points,userid1,userid2};
                await sendToWorkerQueue(rewardQueue,reward)
                return res.status(200).json({message:"You disliked the post - rewards debited"})
            }
            catch(error){
                console.log(error);
                return res.status(200).json({message:"You disliked the post - reward service is down at the moment"})
            }
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
    const postId= new ObjectId(req.params.id);
    //for now , this gets all comments on the post (not the replies just the comments- parent comments)
    //pagination and sort to be implemented
    try{
        const comments=await _db.collection('comments').aggregate([
            {
                $match:{postid:postId,onpost:true}
            }
            ,
            {
                $project:{_id:0,commentatorid:0,postid:0,onpost:0}
            },
            {
                $sort:{createdAt:-1,updatedAt:-1}
            }
        ]).toArray();
        res.status(200).json(comments);
    }
    catch(error){
        console.log(error);
        res.status(501).json({message:"Can't get the comments at the moment"})
    }
}

const addComment = async (req,res)=>{
    const firebaseuserid=req.firebaseuserid
    const postId=new ObjectId(req.params.id);
    const text=req.body.text
    try{
        const userObject=await _db.collection('userInfo').findOne({userid:firebaseuserid});
        const username=userObject.username; //user name of the liker
        const postObject= await _db.collection('posts').findOne({_id:postId})
        const postCreatorId=postObject.creatorid
        let newDocument={
            postid:postId, //this is the post id the user is commenting on
            creatorid:postCreatorId,//id of user created the post
            commentatorid:firebaseuserid, //this is the id of user that is commenting
            onpost:true,//this signifies that the comment is directly on the post and not a reply to any comment on that post
            username:username,
            text:text,
            createdAt:new Date()
        }
        const groupid=postObject.groupid
        if(groupid){
            newDocument={...newDocument,groupid:groupid}
        }
        await _db.collection('comments').insertOne(newDocument)
        if(firebaseuserid!==postCreatorId){
            const postCreatorObject= await _db.collection('userInfo').findOne({userid:postCreatorId})
            const creatorEmail=postCreatorObject.email
            try{
                const points=1; //points for reward
                const userid1=firebaseuserid; 
                const userid2=postCreatorId
                const type='credit' //type of reward
                const reward={
                    type,
                    points,
                    userid1,
                    userid2
                }
                const mailData={
                    receiver:creatorEmail,
                    body:`${username} just commented on your post`
                }
                await sendToWorkerQueue(mailQueue,mailData) //to mailingqueue
                await sendToWorkerQueue(rewardQueue,reward) //to reward queue
                return res.status(200).json({message:"Commented Succesfully"})
            }
            catch(error){
                console.log(error);
                return res.status(200).json({message:"Commented Succesfully - but unable to send mail/reward failed"})
            }
        }
        return res.status(200).json({message:'Commented Succesfully'})
    }
    catch(error){
        console.log(error);
        return res.status(501).json({message:"Can't commment on the post  - Server error"})
    }
}

const updateComment= async (req,res)=>{
    const postId=new ObjectId(req.params.id);
    const commentid=new ObjectId(req.params.commentid)
    let updatedComment={...req.body,updatedAt:new Date(),updaterid:req.firebaseuserid};
    try{
        await _db.collection('comments').updateOne({_id:commentid,postid:postId},{
            $set:updatedComment
        });
        return res.status(200).json({message:"Comment Updated Succefully"})
    }
    catch(error){
        console.log(error);
        return res.status(501).json({message:"Can't update the commment"})
    }
}

const deleteComment=async (req,res)=>{
    const postId=new ObjectId(req.params.id);
    const commentId=new ObjectId(req.params.commentid);
    const commentatorId=req.firebaseuserid //becasue the execution only gets to this function if the user requesting deletion of comment is the commentator
    try{
        const commentObject= await _db.collection('comments').findOne({_id:commentId});
        const postCreatorId=commentObject.creatorid;
        await _db.collection('comments').deleteOne({_id:commentId,postid:postId});
        await _db.collection('comments').deleteMany({parentcommentid:commentId}) //this deletes the whole comment tree where the present comment with given commentid is the root
        //but the commentators get to keep those rewards - because they are not the one deleting 
        try{
            const type='debit',points=1,userid1=commentatorId,userid2=postCreatorId
            const reward={
                type,points,userid1,userid2
            }
            await sendToWorkerQueue(rewardQueue,reward);
            return res.status(200).json({message:"Comment deleted Succefully - Reward Debited"})
            
        }
        catch(error){
            console.log(error);
            return res.status(200).json({message:"Comment deleted Succesfully - Reward service is down at the moment"})
        }
    }
    catch(error){
        console.log(error);
        return res.status(501).json({message:"Can't delete the commment"})
    }
}

const likeComment=async (req,res)=>{
    const postId=new ObjectId(req.params.id);
    const firebaseuserid=req.firebaseuserid
    const commentId=new ObjectId(req.params.commentid);
    try{
        const alreadyLiked=await client.db("Communityapi").collection('commentlikes').findOne({commentid:commentId,likerid:firebaseuserid});
        if(alreadyLiked){
            return res.status(409).json({message:"You have already liked the comment"})
        }
        else{
            let newDocument={
                postid:postId,
                commentid:commentId,
                likerid:firebaseuserid,
                likedAt:new Date()
            }
            const postObject= await _db.collection('posts').findOne({_id:postId})
            const groupid=postObject.groupid
            if(groupid){
                newDocument={...newDocument,groupid:groupid}
            }
            await _db.collection('commentlikes').insertOne(newDocument)
            return res.status(200).json({message:"You liked this comment"})
        }
    }
    catch(error){
        console.log(error);
        return res.status(501).json({message:"Can't like the commment"})
    }
}

const unlikeComment= async (req,res)=>{
    const firebaseuserid=req.firebaseuserid
    const commentId=new ObjectId(req.params.commentid);
    try{
        const notLiked=await client.db("Communityapi").collection('commentlikes').findOne({commentid:commentId,likerid:firebaseuserid});
        if(!notLiked){
            return res.status(409).json({message:"You didn't like this comment"})
        }
        else{
            await _db.collection('commentlikes').deleteOne({
                commentid:commentId,
                likerid:firebaseuserid
            })
            return res.status(200).json({message:"You disliked this comment"})
        }
    }
    catch(error){
        console.log(error);
        return res.status(501).json({message:"Can't dislike the comment"})
    }
}

const replyComment= async (req,res)=>{
    const postId=new ObjectId(req.params.id);
    const firebaseuserid=req.firebaseuserid
    const commentId=new ObjectId(req.params.commentid);
    const text=req.body.text
    try{
        let newDocument={
            postid:postId,
            commentatorid:firebaseuserid,
            parentcommentid:commentId,
            text:text,
            repliedAt:new Date()
        }
        const postObject= await _db.collection('posts').findOne({_id:postId})
        const creatorId=postObject.creatorid
        const groupid=postObject.groupid
        if(groupid){
            newDocument={...newDocument,groupid:groupid}
        }
        await _db.collection('comments').insertOne(newDocument)
        if(firebaseuserid!==creatorId){
            try{
                const creatorObject= await _db.collection('userInfo').findOne({userid:creatorId});
                const creatorMail=creatorObject.email
                const likerObject=await _db.collection('userInfo').findOne({userid:firebaseuserid});
                const username=likerObject.username
                const points=1,userid1=firebaseuserid,userid2=creatorId,type='credit';
                const reward={type,points,userid1,userid2};
                const data={
                    receiver:creatorMail,
                    body:`${username} replied to a comment on your post`
                }
                await sendToWorkerQueue(mailQueue,data);
                await sendToWorkerQueue(rewardQueue,reward)
                return res.status(200).json({message:"Replied to Comment"})
            }
            catch(error){
                console.log(error);
                return res.status(200).json({message:"Replied to this comment - but unable to send mail/credit reward"})
            }
        }
        return res.status(200).json({message:"Replied to this comment"})
    }
    catch(error){
        console.log(error);
        return res.status(501).json({message:"Can't reply to this comment"});
    }
}


module.exports={
    getMyposts,createPost,updatePost,deletePost,getTimeline,makeInvisible,
    makeVisible,likePost,unlikePost,getComments,addComment,updateComment,deleteComment,likeComment,
    replyComment,unlikeComment
}