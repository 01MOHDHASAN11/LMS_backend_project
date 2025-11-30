import jwt, { decode } from "jsonwebtoken"
import userAuth from "../model/user.model.js"
import redisClient from "../config/redis.js";


export const verifyToken = async (req, res, next) => {
  try {
    const userCookie = req.cookies.refreshToken
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Access token missing" });
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.ACCESS_TOKEN);
    if (!decoded) return res.status(401).json({ message: "Invalid token" });
    const userSession = redisClient.get(`session:${decoded.userId}`)
    if(!userSession){
      res.clearCookie("refreshToken",{httpOnly:true,sameSite:"strict"})
      await redisClient.del(`accessToken:${decoded.userId}`)
      await redisClient.del(`refreshToken:${decoded.userId}`)
      res.status(401).json({message:"Session expired! please login again"})
    }
    const storedAccessToken = await redisClient.get(`accessToken:${decoded.userId}`);
    if (!storedAccessToken || storedAccessToken !== token) {
      return res.status(401).json({ message: "Invalid or expired session" });
    }

    const remainingUserSessionTime = redisClient.ttl(`session:${decoded.userId}`)
    if(remainingUserSessionTime>0 && remainingUserSessionTime<900){
      redisClient.expire(userSession,7*24*60*60)
    }

    const user = await userAuth.findById(decoded.userId).select("-password");
    if (!user) return res.status(404).json({ message: "User not found" });

    req.user = user;
    next();
  } catch (err) {
    return res.status(403).json({ message: "Invalid or expired token", error: err.message });
  }
};
