const multer=require('multer')
const {MulterError}=require('multer')
const path=require('path')
const { ExpressError } = require('./customErrorHandler')
require('dotenv').config({path:path.resolve(__dirname+'../.env')})

const imageExtensions=['.jpeg','.jpg','.png']

const attatchementExtensions=['.jpeg','.jpg','.png','.py','.cpp','.pdf','.js']

const storage=multer.diskStorage({
    filename:(req,file,cb)=>{
        cb(null,file.fieldname+'_'+new Date().valueOf()+path.extname(file.originalname))

    }
})

const imageUploader= multer({
    storage:storage,
    fileFilter: (req,file,cb)=>{
        let ext=path.extname(file.originalname);
        if(!imageExtensions.includes(ext)){
            cb(new MulterError(400,'UnSupported File Extension for an image'),false)
        }
        cb(null,true)
    }
}).single('image')

const attachmentFilesUploader= multer({
    storage:storage,
    fileFilter: (req,file,cb)=>{
        let ext=path.extname(file.originalname);
        if(!attatchementExtensions.includes(ext)){
            cb(new MulterError(400,'UnSupported File Extension of attatched file'),false)
        }
        cb(null,true)
    }
}).single('file')

function multerImageUploader(req,res,next){
    imageUploader(req,res,function(err){
        if(err instanceof MulterError){
            return res.status(400).json({message:err.field})
        }
        else if(err){
            return res.status(501).json({"message":"Server side error - Can't upload image at the moment"})
        }
        next()
    })
}

function multerAttachmentFileUploader(req,res,next){
    attachmentFilesUploader(req,res,function(err){
        if(err instanceof MulterError){
            return res.status(400).json({message:err.field})
        }
        else if(err){
            return res.status(501).json({"message":"Server side error - Can't attatch file  at the moment"})
        }
        next()
    })
}

module.exports ={ multerImageUploader, multerAttachmentFileUploader}

