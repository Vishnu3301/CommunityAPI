const express=require('express');
const {signup,login}=require('../controllers/authControllers')
const authRouter=express.Router();


authRouter.post('/signup',signup);
authRouter.post('/login',login);

module.exports={authRouter}