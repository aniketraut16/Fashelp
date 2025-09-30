import { clerkClient, getAuth } from "@clerk/express";
import prisma from "../config/prisma";

const AuthenticateUser = async (req, res) => {
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
};

export default { AuthenticateUser };
