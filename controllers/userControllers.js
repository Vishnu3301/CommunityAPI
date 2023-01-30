const jwt=require('jsonwebtoken'); //jwt for api security
const key=process.env.SECRETKEY //secret key to sign the payload for token
//conneting to firebase for user authentication
const {initializeApp}=require('firebase/app');
const {getAuth,createUserWithEmailAndPassword, signInWithEmailAndPassword}=require('firebase/auth')
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
// to implement - store extra info from user into mongodb mapped with user id from firebase in signup
const signup = async (req,res)=>{
    const {email,password}=req.body;
    try{
        const userInfo= await createUserWithEmailAndPassword(auth,email,password);
        const userId=userInfo.user.uid;
        const token=jwt.sign({userid:userId,email:email},key);
        res.status(200).json({message:"SignedUp successfully",token:token});
    }
    catch(error){
        console.log(error);
        res.status(401).json({message:`${error.code.slice(5)}`})
    }
}

//login controller
const login = async (req,res)=>{
    const {email,password}=req.body;
    try{
        const userInfo=await signInWithEmailAndPassword(auth,email,password);
        const userId=userInfo.user.uid
        const token= jwt.sign({userid:userId,email:email},key)
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