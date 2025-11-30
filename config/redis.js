import {createClient} from "redis"

const redisClient = await createClient({
    url: process.env.REDIS_URL || "redis://localhost:6379"
}).on("error",(err)=>console.log("Error is redis client: ",err)).connect()

export default redisClient

