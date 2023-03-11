const { ObjectId } = require('mongodb');
const {getClient}=require('../db');
const client=getClient();
const _db=client.db(process.env.DBNAME)

const isMember = async (req,res,next)=>{
    const firebaseuserid=req.firebaseuserid;
    const groupid=ObjectId(req.params.id);
    try{
        const memberObject=await  _db.collection('groupmembers').findOne({
            memberid:firebaseuserid,
            groupid:groupid
        })
        if(memberObject){
            next()
        }
        else{
            return res.status(403).json({message:"Unauthorized Action - Not a member of this group"})
        }
    }
    catch(error){
        return res.status(501).json({message:"Server Side error"})
    }
}


module.exports = { isMember }