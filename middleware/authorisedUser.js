const {getClient}=require('../db');
const client=getClient();
//to be implemented
//to verify the permission
const isCreator=async (req,res,next)=>{
    const postId=req.params.id;

}

module.exports=isCreator