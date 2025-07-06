import { useState, useEffect, useRef } from 'react'
import Head from 'next/head'
import { createClient } from '@supabase/supabase-js'
import StaffNavBar from '../components/StaffNavBar'
import useRequireSupabaseAuth from '../utils/useRequireSupabaseAuth'

export default function StaffChat() {
  useRequireSupabaseAuth()
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!supabaseUrl || !supabaseAnonKey) {
    return (
      <p style={{ padding: '2rem', textAlign: 'center' }}>
        Missing Supabase environment variables. Copy <code>.env.example</code> to{' '}
        <code>.env.local</code> and set <code>NEXT_PUBLIC_SUPABASE_URL</code> and{' '}
        <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code>.
      </p>
    )
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey)

  const [branding, setBranding] = useState(null)
  const [messages, setMessages] = useState([])
  const [newMessage, setNewMessage] = useState('')
  const bottomRef = useRef(null)

  useEffect(() => {
    loadBranding()
    fetchMessages()

    const channel = supabase
      .channel('staff_chat')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'staff_chat_messages' },
        (payload) => {
          setMessages((msgs) => [...msgs, payload.new])
        }
      )
      .subscribe()

    return () => {
      channel.unsubscribe()
    }
  }, [])

  const loadBranding = async () => {
    try {
      const res = await fetch('/api/get-branding')
      if (res.ok) {
        const data = await res.json()
        setBranding(data.branding)
      }
    } catch (err) {
      console.error('Failed to load branding', err)
    }
  }

  const fetchMessages = async () => {
    try {
      const res = await fetch('/api/staff-chat')
      if (res.ok) {
        const data = await res.json()
        setMessages(data.messages || [])
      }
    } catch (err) {
      console.error('Failed to load messages', err)
    }
  }

  const sendMessage = async () => {
    if (!newMessage.trim()) return
    try {
      await fetch('/api/staff-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newMessage })
      })
      setNewMessage('')
    } catch (err) {
      console.error('Failed to send message', err)
    }
  }

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  return (
    <>
      <Head>
        <title>Staff Chat - {branding?.salon_name || 'Keeping It Cute Salon'}</title>
      </Head>
      <StaffNavBar branding={branding} activeTab="chat" />
      <div style={{ fontFamily: 'Arial, sans-serif', backgroundColor: '#f8f9fa', minHeight: '100vh', padding: '20px' }}>
        <div style={{ maxWidth: '800px', margin: '0 auto', background: 'white', borderRadius: '8px', padding: '20px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
          <h1 style={{ marginTop: 0 }}>💬 Staff Chat</h1>
          <div style={{ maxHeight: '60vh', overflowY: 'auto', marginBottom: '20px' }}>
            {messages.map(msg => (
              <div key={msg.id} style={{ marginBottom: '10px' }}>
                <strong>{msg.username || 'Staff'}:</strong> {msg.content}
              </div>
            ))}
            <div ref={bottomRef} />
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <input
              type="text"
              value={newMessage}
              onChange={e => setNewMessage(e.target.value)}
              placeholder="Type a message..."
              style={{ flex: 1, padding: '10px', border: '1px solid #ddd', borderRadius: '4px' }}
            />
            <button
              onClick={sendMessage}
              style={{ padding: '10px 20px', background: '#e0cdbb', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
            >
              Send
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
