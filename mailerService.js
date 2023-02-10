const nodemailer=require('nodemailer')
const dotenv=require('dotenv')
dotenv.config()
const transport=nodemailer.createTransport({
    service:process.env.SERVICE,
    auth:{
        user:process.env.USEREMAIL,
        pass:process.env.PASS
    }
})

let mailOptions={
    from:process.env.USEREMAIL,
    subject:"Social Media",
}


module.exports ={ transport,mailOptions }
