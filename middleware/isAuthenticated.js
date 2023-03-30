// const jwt=require('jsonwebtoken')
const dotenv=require('dotenv')
dotenv.config();
const session=require('express-session')
// const key=process.env.SECRETKEY
//this middleware is used to authorize users - to access,create posts
// const isLoggedin= (req,res,next)=>{
//     let token=req.headers.authorization;
//     try{
//         if(token){
//             token=token.split(' ')[1];
//             const user=jwt.verify(token,key);
//             req.firebaseuserid=user.firebaseuserid;
//             req.email=user.email;
//             next();
//         }
//         else{
//             return res.status(401).json({message:"Unauthorized Action"});
//         }
//     }
//     catch(error){
//         return res.status(401).json({message:"Unauthorized Action"});
        
//     }
// }

const isLoggedin= (req,res,next)=>{
    if(!req.session){
        return res.status(401).json({"message":"Unauthorized Action, Please Login" })
        
    }
    else{
        if(!req.session.user){
            return res.status(401).json({"message":"Unauthorized Action, Please Login" }) 
        }
        next()
    }
}

module.exports={isLoggedin}