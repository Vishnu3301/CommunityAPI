const express=require('express'); //require express
const { MongoServerError } = require('mongodb');
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

app.get('/',(req,res)=>{
    res.status(200).json({message:"Welcome to Community-API"})
})
//custom error handler
app.use((err,req,res,next)=>{
    const {status=500}=err;
    let {message="Server Error"}=err;
    if(err instanceof MongoServerError){
        message="Database Error, Please check your inputs"
    }
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

module.exports=app