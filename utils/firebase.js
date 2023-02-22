const firebase=require('firebase');
const path=require('path')
require('dotenv').config({path:path.resolve(__dirname+'../.env')})

const firebaseConfig={
    apiKey: process.env.APIKEY,
    authDomain: process.env.AUTHDOMAIN,
    projectId: process.env.PROJECTID,
    storageBucket: process.env.STORAGEBUCKET,
    messagingSenderId: process.env.MESSAGINGSENDERID,
    appId: process.env.APPID,
    measurementId: process.env.MEASUREMENTID
};
const db=firebase.initalizeApp(firebaseConfig);

module.exports={db};