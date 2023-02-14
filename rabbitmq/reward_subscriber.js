//code refactoring is required in this file
// aim - to write  dry code

const amqp=require('amqplib')
const path = require('path')
require('dotenv').config({ path: path.resolve(__dirname, '../.env') })
const {getClient}=require('../db')
const client=getClient();
const _db=client.db('Communityapi')

async function rewardTwoUsers(userid1,userid2,points){
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
        console.log("Reward credited to both users")
    }
    catch(error){
        return error
    }
}

async function rewardOneUser(userid1,points){
    try{
        await _db.collection('rewards').updateOne({userid:userid1},{
            $inc:{points: points}
        },{
            upsert:true
        })
        console.log("Reward credited to the user")
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
        const {type,points,userid1,userid2}=data;
        if(type==='debit'){
            points=-1*points
        }
        if(userid1 && userid2){
            //means we have 2 userids in the object
            //this means a route to make a comment/reply to comment/ follow a user is accessed
            //so we have to reward both the users with specified number of points
            try{
                await rewardTwoUsers(userid1,userid2,points)
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
                await rewardOneUser(userid1,points)
                channel.ack(msg)
            }
            catch(error){
                console.log(error);
            }

        }
    },{noAck:false})
}

consumeMessages()