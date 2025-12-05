import multer from "multer";
import path from "path"
import fs from "fs"
import {fileURLToPath} from "url"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
// console.log(__dirname)
const storage = multer.diskStorage({
    destination:(req,file,cb)=>{
        const folder = path.join(__dirname,"..","videoUpload")
        if(!fs.existsSync(folder)){
            fs.mkdirSync(folder,{recursive:true},(err)=>{
                if(err){
                    return err
                }
            })
            console.log("Video upload folder created successfully")
        }
        cb(null,folder)
    },
    filename:(req,file,cb)=>{
        const allowedExtensions = [".mp4", ".mkv", ".mov", ".webm"];
        const allowedMime = ["video/mp4", "video/mkv", "video/webm", "video/quicktime"];
        const ext = path.extname(file.originalname).toLowerCase()
        if(!allowedExtensions.includes(ext)){
            return cb(new Error("Only .mp4, .mkv, .mov, .webm format is allowed"),null)
        } 
        if(!allowedMime.includes(file.mimetype)){
            return cb(new Error("Invalid video format"),null)
        }
        cb(null,`${file.originalname.split(".")[0]}${Date.now()}${ext}`)

    }
})

export const upload = multer({storage,limits:{fileSize:100*1024*1024}})