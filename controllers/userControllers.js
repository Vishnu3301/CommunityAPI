const jwt=require('jsonwebtoken'); //jwt for api security
const key=process.env.SECRETKEY //secret key to sign the payload for token
//conneting to firebase for user authentication
const {initializeApp}=require('firebase/app');
const {getAuth,createUserWithEmailAndPassword, signInWithEmailAndPassword}=require('firebase/auth')
const {getClient}=require('../db');
const client=getClient();
const firebaseConfig={
    apiKey: process.env.APIKEY,
    authDomain: process.env.AUTHDOMAIN,
    projectId: process.env.PROJECTID,
    storageBucket: process.env.STORAGEBUCKET,
    messagingSenderId: process.env.MESSAGINGSENDERID,
    appId: process.env.APPID,
    measurementId: process.env.MEASUREMENTID
};
const appFirebase = initializeApp(firebaseConfig);
const auth = getAuth();

//signup controller
const signup = async (req,res)=>{
    const {name,gender,profession,mobile,location,email,password}=req.body;
    try{
        const userInfo= await createUserWithEmailAndPassword(auth,email,password)
        const userId=userInfo.user.uid;
        const userDetails={
            name:name,
            email:email,
            gender:gender,
            profession:profession,
            mobile:mobile,
            location:location,
            userid:userId
            
        }
        //store user profile in mongodb
        const mongodbUserInfo=await client.db('Communityapi').collection('userInfo').insertOne(userDetails);
        const mongodbuserid=mongodbUserInfo._id;
        const token=jwt.sign({firebaseuserid:userId,mongodbuserid:mongodbuserid,email:email},key);
        res.status(200).json({message:"SignedUp successfully",token:token});
    }
    catch(error){
        console.log(error);
        if(error.code){
            res.status(401).json({message:`${error.code.slice(5)}`})
        }
        res.status(401).json({message:"Error occured while storing user info"});
    }
}

//login controller
const login = async (req,res)=>{
    const {email,password}=req.body;
    try{
        const userInfo=await signInWithEmailAndPassword(auth,email,password);
        const userId=userInfo.user.uid
        const mongodbuserinfo=await client.db('Communityapi').collection('userInfo').find({email:email}).toArray();
        const token= jwt.sign({fireabaseuserid:userId,mongodbuserid:mongodbuserinfo[0]._id,email:email},key)
        res.status(200).send({message:"signed in succesfully",token:token});
    }
    catch(error){
        console.log(error);
        res.status(401).json({message:`${error.code.slice(5)}`})
    }
}

module.exports={
    signup,login
}