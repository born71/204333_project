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

  const [targetId, setTargetId] = useState('')
  const [messages, setMessages] = useState([])
  const [inputValue, setInputValue] = useState('')
  const [connectionStatus, setConnectionStatus] = useState('Disconnected')

  const ws = useRef(null)

  // connect to WS
  useEffect(() => {
    if (isLoggedIn && currentUser?.name) {
      ws.current = new WebSocket(`ws://localhost:8000/ws/${currentUser.name}`)

      ws.current.onopen = () => {
        setConnectionStatus('Connected')
      }

      ws.current.onmessage = (event) => {
        const msg = event.data
        setMessages(prev => [...prev, { id: Date.now(), text: msg, sender: 'them' }])
      }

      ws.current.onclose = () => setConnectionStatus('Disconnected')

      return () => {
        if (ws.current) ws.current.close()
      }
    }
  }, [isLoggedIn, currentUser])

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

  const handleSendMessage = (e) => {
    e.preventDefault()
    if (!inputValue.trim() || !targetId.trim()) return

    const payload = {
      target_id: targetId,
      message: inputValue
    }

    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify(payload))
      setInputValue('')
    } else {
      alert('WebSocket is not connected')
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
            <h3 style={{ margin: 0 }}>{currentUser.username || currentUser.email}</h3>
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
            value={targetId}
            onChange={e => setTargetId(e.target.value)}
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
          <h3>Chatting with {targetId || '...'}</h3>
        </div>

        <div className="messages-list">
          {messages.map((msg, index) => (
            <div key={index} className={`message ${msg.text.startsWith('Sent to') ? 'sent' : 'received'}`}>
              {msg.text}
            </div>
          ))}
        </div>

        <form className="chat-input-area" onSubmit={handleSendMessage}>
          <input
            type="text"
            className="chat-input"
            placeholder="Type a message..."
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
