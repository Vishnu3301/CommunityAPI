const amqp=require('amqplib')
const path = require('path')
require('dotenv').config({ path: path.resolve(__dirname, '../.env') })
async function consumeMessages(){
    const connection=await amqp.connect(process.env.AMQPURL)
    const channel=await connection.createChannel()
    const exchangeName=process.env.EXCHANGENAME
    await channel.assertExchange(exchangeName,process.env.EXCHANGETYPE)

    const q= await channel.assertQueue(process.env.WORKERQUEUE,{durable:true});
    await channel.bindQueue(q.queue,exchangeName,process.env.REWARD_SERVICE_BINDING_KEY)
                            //queue name,exchange name,binding key
    channel.consume(q.queue,msg=>{
        const data=JSON.parse(msg.content);
        const {logType,text,points}=data.message;
        console.log("Rewarded, Writing to database... ",text, points);
        channel.ack(msg)
    },{noAck:false})
}

consumeMessages()