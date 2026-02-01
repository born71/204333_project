import { useState, useEffect, useRef } from 'react'
import './App.css'
import pb from './lib/pocketbase'

function App() {
  const [currentUser, setCurrentUser] = useState(null) // เก็บ User Object จาก PocketBase
  const [isLoggedIn, setIsLoggedIn] = useState(false)

  // Login Form States
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loginError, setLoginError] = useState('')

  const [target, setTarget] = useState('')
  const [messages, setMessages] = useState([])
  const [inputValue, setInputValue] = useState('')
  const [connectionStatus, setConnectionStatus] = useState('Disconnected')

  const ws = useRef(null)
  const messagesEndRef = useRef(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // connect to WS
  useEffect(() => {
    if (isLoggedIn && currentUser?.id) {
      ws.current = new WebSocket(`ws://localhost:8000/ws/${currentUser.name}`)

      ws.current.onopen = () => {
        setConnectionStatus('Connected')
      }

      ws.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          console.log(data)
          if (data.type === 'chat' && data.message) {
            setMessages(prev => [...prev, { id: Date.now(), message: data.message, sender: 'them' }])
          }
        } catch (e) {
          // ignore
        }
      }

      ws.current.onclose = () => setConnectionStatus('Disconnected')

      return () => {
        if (ws.current) ws.current.close()
      }
    }
  }, [isLoggedIn, currentUser])

  // fetch history when target changes
  useEffect(() => {
    async function loadHistory() {
      if (!target || !currentUser) return;

      try {
        const targetUserRecord = await pb.collection('users').getFirstListItem(`name="${target}"`)

        const history = await pb.collection('messages').getList(1, 50, {
          filter: `(sender="${currentUser.id}" && receiver="${targetUserRecord.id}") || (sender="${targetUserRecord.id}" && receiver="${currentUser.id}")`,
          sort: 'created',
          expand: 'sender'
        })

        const formatted = history.items.map(m => ({
          id: m.id,
          message: m.message,
          sender: m.sender === currentUser.id ? 'me' : 'them'
        }))

        setMessages(formatted)

      } catch (err) {
        console.log("No history found or user not found:", err)
        setMessages([])
      }
    }

    const timer = setTimeout(loadHistory, 500)
    return () => clearTimeout(timer)
  }, [target, currentUser])

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoginError('')

    try {
      const authData = await pb.collection('users').authWithPassword(email, password)

      alert('Login Success!')
      setCurrentUser(authData.record)
      setIsLoggedIn(true)

    } catch (err) {
      console.error('Login failed:', err)
      setLoginError('Invalid email or password')
    }
  }

  const handleLogout = () => {
    pb.authStore.clear()
    setIsLoggedIn(false)
    setCurrentUser(null)
    setMessages([])
  }

  const handleSendMessage = async (e) => {
    e.preventDefault()
    if (!inputValue.trim() || !target.trim()) return

    try {
      const targetUserRecord = await pb.collection('users').getFirstListItem(`name="${target}"`)

      await pb.collection('messages').create({
        message: inputValue,
        sender: currentUser.id,
        receiver: targetUserRecord.id
      })

      const payload = {
        target_id: target,
        message: inputValue
      }

      if (ws.current && ws.current.readyState === WebSocket.OPEN) {
        ws.current.send(JSON.stringify(payload))

        setMessages(prev => [...prev, { id: Date.now(), message: inputValue, sender: 'me' }])
        setInputValue('')
      } else {
        alert('WebSocket is not connected')
      }

    } catch (err) {
      console.error("Failed to send:", err)
      alert("Error sending message (Target user not found?)")
    }
  }

  if (!isLoggedIn) {
    return (
      <div className="login-container" style={{ padding: '50px', maxWidth: '400px', margin: '0 auto', textAlign: 'center' }}>
        <h2>Login to Chat</h2>
        {loginError && <p style={{ color: 'red' }}>{loginError}</p>}

        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            style={{ padding: '10px', fontSize: '16px' }}
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            style={{ padding: '10px', fontSize: '16px' }}
            required
          />
          <button type="submit" style={{ padding: '10px 20px', cursor: 'pointer' }}>Login</button>
        </form>
      </div>
    )
  }

  return (
    <div className="app-container">
      {/* sidebar */}
      <div className="sidebar">
        <div className="sidebar-header" style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <h3 style={{ margin: 0 }}>{currentUser.name || currentUser.email}</h3>
            <span style={{ fontSize: '10px', color: '#aaa' }}>ID: {currentUser.id}</span>
            <span style={{ fontSize: '12px', color: connectionStatus === 'Connected' ? 'green' : 'red' }}>
              ● {connectionStatus}
            </span>
          </div>
          <button onClick={handleLogout} style={{ padding: '5px 10px', fontSize: '12px', alignSelf: 'center' }}>Logout</button>
        </div>

        <div style={{ padding: '20px' }}>
          <label style={{ display: 'block', marginBottom: '10px', color: '#fff' }}>Chat with:</label>
          <input
            type="text"
            placeholder="Target User"
            value={target}
            onChange={e => setTarget(e.target.value)}
            className="chat-input"
            style={{ width: '80%', marginBottom: '20px' }}
          />
          <p style={{ fontSize: '12px', color: '#aaa' }}>
            Input username to chat.
          </p>
        </div>
      </div>

      {/* chat */}
      <div className="chat-area">
        <div className="chat-header">
          <h3>Chatting with {target || '...'}</h3>
        </div>

        <div className="messages-list">
          {messages.map((msg, index) => (
            <div key={index} className={`message ${msg.sender === 'me' ? 'sent' : 'received'}`}>
              {msg.message}
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        <form className="chat-input-area" onSubmit={handleSendMessage}>
          <input
            type="text"
            className="chat-input"
            placeholder="Say something..."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
          />
          <button type="submit" className="send-button">
            <i className="fa fa-paper-plane" aria-hidden="true"></i>
          </button>
        </form>
      </div>
    </div>
  )
}

export default App
