import { useRouter } from 'next/router'
import NavBar from './NavBar'
import { Analytics } from "@vercel/analytics/next"

export default function Layout({ children }) {
  const router = useRouter()
  const hideNavRoutes = ['/login', '/signup']
  const showNav = !hideNavRoutes.includes(router.pathname)

  return (
    <>
      {showNav && <NavBar />}
      <main className="container">{children}</main>
      <Analytics />
    </>
  )
}
