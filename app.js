const express=require('express'); //require express
const {connectTodb,client}=require('./db'); //for connection to database
const userRouter=require('./routers/userRoutes')
const app=express();
const PORT=process.env.PORT || 3000


//middleware
app.use(express.json())
//user signup and login logic
app.use('/api/auth',userRouter);

//start the express app
app.listen(PORT,()=>{
    //uncomment database connectivity once user profile is mapped in mongodb code is done
    // connectTodb()
    // .then(data=>{
    //     console.log(data);
    // })
    console.log(`Listening on port ${PORT}`)
})