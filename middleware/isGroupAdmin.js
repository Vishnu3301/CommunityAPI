const { ObjectId } = require("mongodb");
const {getClient}=require('../db');
const client=getClient();
const _db=client.db(process.env.DBNAME)
const isGroupAdmin = async (req,res,next)=>{
    const firebaseuserid=req.firebaseuserid;
    const groupid=ObjectId(req.params.id);
    try{
        const groupObject=await _db.collection('groups').findOne({_id:groupid});
        if(!groupObject){
            return res.status(404).json({message:"Group not found"})
        }
        const creatorid=groupObject.creatorid;
        if(firebaseuserid===creatorid){
            next();
        }
        else{
            return res.status(403).json({message:"Unauthorized action"})
        }
    }
    catch(error){
        return res.status(501).json({message:"server side error"})
    }
}


module.exports = {isGroupAdmin};