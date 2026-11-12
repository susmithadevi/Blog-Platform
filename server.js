const express = require("express");
const fs = require("fs");
const path = require("path");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const app = express();
const PORT = 3000;
const SECRET = "change-this-secret-before-deployment";
const DB_FILE = path.join(__dirname, "data.json");

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

function readDB() {
  if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify({ users: [], posts: [], comments: [] }, null, 2));
  }
  return JSON.parse(fs.readFileSync(DB_FILE, "utf8"));
}
function writeDB(db) {
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
}
function makeId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}
function auth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  try {
    req.user = jwt.verify(token, SECRET);
    next();
  } catch {
    res.status(401).json({ message: "Please log in first." });
  }
}

app.post("/api/register", async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) return res.status(400).json({ message: "All fields are required." });
  if (password.length < 6) return res.status(400).json({ message: "Password must contain at least 6 characters." });
  const db = readDB();
  if (db.users.some(u => u.email.toLowerCase() === email.toLowerCase()))
    return res.status(409).json({ message: "Email already registered." });
  const user = { id: makeId(), name: name.trim(), email: email.trim().toLowerCase(), password: await bcrypt.hash(password, 10) };
  db.users.push(user);
  writeDB(db);
  const token = jwt.sign({ id: user.id, name: user.name, email: user.email }, SECRET, { expiresIn: "7d" });
  res.status(201).json({ token, user: { id: user.id, name: user.name, email: user.email } });
});

app.post("/api/login", async (req, res) => {
  const { email, password } = req.body;
  const db = readDB();
  const user = db.users.find(u => u.email === String(email || "").toLowerCase());
  if (!user || !(await bcrypt.compare(password || "", user.password)))
    return res.status(401).json({ message: "Incorrect email or password." });
  const token = jwt.sign({ id: user.id, name: user.name, email: user.email }, SECRET, { expiresIn: "7d" });
  res.json({ token, user: { id: user.id, name: user.name, email: user.email } });
});

app.get("/api/posts", (req, res) => {
  const db = readDB();
  const posts = db.posts.slice().sort((a, b) => b.createdAt - a.createdAt).map(p => ({
    ...p, comments: db.comments.filter(c => c.postId === p.id).sort((a, b) => a.createdAt - b.createdAt)
  }));
  res.json(posts);
});

app.post("/api/posts", auth, (req, res) => {
  const { title, content } = req.body;
  if (!title || !content) return res.status(400).json({ message: "Title and content are required." });
  const db = readDB();
  const post = { id: makeId(), title: title.trim(), content: content.trim(), authorId: req.user.id,
    authorName: req.user.name, createdAt: Date.now(), updatedAt: Date.now() };
  db.posts.push(post); writeDB(db);
  res.status(201).json(post);
});

app.put("/api/posts/:id", auth, (req, res) => {
  const db = readDB();
  const post = db.posts.find(p => p.id === req.params.id);
  if (!post) return res.status(404).json({ message: "Post not found." });
  if (post.authorId !== req.user.id) return res.status(403).json({ message: "You can edit only your own posts." });
  const { title, content } = req.body;
  if (!title || !content) return res.status(400).json({ message: "Title and content are required." });
  post.title = title.trim(); post.content = content.trim(); post.updatedAt = Date.now();
  writeDB(db); res.json(post);
});

app.delete("/api/posts/:id", auth, (req, res) => {
  const db = readDB();
  const post = db.posts.find(p => p.id === req.params.id);
  if (!post) return res.status(404).json({ message: "Post not found." });
  if (post.authorId !== req.user.id) return res.status(403).json({ message: "You can delete only your own posts." });
  db.posts = db.posts.filter(p => p.id !== post.id);
  db.comments = db.comments.filter(c => c.postId !== post.id);
  writeDB(db); res.json({ message: "Post deleted." });
});

app.post("/api/posts/:id/comments", auth, (req, res) => {
  const { text } = req.body;
  const db = readDB();
  if (!db.posts.some(p => p.id === req.params.id)) return res.status(404).json({ message: "Post not found." });
  if (!text || !text.trim()) return res.status(400).json({ message: "Comment cannot be empty." });
  const comment = { id: makeId(), postId: req.params.id, userId: req.user.id, authorName: req.user.name,
    text: text.trim(), createdAt: Date.now() };
  db.comments.push(comment); writeDB(db);
  res.status(201).json(comment);
});

app.get("/api/me", auth, (req, res) => res.json({ user: req.user }));

app.get("*", (req, res) => res.sendFile(path.join(__dirname, "public", "index.html")));
app.listen(PORT, () => console.log(`Blog Platform running at http://localhost:${PORT}`));
