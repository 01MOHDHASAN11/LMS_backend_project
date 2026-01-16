import basicAuth from "express-basic-auth";

export const bullBoardAuth = basicAuth({
  users: {
    admin: process.env.BULLBOARD_USER || "admin",
  },
  challenge: true,
  unauthorizedResponse: "Unauthorized",
  authorizer: (username, password) => {
    const validUser = username === (process.env.BULLBOARD_USER || "admin");
    const validPass = password === (process.env.BULLBOARD_PASS || "admin123");

    return validUser && validPass;
  },
});
