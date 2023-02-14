const amqp=require('amqplib')
const path = require('path')
require('dotenv').config({ path: path.resolve(__dirname, '../.env') })
let channel

async function  sendToMailingQueue(queue,message){
    const connection=await amqp.connect(process.env.AMQPURL)
    channel=await connection.createChannel()
    await channel.assertQueue(queue,{durable:true})
    channel.sendToQueue(queue,Buffer.from(JSON.stringify(message)),{
        persistent:true
    })
    console.log(`Sent to ${queue}`)
}


module.exports={ sendToMailingQueue }