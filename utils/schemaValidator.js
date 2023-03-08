const {z}=require('zod');
const {generateErrorMessage}=require('zod-error')
const userSignup= z.object({
    username: z.string().min(6),
    email: z.string().email(),
    password:z.string().min(6)
}).strict()

const userLogin= z.object({
    email: z.string().email(),
    password: z.string().min(6)
}).strict()

module.exports= {userSignup,userLogin}