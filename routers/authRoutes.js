const express=require('express');
const {signup,login,resetPassword}=require('../controllers/authControllers')
const {isLoggedin}=require('../middleware/isAuthenticated')
const authRouter=express.Router();
const {wrapAsync}=require('../utils/asyncErrorHandler')

authRouter.post('/signup',wrapAsync(signup));
authRouter.post('/login',wrapAsync(login));
authRouter.put('/resetpass',isLoggedin,wrapAsync(resetPassword))
// authRouter.put('/resetpass',isLoggedin,resetPassword);

module.exports={authRouter}
