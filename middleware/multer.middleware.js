import multer from "multer"
import path from "path"
import fs from "fs"

import { fileURLToPath } from "url";

// Recreate __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


const storage = multer.diskStorage({
    destination:(req,file,cb)=>{
        const folder = path.join(__dirname,"..","uploads")
        if(!fs.existsSync(folder)){
            fs.mkdirSync(folder,{recursive:true},(err)=>{
                if(err){
                    return err
                }
                console.log("Uploads folder created successfully")
            })
        }
        cb(null,folder)
    },
    filename:(req,file,cb)=>{
        if(file.mimetype==="application/pdf"){
            let ext = file.originalname.split(".")[1]
            let fileName = file.originalname.split(".")[0]
            cb(null,`${fileName}+${Date.now()}.${ext}`)
        }
        else{
            cb(new Error("Only pdf files are allowed"),null)
        }
    }
})

const upload = multer({storage,limits:{fileSize:5*1024*1024}})
export default upload