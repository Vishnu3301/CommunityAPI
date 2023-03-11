const {getClient}=require('../db');
const client=getClient();
const path = require('path')
require('dotenv').config({ path: path.resolve(__dirname, '../.env') })
const {ObjectId}=require('mongodb');
const {sendToWorkerQueue}=require('../rabbitmq/publisher');
const { match } = require('assert');
const _db=client.db(process.env.DBNAME);
const mailQueue=process.env.MAILINGQUEUE
const rewardQueue=process.env.REWARDQUEUE;
const bulkMailQueue=process.env.BULKMAILINGQUEUE;
const {ExpressError}=require('../utils/customErrorHandler')
const {mybucket}=require('../utils/gcp')
const getMyposts= async (req,res)=>{
    const firebaseuserid=req.firebaseuserid;
    const {page=1,limit:postsPerPage=5} = req.query
    if(page<=0 || postsPerPage<=0){
        throw new ExpressError("Page and Limit queries must be greater than 0",400)
    }
    const posts= await _db.collection('posts').aggregate([{
        $match:{ creatorid: firebaseuserid,visible:true}
        },
        {
            $sort:{createdAt:-1}
        },
        {
            $skip:parseInt((page-1)*postsPerPage)
        },
        {
            $limit:parseInt(postsPerPage)
        },
        {
            $project:{_id:0,title:1,description:1,files:1}
        }
    ]).toArray();
    return res.status(200).json(posts);
    
}

const getTimeline = async (req,res)=>{
    //to be implemented
    //for timeline, fetch posts made by followers and the posts from groups they are in
    //make posts 
    const firebaseuserid=req.firebaseuserid;
    //we need to apply two lookups
    //one for the posts of the users the user if following and one for groups
    //the limit per page would be 10 posts lets generate a random number between one to 10
    //to limit the number of posts from each category and add it upto 10
    //usage of page is redundant
    const {page=1,limit:postsPerPage=10}=req.query
    if(page<=0 || postsPerPage<=0){
        throw new ExpressError("Page and Limit queries must be greater than 0",400)
    }
    const followerPostsLimit=Math.floor((Math.random()*(postsPerPage-1)))+1;
    const groupPostsLimit=parseInt(postsPerPage)-followerPostsLimit
    let followersPosts=await  _db.collection('follows').aggregate([
        { $match:{followerid:firebaseuserid}},
        {
            $lookup:{
            from:'posts',
            localField:'followedid',
            foreignField:'creatorid',
            as:'followingPosts',
            pipeline:[
                {$match:{visible:true,ingroup:false}},
                {$project:{_id:0,title:1,description:1,files:1,username:1}}
            ]
                }
        },
        {
            $unwind:'$followingPosts'
        },
        {
            $sort:{"followingPosts.createdAt":-1}
        },
        {
            $skip:parseInt(page-1)*groupPostsLimit
        },
        {
            $limit:parseInt(followerPostsLimit)
        },
        {
            $project:{_id:0,followingPosts:1}
        }
    ]).toArray();
    let groupPosts=await  _db.collection('groupmembers').aggregate([
        { $match:{memberid:firebaseuserid}},
            {
                $lookup:{
                from:'posts',
                localField:'groupid',
                foreignField:'groupid',
                as:'groupPosts',
                pipeline:[
                {$project:{_id:0,title:1,description:1,files:1,username:1}}
            ]
            }
            },
            {
                $unwind:'$groupPosts'
            },
            {
                $sort:{"groupPosts.createdAt":-1}
            },
            {
                $skip:parseInt(page-1)*followerPostsLimit
            },
            {
                $limit:parseInt(groupPostsLimit)
            },
            {
                $project:{_id:0,groupPosts:1}
            }
        ]).toArray();
    //  console.log(followersPosts, groupPosts)
    followersPosts=followersPosts.map(ele=>{
        return ele.followingPosts
    })
    groupPosts=groupPosts.map(ele=>{
        return ele.groupPosts
    })
    //the timeline posts are not sorted but are the most recent in random order
    const timelinePosts=[...followersPosts,...groupPosts]
    return res.status(200).json(timelinePosts)

}

//default post visibility is true, that is posts are public, if the user sets visibility to false,
// it won't get displayed or retrived
const createPost = async (req,res)=>{
    const firebaseuserid=req.firebaseuserid;
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
        const newPostcreatedAt=new Date();
        await _db.collection('posts').insertOne({
            title,
            description,
            creatorid:firebaseuserid,
            visible,
            username,
            ingroup:false,
            createdAt:newPostcreatedAt
        })
        let points=3;
        const previousPostObject= await _db.collection('posts').aggregate([
            {
                $match:{creatorid:firebaseuserid}
            },
            {
                $sort:{createdAt:-1}
            },
            {
                $skip:1
            },
            {
                $limit:1
            }
        ]).toArray();
        //logic to check if user has posted more than once in 24hrs and reward extra
        if(previousPostObject.length!==0){
            const lastPostedTime=previousPostObject[0].createdAt.getTime();
            const present=newPostcreatedAt.getTime();
            const differenceInMs=present-lastPostedTime //difference of time in ms between the present post and last created post
            const seconds=Math.abs((differenceInMs)/1000);
            const hrs=Math.round(seconds/(3600));
            if(hrs<24 && differenceInMs > 1000){
                points= points+1; //reward the users an extra point if they post more than once in 24 hrs
            }
        }
        const reward={
            type:'credit',
            points:points,
            userid1:firebaseuserid
        }
        await sendToWorkerQueue(rewardQueue,reward)
        //bulk mailing service - send mail to all the post creators followers
        const data={
            creatorid:firebaseuserid
        }
        await sendToWorkerQueue(bulkMailQueue,data)
        return res.status(200).json({"message":"Post created succesfully"})
    }
    else{
        throw new ExpressError("Insufficient Details")
    }
}

const updatePost = async (req,res)=>{
    const postId=new ObjectId(req.params.id);
    let updatedFields=req.body;
    updatedFields={...updatedFields,updatedAt:new Date(),updaterid:req.firebaseuserid} //for now only the post creator can update the post
    const updatedPost= await _db.collection('posts').findOneAndUpdate({_id:postId},{
        $set: updatedFields
    },{returnDocument:'after'});
    //to be implemented - return the updated post
    return res.status(200).json({message:"Post updated successfully"});
}

const deletePost = async (req,res)=>{
    const postId=new ObjectId(req.params.id);
    const postObject= await _db.collection('posts').findOne({_id:postId})
    await _db.collection('posts').deleteOne({_id:postId}); //delete the post
    await _db.collection('postlikes').deleteMany({postid:postId}) //delete the likes associated with the posts
    await _db.collection('comments').deleteMany({postid:postId}) //delete the comments associated with the post
    await _db.collection('commentlikes').deleteMany({postid:postId}) //delete the comment likes stored in different collection
    //when user deletes the post the credits regarding the post is only deleted
    const firebaseuserid=req.firebaseuserid
    const type='debit',points=3,userid1=firebaseuserid
    if(postObject.ingroup){
        points=5;
    }
    const reward={type,points,userid1}
    await sendToWorkerQueue(rewardQueue,reward)
    return res.status(200).json({message:"You deleted the post"})
        
}

const makeVisible = async (req,res)=>{
    const postId=new ObjectId(req.params.id);
    updatedFields={
        visible:true,
        updatedAt:new Date()
    }
    await _db.collection('posts').findOneAndUpdate({_id:postId},{
        $set: updatedFields
    },{returnDocument:'after'});
    return res.status(200).json({message:"You Unarchived the post"});
  
}

const makeInvisible = async (req,res)=>{
    const postId=new ObjectId(req.params.id);
    updatedFields={
        visible:false,
        updatedAt:new Date()
    }
    await _db.collection('posts').findOneAndUpdate({_id:postId},{
        $set: updatedFields
    },{returnDocument:'after'});
    return res.status(200).json({message:"Archived the post"});
}

const likePost = async (req,res)=>{
    const postId=new ObjectId(req.params.id);
    const firebaseuserid =req.firebaseuserid
        const alreadyLiked=await _db.collection('postlikes').findOne({postid:postId,likerid:firebaseuserid});
        if(alreadyLiked){
            throw new ExpressError("You already liked the post",409)
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
            return res.status(200).json({message:"You liked the Post"});
        }
}

const unlikePost= async (req,res)=>{
    const postId=new ObjectId(req.params.id);
    const firebaseuserid =req.firebaseuserid
    const liked=await _db.collection('postlikes').findOne({postid:postId,likerid:firebaseuserid});
    if(liked){
        await _db.collection('postlikes').deleteOne({
            likerid:firebaseuserid,
            postid:postId
        })
        const postObject=await _db.collection('posts').findOne({_id:postId});
        const creatorId=postObject.creatorid
        const type='debit',points=1,userid1=firebaseuserid,userid2=creatorId
        const reward={type,points,userid1,userid2};
        await sendToWorkerQueue(rewardQueue,reward)
        return res.status(200).json({message:"You disliked the post"})
    }
    else{
        throw new ExpressError("You didnot like the post in the first place",409)
    }
}
//comments

const getComments=async (req,res)=>{
    const postId= new ObjectId(req.params.id);
    //for now , this gets all comments on the post (not the replies just the comments- parent comments)
    //pagination to be implemented
    const {page=1,limit:commentsPerPage=5}=req.query
    if(page<=0 || commentsPerPage<=0){
        throw new ExpressError("Page and Limit queries must be greater than 0",400)
    }
    const comments=await _db.collection('comments').aggregate([
        {
            $match:{postid:postId,onpost:true}
        }
        ,
        {
            $sort:{createdAt:-1}
        },
        {
            $skip:parseInt(page-1)*parseInt(commentsPerPage)
        },
        {
            $limit:parseInt(commentsPerPage)
        },
        {
            $project:{_id:0,username:1,text:1}
        }
    ]).toArray();
    res.status(200).json(comments);
}

const getReplies = async (req,res)=>{
    const postId=ObjectId(req.params.id);
    const commentId=ObjectId(req.params.commentid)
    const {page=1,limit:repliesPerPage=5}=req.query
    if(page<=0 || repliesPerPage<=0){
        throw new ExpressError("Page and Limit queries must be greater than 0",400)
    }
    const replies= await _db.collection('comments').aggregate([
        {
            $match:{postid:postId,parentcommentid:commentId}
        },
        {
            $sort:{repliedAt:-1}
        },
        {
            $skip:parseInt(page-1)*parseInt(repliesPerPage)
        },
        {
            $limit:parseInt(repliesPerPage)
        },
        {
            $project:{_id:0,username:1,text:1}
        }
    ]).toArray();
    res.status(200).json(replies)
}

const addComment = async (req,res)=>{
    const firebaseuserid=req.firebaseuserid
    const postId=new ObjectId(req.params.id);
    const text=req.body.text
    if(!text){
        throw new ExpressError("Comment can't be empty string",400)
    }
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
        newDocument={...newDocument,groupid:ObjectId(groupid)}
    }
    await _db.collection('comments').insertOne(newDocument)
    if(firebaseuserid!==postCreatorId){
        const postCreatorObject= await _db.collection('userInfo').findOne({userid:postCreatorId})
        const creatorEmail=postCreatorObject.email
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
    return res.status(200).json({message:'Commented Succesfully'})
    
}

const updateComment= async (req,res)=>{
    const postId=new ObjectId(req.params.id);
    const commentid=new ObjectId(req.params.commentid)
    let updatedComment={...req.body,updatedAt:new Date(),updaterid:req.firebaseuserid};
    await _db.collection('comments').updateOne({_id:commentid,postid:postId},{
        $set:updatedComment
    });
    return res.status(200).json({message:"Comment Updated Succefully"})
}

const deleteComment=async (req,res)=>{
    const postId=new ObjectId(req.params.id);
    const commentId=new ObjectId(req.params.commentid);
    const commentatorId=req.firebaseuserid //becasue the execution only gets to this function if the user requesting deletion of comment is the commentator
    const commentObject= await _db.collection('comments').findOne({_id:commentId});
    const postCreatorId=commentObject.creatorid;
    await _db.collection('comments').deleteOne({_id:commentId,postid:postId});
    await _db.collection('comments').deleteMany({parentcommentid:commentId}) //this deletes the whole comment tree where the present comment with given commentid is the root
    //but the commentators get to keep those rewards - because they are not the one deleting 
    const type='debit',points=1,userid1=commentatorId,userid2=postCreatorId
    const reward={
        type,points,userid1,userid2
    }
    await sendToWorkerQueue(rewardQueue,reward);
    return res.status(200).json({message:"Comment deleted Succefully"})
}

const likeComment=async (req,res)=>{
    const postId=new ObjectId(req.params.id);
    const firebaseuserid=req.firebaseuserid
    const commentId=new ObjectId(req.params.commentid);
    const alreadyLiked=await client.db("Communityapi").collection('commentlikes').findOne({commentid:commentId,likerid:firebaseuserid});
    if(alreadyLiked){
        throw new ExpressError("You already liked the comment",409)
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

const unlikeComment= async (req,res)=>{
    const firebaseuserid=req.firebaseuserid
    const commentId=new ObjectId(req.params.commentid);
    const notLiked=await client.db("Communityapi").collection('commentlikes').findOne({commentid:commentId,likerid:firebaseuserid});
    if(!notLiked){
        throw new ExpressError("You didnot like the comment in the first place",409)
    }
    else{
        await _db.collection('commentlikes').deleteOne({
            commentid:commentId,
            likerid:firebaseuserid
        })
        return res.status(200).json({message:"You disliked this comment"})
    }
}

const replyComment= async (req,res)=>{
    const postId=new ObjectId(req.params.id);
    const firebaseuserid=req.firebaseuserid
    const commentId=new ObjectId(req.params.commentid);
    const text=req.body.text
    if(!text){
        throw new ExpressError("Comment can't be empty string",400)
    }
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
    return res.status(200).json({message:"Replied to this comment"})
}


const attachFiles = async (req,res)=>{
    const postId=ObjectId(req.params.id);
    if(!req.file){
        throw new ExpressError("Missing file to attach to the post",400);
    }
    const options={
        destination:req.file.filename, //name of the file with which we want our uploaded file to store with- basically the name of the file in bucket
        preconditionOpts:{ifGenerationMatch:0}
    }
    const output=await mybucket.upload(req.file.path,options);
    const publicURL=`https://storage.googleapis.com/${output[0].metadata.bucket}/${req.file.filename}`
    const newElement={
        url:publicURL,
        createdAt:new Date()
    }
    await _db.collection('posts').updateOne({_id:postId},{
        $push:{ files: newElement}
    })
    return res.status(200).json({message:"File attatched"})
}

module.exports={
    getMyposts,createPost,updatePost,deletePost,getTimeline,makeInvisible,
    makeVisible,likePost,unlikePost,getComments,addComment,updateComment,deleteComment,likeComment,
    replyComment,unlikeComment,attachFiles, getReplies
}