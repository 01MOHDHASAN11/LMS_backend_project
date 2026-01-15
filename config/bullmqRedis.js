import dotenv from "dotenv"
dotenv.config()
export const bullRedisConfig = {
    url: process.env.REDIS_URL
}