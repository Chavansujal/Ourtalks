import React, { useState, useEffect } from "react";
import io from "socket.io-client";

const BACKEND_URL = "https://ourtalks.onrender.com";  // your backend URL

const socket = io(BACKEND_URL, {
  transports: ["websocket"],
  withCredentials: true,
});

function App() {
  const [mode, setMode] = useState("login"); // login | signup | chat
  const [users, setUsers] = useState([]);
  const [chatUser, setChatUser] = useState(null);
  const [messages, setMessages] = useState([]);

  // Signup state
  const [signupData, setSignupData] = useState({
    fname: "",
    lname: "",
    email: "",
    phoneNumber: "",
    password: "",
  });

  // Login state
  const [loginData, setLoginData] = useState({
    email: "",
    password: "",
  });

  // Load messages
  useEffect(() => {
    socket.on("receiveMessage", (msg) => {
      setMessages((prev) => [...prev, msg]);
    });

    return () => {
      socket.off("receiveMessage");
    };
  }, []);

  // Fetch all users after login
  const fetchUsers = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/user/getAllUsers`);
      const data = await res.json();
      if (data.success) setUsers(data.users);
    } catch (err) {
      console.log(err);
    }
  };

  // Signup
  const handleSignup = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/user/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(signupData),
      });

      const data = await res.json();
      if (data.success) {
        alert("Signup successful! Please login.");
        setMode("login");
      } else {
        alert(data.message);
      }
    } catch (err) {
      console.log(err);
    }
  };

  // Login
  const handleLogin = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/user/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(loginData),
      });

      const data = await res.json();
      if (data.success) {
        localStorage.setItem("user", JSON.stringify(data.user));
        alert("Login successful!");
        setMode("chat");
        fetchUsers();
      } else {
        alert(data.message);
      }
    } catch (err) {
      console.log(err);
    }
  };

  // Send message
  const sendMessage = () => {
    if (!chatUser) return;
    const messageText = document.getElementById("messageInput").value;

    const msg = {
      to: chatUser._id,
      from: JSON.parse(localStorage.getItem("user"))._id,
      text: messageText,
    };

    socket.emit("sendMessage", msg);
    setMessages((prev) => [...prev, msg]);

    document.getElementById("messageInput").value = "";
  };

  return (
    <div style={{ padding: "20px", fontFamily: "Arial" }}>
      {/* Login Page */}
      {mode === "login" && (
        <div>
          <h1>Login</h1>
          <input
            placeholder="Email"
            value={loginData.email}
            onChange={(e) =>
              setLoginData({ ...loginData, email: e.target.value })
            }
          />
          <br />
          <input
            placeholder="Password"
            type="password"
            value={loginData.password}
            onChange={(e) =>
              setLoginData({ ...loginData, password: e.target.value })
            }
          />
          <br />
          <button onClick={handleLogin}>Login</button>
          <p onClick={() => setMode("signup")}>
            Don’t have an account? Signup
          </p>
        </div>
      )}

      {/* Signup Page */}
      {mode === "signup" && (
        <div>
          <h1>Signup</h1>
          <input
            placeholder="First Name"
            value={signupData.fname}
            onChange={(e) =>
              setSignupData({ ...signupData, fname: e.target.value })
            }
          />
          <br />
          <input
            placeholder="Last Name"
            value={signupData.lname}
            onChange={(e) =>
              setSignupData({ ...signupData, lname: e.target.value })
            }
          />
          <br />
          <input
            placeholder="Email"
            value={signupData.email}
            onChange={(e) =>
              setSignupData({ ...signupData, email: e.target.value })
            }
          />
          <br />
          <input
            placeholder="Phone Number"
            value={signupData.phoneNumber}
            onChange={(e) =>
              setSignupData({
                ...signupData,
                phoneNumber: e.target.value,
              })
            }
          />
          <br />
          <input
            placeholder="Password"
            type="password"
            value={signupData.password}
            onChange={(e) =>
              setSignupData({ ...signupData, password: e.target.value })
            }
          />
          <br />
          <button onClick={handleSignup}>Signup</button>
          <p onClick={() => setMode("login")}>Back to Login</p>
        </div>
      )}

      {/* Chat Page */}
      {mode === "chat" && (
        <div>
          <h1>Your Contacts</h1>

          <div style={{ display: "flex" }}>
            {/* User List */}
            <div style={{ width: "30%", borderRight: "1px solid #ccc" }}>
              {users.map((u) => (
                <p
                  key={u._id}
                  onClick={() => setChatUser(u)}
                  style={{
                    cursor: "pointer",
                    padding: "10px",
                    background:
                      chatUser?._id === u._id ? "#eef" : "transparent",
                  }}
                >
                  {u.fname} {u.lname}
                </p>
              ))}
            </div>

            {/* Chat Box */}
            <div style={{ width: "70%", padding: "20px" }}>
              <h2>
                Chat with:{" "}
                {chatUser ? `${chatUser.fname} ${chatUser.lname}` : "Select a user"}
              </h2>

              <div
                style={{
                  height: "300px",
                  overflowY: "scroll",
                  border: "1px solid #ddd",
                  padding: "10px",
                }}
              >
                {messages.map((m, i) => (
                  <p key={i} style={{ textAlign: m.from === JSON.parse(localStorage.getItem("user"))._id ? "right" : "left" }}>
                    {m.text}
                  </p>
                ))}
              </div>

              <input id="messageInput" placeholder="Type your message..." />
              <button onClick={sendMessage}>Send</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
