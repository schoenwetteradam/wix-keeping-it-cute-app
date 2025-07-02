import { useRouter } from 'next/router'
import NavBar from './NavBar'

export default function Layout({ children }) {
  const router = useRouter()
  const hideNavRoutes = ['/login', '/signup']
  const showNav = !hideNavRoutes.includes(router.pathname)

  return (
    <>
      {showNav && <NavBar />}
      <main className="container" style={{ paddingTop: showNav ? '1rem' : 0 }}>
        {children}
      </main>
    </>
  )
}
