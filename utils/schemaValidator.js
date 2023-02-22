const {z}=require('zod');
const {generateErrorMessage}=require('zod-error')
const User= z.object({
    name: z.string(),
    username: z.string(),
    email: z.string().email(),
    gender: z.enum(['male','female']),
    profession: z.string().nullable().optional(),
    mobile: z.number().nullable().optional(),
    location: z.string().nullable().optional()
})

module.exports= {User}