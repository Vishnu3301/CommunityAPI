const {createLogger,format,transports}=require('winston')
const path = require('path')
require('dotenv').config({ path: path.resolve(__dirname, '../.env') })

require('winston-mongodb')
const uri = process.env.MONGO_URL;
const logger=createLogger({
    transports:[
        new transports.MongoDB({
            level:"info",
            db:uri,
            dbName:process.env.LOGSDBNAME,
            options:{
                useUnifiedTopology:true
            },
            collection:process.env.LOGSCOLLECTION,
            format:format.combine(
                format.timestamp(),
                format.json(),
                format.metadata()
            )
        })
    ]
})

module.exports={logger}