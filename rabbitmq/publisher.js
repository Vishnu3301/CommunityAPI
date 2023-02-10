const amqp=require('amqplib')
const path = require('path')
require('dotenv').config({ path: path.resolve(__dirname, '../.env') })
class Producer {
    channel;
    async createChannel(){
        const connection=await amqp.connect(process.env.AMQPURL);
        this.channel=await connection.createChannel()
    }


    async  publishMessage(routingKey,message){
        if(!this.channel){
            await this.createChannel()
        }
        const exchangeName= process.env.EXCHANGENAME;
        await this.channel.assertExchange(exchangeName,process.env.EXCHANGETYPE);

        const details={
            logType:routingKey,
            message:message,
        }
        await this.channel.publish(exchangeName,routingKey,Buffer.from(JSON.stringify(details)),{
            persistent:true
        })
        console.log("Sent to Exchange")
    }
}

module.exports=Producer