const {z}=require('zod');
const {generateErrorMessage}=require('zod-error')
const userSignup= z.object({
    name: z.string(),
    username: z.string(),
    email: z.string().email(),
    gender: z.enum(['male','female']),
    profession: z.string().nullable().optional(),
    mobile: z.number().nullable().optional(),
    location: z.string().nullable().optional()
})

const userLogin= z.object({
    email: z.string().email(),
    password: z.string().min(6)
}).strict()

module.exports= {userSignup,userLogin}