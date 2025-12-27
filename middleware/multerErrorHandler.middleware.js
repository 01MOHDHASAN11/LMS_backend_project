import multer from "multer"

export const multerUploadErrorHandler = (err,req,res,next) => {
    if(err instanceof multer.MulterError){
        if(err.code==="LIMIT_FILE_SIZE"){
            return res.status(400).json({success:false,message:"File max size must be under 5MB"})
        }
        if(err.code==="LIMIT_UNEXPECTED_FILE"){
            return res.status(400).json({success:false,message:"Only one resume must be uploaded"})
        }
        if(err.code==="LIMIT_FILE_COUNT"){
            return res.status(400).json({success:false,message:"Too many videos for upload"})
        }

        if(
            err.message==="Only pdf files are allowed" 
            || "Only '.jpg', '.jpeg', '.png', '.webp', '.avif' extensions are allowed" 
            || "Only 'image/jpeg', 'image/png', 'image/webp', 'image/avif' mimeType are allowed"
            || "Only .mp4, .mkv, .mov, .webm format is allowed"
            || "Invalid video format"   
        ){
            return res.status(400).json({success:false,message:err.message})
        }
        
    }
    return next(err)
}


