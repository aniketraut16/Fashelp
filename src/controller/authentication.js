import { clerkClient, getAuth } from "@clerk/express";
import prisma from "../config/prisma.js";

const AuthenticateUser = async (req, res) => {
  try {
    const { isAuthenticated, userId } = getAuth(req);

    if (!isAuthenticated) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    const user = await clerkClient.users.getUser(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const dbUser = await prisma.users.findUnique({
      where: { id: user.id },
    });
    if (!dbUser) {
      await prisma.users.create({
        data: {
          id: user.id,
          email: user.emailAddresses[0].emailAddress,
          first_name: user.firstName || "",
          last_name: user.lastName || "",
        },
      });
      return res.status(201).json({
        message: "Signed up successfully",
      });
    }

    return res.status(200).json({
      message: "User authenticated successfully",
    });
  } catch (error) {
    console.error("Error during authentication:", error);
    return res.status(500).json({ error: "Internal server error" }); // Internal Server Error
  }
};

export default { AuthenticateUser };
