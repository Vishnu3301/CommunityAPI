const dotenv=require('dotenv');
const {MongoClient}=require('mongodb');

dotenv.config();
const uri = process.env.MONGO_URL
const client= new MongoClient(uri,{ useNewUrlParser: true, useUnifiedTopology: true });

async function connectTodb(){
    await client.connect();
}

module.exports={
    connectTodb,
    getClient: ()=>{
        return client;
    }
}