import multer from "multer";
import fs from "fs"
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const storage = multer.diskStorage({
    destination:(req,file,cb)=>{
        const folder = path.join(__dirname,"..","thumbNailUploads")
        if(!fs.existsSync(folder)){
            fs.mkdirSync(folder,{recursive:true},(err)=>{
                if(err){
                    return err
                }
                console.log("Thumbnail folder created successfully")
            })
        }
        cb(null,folder)
    },
    filename:(req,file,cb)=>{
        const allowedExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.avif'];
        const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'];
        const extName = path.extname(file.originalname).toLowerCase()
        if(!allowedExtensions.includes(extName)){
            return cb(new Error("Only '.jpg', '.jpeg', '.png', '.webp', '.avif' extensions are allowed"),null)
        }
        if(!allowedMimeTypes.includes(file.mimetype)){
            return cb(new Error("Only 'image/jpeg', 'image/png', 'image/webp', 'image/avif' mimeType are allowed"),null)
        }
        cb(null,`${file.originalname.split(".")[0]}${Date.now()}${extName}`)

    }
})

export const thumbNailUpload = multer({storage,limits:{fileSize:5*1024*1024}})