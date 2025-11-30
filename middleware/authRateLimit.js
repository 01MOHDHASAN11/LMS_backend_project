import redisClient from "../config/redis.js"

export function authLimiter({keyPrefix,maxEmail,maxIP,windowInSeconds}){
    return async(req,res,next) => {
    const userIP = req.ip
    const userMail = req.body.email
    const emailKey = userMail ? `${keyPrefix}:email:${userMail}` : null
    const ipKey = `${keyPrefix}:ip:${userIP}`
    let currRequestFromIP = await redisClient.incr(ipKey)
    let currentRequest = await redisClient.incr(emailKey)
    
    if(currRequestFromIP===1){
        await redisClient.expire(ipKey,windowInSeconds)
    }

    if(currentRequest===1){
        await redisClient.expire(emailKey,windowInSeconds)
    }

    if(currRequestFromIP>maxIP){
        // let remainingTTLForIP = await redisClient.ttl(userIP)
        return res.status(429).json({message:`To many request from the same IP, Please retry after a break`})
    }

    if(currentRequest>maxEmail){
        // let remainingTime=await redisClient.ttl(key)
        return res.status(429).json({message:`Too many requests Please retry after a break`})
    }
    next()
}
}
