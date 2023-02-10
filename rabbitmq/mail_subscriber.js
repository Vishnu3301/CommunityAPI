const amqp=require('amqplib')
const path = require('path')
require('dotenv').config({ path: path.resolve(__dirname, '../.env') })
let {transport,mailOptions}=require('../mailerService')


async function consumeMessages(){
    const connection=await amqp.connect(process.env.AMQPURL)
    const channel=await connection.createChannel()
    const exchangeName=process.env.EXCHANGENAME
    await channel.assertExchange(exchangeName,process.env.EXCHANGETYPE)

    const q= await channel.assertQueue(process.env.MAILINGQUEUE,{durable:true});
    await channel.bindQueue(q.queue,exchangeName,process.env.MAILING_SERVICE_BINDING_KEY)
                            //queue name,exchange name,binding key
    channel.consume(q.queue,msg=>{
        const data=JSON.parse(msg.content);
        const {logType,receiver:to,body:text}=data.message
        mailOptions={...mailOptions,to,text}
        transport.sendMail(mailOptions)
        .then(data=>{
            console.log("Mail sent to ",to);
        })
        .catch(error=>{
            console.log(error)
        })
        channel.ack(msg)
    },{noAck:false})
}

consumeMessages()