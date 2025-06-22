import { createContext, useContext } from 'react'

const UserContext = createContext(null)

export const useSession = () => useContext(UserContext)

export default UserContext
