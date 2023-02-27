
const path=require('path')
require('dotenv').config({path:path.resolve(__dirname+'../.env')})

const cloudinary=require('cloudinary').v2
cloudinary.config({
    cloud_name: process.env.CLOUDNAME,
    api_key:process.env.CLOUDINARYAPIKEY,
    api_secret:process.env.APISECRET
})

module.exports={cloudinary}