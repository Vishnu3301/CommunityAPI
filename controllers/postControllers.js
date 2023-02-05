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
        const alreadyLiked=await client.db('Communityapi').collection('postlikes').findOne({postid:postId,likerid:mongodbuserid});
        if(alreadyLiked){
            res.status(409).json({message:"You already liked the post"});
        }
        else{
            const postObject= await client.db('Communityapi').collection('posts').findOne({
                _id:postId,
            })
            const creatorid= postObject.creator;
            await client.db('Communityapi').collection('postlikes').insertOne({
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
        const liked=await client.db('Communityapi').collection('postlikes').findOne({postid:postId,likerid:mongodbuserid});
        if(liked){
            await client.db('Communityapi').collection('postlikes').deleteOne({
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
    const postId= new ObjectId(req.params.id);
    //for now , this gets all comments on the post (not the replies just the comments- parent comments)
    //pagination and sort to be implemented
    try{
        const comments=await client.db('Communityapi').collection('comments').aggregate([
            {
                $match:{postid:postId,onpost:true}
            }
            ,
            {
                $project:{_id:0,commentatorid:0,postid:0,onpost:0}
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
    const mongodbuserid=new ObjectId(req.mongodbuserid);
    const postid=new ObjectId(req.params.id);
    const text=req.body.text
    try{
        const userObject=await client.db('Communityapi').collection('userInfo').findOne({_id:mongodbuserid});
        const username=userObject.username;
        await client.db('Communityapi').collection('comments').insertOne({
            postid:postid, //this is the post id the user is commenting on
            commentatorid:mongodbuserid, //this is the id of user that is commenting
            onpost:true,//this signifies that the comment is directly on the post and not a reply to any comment on that post
            username:username,
            text:text,
            timestamp:new Date()
        })
        res.status(200).json({message:"Commented Succesfully"})
    }
    catch(error){
        console.log(error);
        res.status(501).json({message:"Can't commment on the post  - Server error"})
    }
}

const updateComment= async (req,res)=>{
    const postId=new ObjectId(req.params.id);
    const commentid=new ObjectId(req.params.commentid)
    const updatedComment=req.body;
    try{
        await client.db('Communityapi').collection('comments').updateOne({_id:commentid,postid:postId},{
            $set:updatedComment
        });
        res.status(200).json({message:"Comment Updated Succefully"})
    }
    catch(error){
        console.log(error);
        res.status(501).json({message:"Can't update the commment"})
    }
}

const deleteComment=async (req,res)=>{
    const postId=new ObjectId(req.params.id);
    const commentId=new ObjectId(req.params.commentid);
    try{
        await client.db('Communityapi').collection('comments').deleteOne({_id:commentId,postid:postId});
        res.status(200).json({message:"Comment deleted Succefully"})
    }
    catch(error){
        console.log(error);
        res.status(501).json({message:"Can't delete the commment"})
    }
}

const likeComment=async (req,res)=>{
    const mongodbuserid=new ObjectId(req.mongodbuserid);
    const commentId=new ObjectId(req.params.commentid);
    try{
        const alreadyLiked=await client.db("Communityapi").collection('commentlikes').findOne({commentid:commentId,likerid:mongodbuserid});
        if(alreadyLiked){
            res.status(409).json({message:"You have already liked the comment"})
        }
        else{
            await client.db('Communityapi').collection('commentlikes').insertOne({
                commentid:commentId,
                likerid:mongodbuserid
            })
            res.status(200).json({message:"You liked this comment"})
        }
    }
    catch(error){
        console.log(error);
        res.status(501).json({message:"Can't like the commment"})
    }
}

const unlikeComment= async (req,res)=>{
    const mongodbuserid=new ObjectId(req.mongodbuserid);
    const commentId=new ObjectId(req.params.commentid);
    try{
        const notLiked=await client.db("Communityapi").collection('commentlikes').findOne({commentid:commentId,likerid:mongodbuserid});
        if(!notLiked){
            res.status(409).json({message:"You didn't like this comment"})
        }
        else{
            await client.db('Communityapi').collection('commentlikes').deleteOne({
                commentid:commentId,
                likerid:mongodbuserid
            })
            res.status(200).json({message:"You disliked this comment"})
        }
    }
    catch(error){
        console.log(error);
        res.status(501).json({message:"Can't dislike the comment"})
    }
}

const replyComment= async (req,res)=>{
    const postId=new ObjectId(req.params.id);
    const mongodbuserid=new ObjectId(req.mongodbuserid);
    const commentId=new ObjectId(req.params.commentid);
    const text=req.body.text
    try{
        await client.db('Communityapi').collection('comments').insertOne({
            postid:postId,
            commentatorid:mongodbuserid,
            parentcommentid:commentId,
            text:text,
            timestamp:new Date()
        })
        res.status(200).json({message:"Replied to this comment"})
    }
    catch(error){
        console.log(error);
        res.status(501).json({message:"Can't reply to this comment"});
    }
}


module.exports={
    getMyposts,createPost,updatePost,deletePost,getTimeline,makeInvisible,
    makeVisible,likePost,unlikePost,getComments,addComment,updateComment,deleteComment,likeComment,
    replyComment,unlikeComment
}