import React, { useState, useEffect } from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import { io } from "socket.io-client";

// ✅ Auto Backend URL (local + production)
const BACKEND = "https://ourtalks.onrender.com";

// ✅ Socket Connection (NO localhost)
const socket = io(BACKEND, {
  transports: ["websocket", "polling"],
  reconnectionAttempts: Infinity,
  reconnectionDelay: 1000,
});

function App() {
  const [page, setPage] = useState("landing"); 
  const [isLogin, setIsLogin] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [unreadCounts, setUnreadCounts] = useState({});

  // ✅ Fetch all users except current
  const fetchUsers = () => {
    if (!currentUser) return;

    fetch(`${BACKEND}/users/${currentUser._id}`)
      .then((res) => res.json())
      .then((data) => setUsers(data))
      .catch(() => console.log("⚠ Unable to fetch users"));
  };

  useEffect(() => {
    fetchUsers();
  }, [currentUser]);

  // ✅ Fetch chat history
  useEffect(() => {
    if (!currentUser || !selectedUser) return;

    fetch(`${BACKEND}/chat/${currentUser._id}/${selectedUser._id}`)
      .then((res) => res.json())
      .then((data) => setMessages(data))
      .catch(() => console.log("⚠ Unable to fetch chat"));
  }, [selectedUser, currentUser]);

  // ✅ Socket listeners
  useEffect(() => {
    socket.on("receiveMessage", (data) => {
      // If chat window is open
      if (
        (data.sender === currentUser?._id &&
          data.receiver === selectedUser?._id) ||
        (data.sender === selectedUser?._id &&
          data.receiver === currentUser?._id)
      ) {
        setMessages((prev) => [...prev, data]);
      } else if (data.receiver === currentUser?._id) {
        // Increase unread count
        setUnreadCounts((prev) => ({
          ...prev,
          [data.sender]: (prev[data.sender] || 0) + 1,
        }));
      }
    });

    return () => socket.off("receiveMessage");
  }, [currentUser, selectedUser]);

  // ✅ Login / Signup
  const handleAuth = async (e) => {
    e.preventDefault();
    const form = new FormData(e.target);

    const payload = {
      name: form.get("name"),
      email: form.get("email"),
      password: form.get("password"),
    };

    try {
      const endpoint = isLogin ? "/login" : "/signup";
      const res = await fetch(`${BACKEND}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (data.success) {
        setCurrentUser(data.user);
        setPage("chat");
      } else {
        alert(data.error || "Invalid email or password");
      }
    } catch (err) {
      console.log("⚠ Backend sleep or network delay, retrying...");
      alert("⚠ Server is waking up… please try again in 5 seconds.");
    }
  };

  // ✅ Send message
  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedUser) return;

    const msg = {
      sender: currentUser._id,
      receiver: selectedUser._id,
      text: newMessage,
    };

    socket.emit("sendMessage", msg);
    setNewMessage("");
  };

  // Click user → open chat window & reset unread
  const handleSelectUser = (user) => {
    setSelectedUser(user);
    setUnreadCounts((prev) => ({ ...prev, [user._id]: 0 }));
  };

  return (
    <div className="app-container">
      {/* 🚀 Landing */}
      {page === "landing" && (
        <div className="landing">
          <h1>Ourtalks</h1>
          <p>Fast. Simple. Real-time chat.</p>
          <button onClick={() => setPage("auth")}>Start Chat</button>
        </div>
      )}

      {/* 🔐 Auth Page */}
      {page === "auth" && (
        <div className="auth-page">
          <h2>{isLogin ? "Login" : "Sign Up"}</h2>

          <form className="auth-form" onSubmit={handleAuth}>
            {!isLogin && (
              <input type="text" name="name" placeholder="Full Name" required />
            )}
            <input type="email" name="email" placeholder="Email" required />
            <input type="password" name="password" placeholder="Password" required />
            <button type="submit">{isLogin ? "Login" : "Create Account"}</button>
          </form>

          <p>
            {isLogin ? "Don't have an account?" : "Already have an account?"}{" "}
            <span
              style={{ color: "blue", cursor: "pointer" }}
              onClick={() => setIsLogin(!isLogin)}
            >
              {isLogin ? "Sign Up" : "Login"}
            </span>
          </p>
        </div>
      )}

      {/* 💬 Chat Page */}
      {page === "chat" && (
        <div className="chat-dashboard">
          {/* Sidebar */}
          <div className="chat-sidebar">
            <h3>{currentUser?.name}</h3>
            <button onClick={() => setPage("landing")}>Logout</button>

            <h4>All Users</h4>
            <button onClick={fetchUsers}>Refresh</button>

            {users.map((user) => (
              <div
                key={user._id}
                className={`user-item ${
                  selectedUser?._id === user._id ? "active" : ""
                }`}
                onClick={() => handleSelectUser(user)}
              >
                <p>
                  {user.name}
                  {unreadCounts[user._id] > 0 && (
                    <span className="unread-badge">{unreadCounts[user._id]}</span>
                  )}
                </p>
              </div>
            ))}
          </div>

          {/* Chat Window */}
          <div className="chat-window">
            {selectedUser ? (
              <>
                <div className="chat-header">
                  <h2>{selectedUser.name}</h2>
                </div>

                <div className="chat-messages">
                  {messages.map((msg, i) => (
                    <div
                      key={i}
                      className={`message ${
                        msg.sender === currentUser._id ? "sent" : "received"
                      }`}
                    >
                      {msg.text}
                    </div>
                  ))}
                </div>

                <form className="chat-input" onSubmit={handleSendMessage}>
                  <input
                    type="text"
                    placeholder="Type a message..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                  />
                  <button type="submit">Send</button>
                </form>
              </>
            ) : (
              <h3>Select a user to chat</h3>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
