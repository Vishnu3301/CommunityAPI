const amqp=require('amqplib')
const path = require('path')
require('dotenv').config({ path: path.resolve(__dirname, '../.env') })
let {transport,mailOptions}=require('../utils/mailerService')


async function consumeMessages(){
    const connection=await amqp.connect(process.env.AMQPURL)
    const channel=await connection.createChannel()
    await channel.assertQueue(process.env.MAILINGQUEUE,{durable:true});
    channel.consume(process.env.MAILINGQUEUE,async (msg)=>{
        const data=JSON.parse(msg.content);
        const {receiver:to,body:text}=data
        mailOptions={...mailOptions,to,text}
        await transport.sendMail(mailOptions)
        channel.ack(msg)
    },{noAck:false})
}

consumeMessages()