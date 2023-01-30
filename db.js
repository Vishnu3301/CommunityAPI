const dotenv=require('dotenv');
const {MongoClient}=require('mongodb');

dotenv.config();
const uri = process.env.MONGO_URL
const client= new MongoClient(uri,{ useNewUrlParser: true, useUnifiedTopology: true });

async function connectTodb(){
    try{
        await client.connect();
        return "Connected to Cluster";
    }
    catch(err){
        console.log(err);
        return "Failed to Connect to the Cluster";
    }
}

module.exports={
    connectTodb,client
}