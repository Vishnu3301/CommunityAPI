const { ObjectId } = require("mongodb");
const {getClient}=require('../db');
const client=getClient();
const _db=client.db('Communityapi')
const isGroupAdmin = async (req,res,next)=>{
    const firebaseuserid=req.firebaseuserid;
    const groupid=ObjectId(req.params.id);
    try{
        const groupObject=await _db.collection('groups').findOne({_id:groupid});
        const creatorid=groupObject.creatorid;
        if(firebaseuserid===creatorid){
            next();
        }
        else{
            return res.status(403).json({message:"Unauthorized action"})
        }
    }
    catch(error){
        console.log(error);
        return res.status(501).json({message:"server side error"})
    }
}


module.exports = {isGroupAdmin};