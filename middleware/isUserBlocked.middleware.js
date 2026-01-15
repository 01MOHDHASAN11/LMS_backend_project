import userAuth from "../model/user.model.js";

export const isUserBlocked = async (req, res, next) => {
  const email = req.body.email;
  if (!email) return res.status(400).json({ message: "Email is required" });
  const user = await userAuth.findOne({ email });
  if (!user) return next();
  if (user.isBlocked && Date.now() < user.blockedUntil) {
    return res
      .status(401)
      .json({
        message: "Your account has been blocked by the admin",
        reason: user.blockReason,
      });
  }
  if (user.isBlocked && Date.now() > user.blockedUntil) {
    (user.isBlocked = false), (user.blockedUntil = null);
    await user.save();
  }
  next();
};
