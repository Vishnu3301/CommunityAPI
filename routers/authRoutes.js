const express=require('express');
const {signup,login,resetPassword}=require('../controllers/authControllers')
const {isLoggedin}=require('../middleware/isAuthenticated')
const authRouter=express.Router();


authRouter.post('/signup',signup);
authRouter.post('/login',login);
authRouter.put('/resetpass',isLoggedin,resetPassword)
// authRouter.put('/resetpass',isLoggedin,resetPassword);

module.exports={authRouter}
