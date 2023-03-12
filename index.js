const express=require('express'); //require express
const { FirebaseError } = require('firebase/app');
const { MongoServerError, MongoServerSelectionError, MongoTopologyClosedError } = require('mongodb');
const {connectTodb}=require('./db'); //for connection to database
const {authRouter}=require('./routers/authRoutes');
const { groupRouter } = require('./routers/groupRoutes');
const {postRouter}=require('./routers/postRoutes')
const {userRouter}=require('./routers/userRoutes');
const {consumeMessages}=require('./rabbitmq/worker')
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
    if(err instanceof MongoServerSelectionError){
        message="Connection Timeout!!!, Please try after sometim"
    }
    if(err instanceof MongoServerError){
        message="Database Error, Please check your inputs"
    }
    if(err instanceof MongoTopologyClosedError){
        message="Can't Connect to Database at the moment!!"
    }
    if(err instanceof FirebaseError){
        message=err.code.slice(5)
    }
    return res.status(status).json({message})
})

//undefined route
app.all('*',(req,res)=>{
    res.status(404).json({message:'Invalid Endpoint'})
})

//start the express app
app.listen(PORT,()=>{
    //db connection
    connectTodb()
    consumeMessages()
})

module.exports=app