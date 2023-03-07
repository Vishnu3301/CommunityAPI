const express=require('express'); //require express
const {connectTodb}=require('./db'); //for connection to database
const {authRouter}=require('./routers/authRoutes');
const { groupRouter } = require('./routers/groupRoutes');
const {postRouter}=require('./routers/postRoutes')
const {userRouter}=require('./routers/userRoutes');
const app=express();
const PORT=process.env.PORT || 3000


//middleware
app.use(express.json())
app.use('/api/auth',authRouter);
app.use('/api/posts',postRouter);
app.use('/api/users',userRouter)
app.use('/api/groups',groupRouter);

//custom error handler
app.use((err,req,res,next)=>{
    const {status=500,message="something went wrong"}=err;
    return res.status(status).json({message})
})


//start the express app
app.listen(PORT,()=>{
    //db connection
    connectTodb()
    .then(data=>{
        console.log(data);
    })
    console.log(`Listening on port ${PORT}`)
})