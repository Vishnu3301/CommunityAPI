//code refactoring is required in this file
// aim - to write  dry code

const amqp=require('amqplib')
const path = require('path')
require('dotenv').config({ path: path.resolve(__dirname, '../.env') })
const {logger}=require('../utils/logger')
const {getClient}=require('../db')
const client=getClient();
const _db=client.db(process.env.DBNAME)

async function rewardTwoUsers(type,userid1,userid2,points){
    try{
        await _db.collection('rewards').updateOne({userid:userid1},{
            $inc:{points: points}
        },{
            upsert:true
        })
        await _db.collection('rewards').updateOne({userid:userid2},{
            $inc:{points: points}
        },{
            upsert:true
        })
        console.log(`Reward ${type}ed to both users`)
        // const user1Doc=await _db.collection('userInfo').findOne({userid:userid1})
        // const user2Doc=await _db.collection('userInfo').findOne({userid:userid2})
        // const username1=user1Doc.username,username2=user2Doc.username
        logger.info(`Reward of type - ${type} and points - ${points} is processed for two users`)
    }
    catch(error){
        return error
    }
}

async function rewardOneUser(type,userid1,points){
    try{
        await _db.collection('rewards').updateOne({userid:userid1},{
            $inc:{points: points}
        },{
            upsert:true
        })
        console.log(`Reward ${type}ed to the user`)
        const user1Doc=await _db.collection('userInfo').findOne({userid:userid1})
        const username1=user1Doc.username
        logger.info(`Reward of type - ${type} and points - ${points} is processed for one user`)
    }
    catch(error){
        return error
    }
}
async function consumeMessages(){
    const connection=await amqp.connect(process.env.AMQPURL)
    const channel=await connection.createChannel()
    await channel.assertQueue(process.env.REWARDQUEUE,{durable:true});
    channel.consume(process.env.REWARDQUEUE,async (msg)=>{
        const data=JSON.parse(msg.content);
        const {type,userid1,userid2}=data;
        let {points}=data;
        if(type==='debit'){
            points=-1*points
        }
        if(userid1 && userid2){
            //means we have 2 userids in the object
            //this means a route to make a comment/reply to comment/ follow a user is accessed
            //so we have to reward both the users with specified number of points
            try{
                await rewardTwoUsers(type,userid1,userid2,points)
                channel.ack(msg)
            }
            catch(error){
                console.log(error);
            }

        }
        else{
            //only userid1 exists in the object
            //this means a route to make post (either a public post or a post in a group )is accessed
            //so we have to reward only the post creator
            try{
                await rewardOneUser(type,userid1,points)
                channel.ack(msg)
            }
            catch(error){
                console.log(error);
            }

        }
    },{noAck:false})
}

consumeMessages()