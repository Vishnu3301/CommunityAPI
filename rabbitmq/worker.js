const amqp=require('amqplib')
const path = require('path')
require('dotenv').config({ path: path.resolve(__dirname, '../.env') })
let {transport,mailOptions}=require('../utils/mailerService')
const {getClient}=require('../db');
const client=getClient();
const _db=client.db(process.env.DBNAME)
const {logger}=require('../utils/logger')

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
        // console.log(`Reward ${type}ed to both users`)
        const user1Doc=await _db.collection('userInfo').findOne({userid:userid1})
        const user2Doc=await _db.collection('userInfo').findOne({userid:userid2})
        const username1=user1Doc.username,username2=user2Doc.username
        logger.info(`Reward of type - ${type} and points - ${points} is processed for two users`,{users:[username1,username2]})
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
        // console.log(`Reward ${type}ed to the user`)
        const user1Doc=await _db.collection('userInfo').findOne({userid:userid1})
        const username1=user1Doc.username
        logger.info(`Reward of type - ${type} and points - ${points} is processed for one user`,{users:[username1]})
    }
    catch(error){
        return error
    }
}


async function consumeMessages(){
    const connection=await amqp.connect(process.env.AMQPURL)
    const channel=await connection.createChannel()
    //bulk mailing worker
    await channel.assertQueue(process.env.BULKMAILINGQUEUE,{durable:true});
    channel.consume(process.env.BULKMAILINGQUEUE, async (msg)=>{
        const data=JSON.parse(msg.content);
        const {creatorid:firebaseuserid}=data
        //get the  emails of all the followers of this post creator
        const followers= await _db.collection('follows').aggregate([
            {
                $match:{followedid:firebaseuserid}
            },
            {
                $project:{_id:0,followeremail:1}
            }
        ]).toArray()
        if(followers.length!=0){
            const toEmails= followers.map(obj=>{
                return obj.followeremail
            })
            const userObject=await _db.collection('userInfo').findOne({userid:firebaseuserid})
            const username=userObject.username
            let text=`${username} just created a post`
            mailOptions={...mailOptions,text}
            toEmails.forEach(async (mail)=>{
                let useCaseMailOptions={...mailOptions,to:mail}
                await transport.sendMail(useCaseMailOptions)
            })
        }
        channel.ack(msg)
    },{noAck:false})

    //mailworker

    await channel.assertQueue(process.env.MAILINGQUEUE,{durable:true});
    channel.consume(process.env.MAILINGQUEUE,async (msg)=>{
        const data=JSON.parse(msg.content);
        const {receiver:to,body:text}=data
        mailOptions={...mailOptions,to,text}
        await transport.sendMail(mailOptions)
        channel.ack(msg)
    },{noAck:false})

    //reward worker

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
            await rewardTwoUsers(type,userid1,userid2,points)
            channel.ack(msg)

        }
        else{
            //only userid1 exists in the object
            //this means a route to make post (either a public post or a post in a group )is accessed
            //so we have to reward only the post creator
            await rewardOneUser(type,userid1,points)
            channel.ack(msg)

        }
    },{noAck:false})


}

module.exports={consumeMessages}