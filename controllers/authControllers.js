const jwt=require('jsonwebtoken'); //jwt for api security
const path=require('path')
require('dotenv').config({path:path.resolve(__dirname+'../.env')})
const key=process.env.SECRETKEY //secret key to sign the payload for token
//conneting to firebase for user authentication
const {initializeApp}=require('firebase/app');
const {getAuth,createUserWithEmailAndPassword, signInWithEmailAndPassword, /*updatePassword*/}=require('firebase/auth')
const {getClient}=require('../db');
const client=getClient();
const _db=client.db(process.env.DBNAME);
const firebaseConfig={
    apiKey: process.env.APIKEY,
    authDomain: process.env.AUTHDOMAIN,
    projectId: process.env.PROJECTID,
    storageBucket: process.env.STORAGEBUCKET,
    messagingSenderId: process.env.MESSAGINGSENDERID,
    appId: process.env.APPID,
    measurementId: process.env.MEASUREMENTID
};

const firebaseapp=initializeApp(firebaseConfig);
const auth = getAuth(firebaseapp);

//signup controller
const signup = async (req,res)=>{
    const {name,gender,profession,mobile,location,email,password,username}=req.body;
    try{
        if(!username){
            return res.status(422).json({message:"missing username"});
        }
        const foundUser= await _db.collection('userInfo').findOne({username:username});
        if(foundUser){
            res.status(400).json({message:"Username is already taken"});
        }
        else{
            const userInfo= await createUserWithEmailAndPassword(auth,email,password)
            const userId=userInfo.user.uid;
            const userDetails={
                name:name,
                username:username,
                email:email,
                gender:gender,
                profession:profession,
                mobile:mobile,
                location:location,
                userid:userId,
                createdAt:new Date()
                
            }
            //store user profile in mongodb
            await _db.collection('userInfo').insertOne(userDetails);
            const token=jwt.sign({firebaseuserid:userId,email:email},key);
            return res.status(200).json({message:"SignedUp successfully",token:token});
        }
    }
    catch(error){
        console.log(error);
        if(error.code){
            return res.status(401).json({message:`${error.code.slice(5)}`})
        }
        return res.status(401).json({message:"Error occured while storing user info"});
    }
}

//login controller
const login = async (req,res)=>{
    const {email,password}=req.body;
    try{
        const userInfo=await signInWithEmailAndPassword(auth,email,password);
        const userId=userInfo.user.uid
        const token= jwt.sign({firebaseuserid:userId,email:email},key)
        return res.status(200).send({message:"signed in succesfully",token:token});
    }
    catch(error){
        console.log(error);
        return res.status(401).json({message:`${error.code.slice(5)}`})
    }
}

// const resetPassword = async (req,res)=>{
//     const {password:newPassword}=req.body;
//     try{
//         await updatePassword(user,newPassword);
//         return res.status(200).json({message:"Password updated"})
//     }
//     catch(error){
//         console.log(error);
//         return res.status(501).json({message:"Can't Update your Password"})
//     }
// }

module.exports={
    signup,login, /*resetPassword*/
}