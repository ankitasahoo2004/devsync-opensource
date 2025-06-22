const express = require("express");
const session = require("express-session");
const passport = require("passport");
const cors = require("cors");
const path = require("path");
const MongoStore = require("connect-mongo");

const app = express();

// Middleware setup
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));
app.use(
  cors({
    origin: [process.env.SERVER_URL, process.env.FRONTEND_URL],
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
  })
);

// Session configuration
app.use(
  session({
    secret: process.env.SESSION_SECRET || "your_session_secret",
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
      mongoUrl: process.env.MONGODB_URI,
      collectionName: "sessions",
      ttl: 24 * 60 * 60, // Session TTL in seconds (1 day)
      autoRemove: "native", // Enable automatic removal of expired sessions
    }),
    cookie: {
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000, // 1 day in milliseconds
      sameSite: process.env.NODE_ENV === "production" ? "strict" : "lax",
    },
    name: "devsync.sid", // Custom session cookie name
  })
);

// Passport initlization
require("./config/passport")(passport);
app.use(passport.initialize());
app.use(passport.session());

app.get("*", (req, res) => {
  // Only serve index.html for non-API routes
  if (!req.path.startsWith("/api/")) {
    res.sendFile(path.join(__dirname, "public", "index.html"));
  } else {
    res.status(404).json({ error: "API endpoint not found" });
  }
});

module.exports = app;
