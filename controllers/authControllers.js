const jwt=require('jsonwebtoken'); //jwt for api security
const path=require('path')
require('dotenv').config({path:path.resolve(__dirname+'../.env')})
const key=process.env.SECRETKEY //secret key to sign the payload for jwt 
//conneting to firebase for user authentication
const {initializeApp}=require('firebase/app');
const {getAuth,createUserWithEmailAndPassword, signInWithEmailAndPassword, sendPasswordResetEmail}=require('firebase/auth')
const {getClient}=require('../db');
const {userSignup,userLogin}=require('../utils/schemaValidator')
const client=getClient();
const _db=client.db(process.env.DBNAME);
const {ExpressError}=require('../utils/customErrorHandler')
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
    const validatedData= userSignup.safeParse(req.body);
    if(validatedData.success){
        const {name="",gender="",profession="",mobile="",location=""}=req.body;
        let {email,username,password}=req.body
        const foundUserbyUsername= await _db.collection('userInfo').findOne({username:username});
        if(foundUserbyUsername){
            throw new ExpressError("Username is already taken",400)
        }
        const foundUserbyEmail = await _db.collection('userInfo').findOne({email:email})
        if(foundUserbyEmail){
            throw new ExpressError("Email already in use",409)
        }
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
        return res.status(200).json({message:"SignedUp successfully",token});
    }
    else{
        //zod validation falied
        const errors=validatedData.error.issues;
        const errorMessages=errors.map(data=>{
            return `${data.path[0]} : ${data.message}`
        })
        const message={"Error":"Invalid Input","Errors":errorMessages}
        throw new ExpressError(message,403)
    }
}

//login controller
const login = async (req,res)=>{
    const validatedData=userLogin.safeParse(req.body);
    if(validatedData.success){
            const {email,password}=req.body
            const userInfo=await signInWithEmailAndPassword(auth,email,password);
            const userId=userInfo.user.uid
            const token= jwt.sign({firebaseuserid:userId,email:email},key)
            return res.status(200).send({message:"signed in succesfully",token:token})
    }
    else{
        //zod validation errors
        const errors=validatedData.error.issues;
        const errorMessages=errors.map(data=>{
            return `${data.path[0]} : ${data.message}`
        })
        const message={"Error":"Invalid Input","Errors":errorMessages}
        throw new ExpressError(message,403)
    }
}

const resetPassword= async (req,res)=>{
    const email=req.email
    try{
        await sendPasswordResetEmail(auth,email);
        return res.status(200).json({message:"Password reset link has been mailed to you"})
    }
    catch(error){
        return res.status(500).json({message:"Can't Send mail to reset password at the moment"})
    }
}

module.exports={
    signup,login,resetPassword
}