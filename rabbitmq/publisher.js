const amqp=require('amqplib')
const path = require('path')
require('dotenv').config({ path: path.resolve(__dirname, '../.env') })
let channel

async function createChannel(){
    const connection=await amqp.connect(process.env.AMQPURL)
    channel=await connection.createChannel()
}

async function  sendToWorkerQueue(queue,message){
    if(!channel){
        await createChannel()
    }
    await channel.assertQueue(queue,{durable:true})
    channel.sendToQueue(queue,Buffer.from(JSON.stringify(message)),{
        persistent:true
    })
}


module.exports={ sendToWorkerQueue }