import { useState, useEffect } from 'react'
import UserContext from '../context/UserContext'
import supabase from '../utils/supabaseClient'

function MyApp({ Component, pageProps }) {
  const [session, setSession] = useState(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })
    return () => subscription.unsubscribe()
  }, [])

  return (
    <UserContext.Provider value={session}>
      <Component {...pageProps} />
    </UserContext.Provider>
  )
}

export default MyApp
