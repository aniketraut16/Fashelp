import { clerkClient, getAuth } from '@clerk/express'

const AuthenticateUser =  async  (req, res) => {
  const { isAuthenticated, userId } = getAuth(req)

  if (!isAuthenticated) {
    return res.status(401).json({ error: 'User not authenticated' })
  }
  const user = await clerkClient.users.getUser(userId)

  return res.json(user)
}

export default { AuthenticateUser }