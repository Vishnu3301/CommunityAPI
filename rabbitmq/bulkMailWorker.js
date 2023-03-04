const amqp=require('amqplib')
const path = require('path')
require('dotenv').config({ path: path.resolve(__dirname, '../.env') })
let {transport,mailOptions}=require('../utils/mailerService')
const {getClient}=require('../db');
const client=getClient();
const _db=client.db(process.env.DBNAME)

async function consumeMessages(){
    const connection=await amqp.connect(process.env.AMQPURL)
    const channel=await connection.createChannel()
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
            try{
                toEmails.forEach(async (mail)=>{
                    let useCaseMailOptions={...mailOptions,to:mail}
                    await transport.sendMail(useCaseMailOptions)
                    console.log(`(BulkMail) Mail sent to ${mail}`)
                })
                channel.ack(msg)
            }
            catch(error){
                console.log(error)
            }
        }
        else{
            console.log("NO followers")
        }
    },{noAck:false})
}

consumeMessages()