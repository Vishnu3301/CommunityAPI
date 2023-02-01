const express=require('express'); //require express
const {connectTodb}=require('./db'); //for connection to database
const userRouter=require('./routers/userRoutes')
const postRouter=require('./routers/postRoutes')
const app=express();
const PORT=process.env.PORT || 3000


//middleware
app.use(express.json())
//user signup and login logic
app.use('/api/auth',userRouter);
app.use('/api/posts',postRouter)

//start the express app
app.listen(PORT,()=>{
    //db connection
    connectTodb()
    .then(data=>{
        console.log(data);
    })
    console.log(`Listening on port ${PORT}`)
})