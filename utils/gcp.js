const { CONSTANTS } = require('@firebase/util');
const {Storage}=require('@google-cloud/storage')
const dotenv=require('dotenv');
const path=require('path');
const serviceKey=path.join(__dirname,'../key.json')
dotenv.config()
const gc= new Storage({
    keyFilename:serviceKey,
    projectId:process.env.PROJECTID
})

const mybucket=gc.bucket(process.env.STORAGEBUCKET)
module.exports={gc,mybucket}