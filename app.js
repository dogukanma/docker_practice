const express = require('express');
const mongoose = require('mongoose');
const path = require('path');

const app = express();
const port = 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

const mongoUri = process.env.MONGO_URI || 'mongodb://mongodb:27017/blogdb';
mongoose.connect(mongoUri)
  .then(() => {
    console.log('Database connected successfully.');
    seedDatabase();
  })
  .catch(err => console.error('Database connection error:', err));

const User = mongoose.model('User', new mongoose.Schema({
  username: String,
  password: String,
  privateNotes: String
}));

const Post = mongoose.model('Post', new mongoose.Schema({
  title: String,
  content: String,
  author: String,
  createdAt: { type: Date, default: Date.now }
}));

async function seedDatabase() {
  const userCount = await User.countDocuments();
  if (userCount === 0) {
    await User.create([
      { username: 'admin', password: 'SuperSecretAdminPassword123!', privateNotes: 'AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE' },
      { username: 'm.scott', password: 'password123', privateNotes: 'My bank PIN is 1234.' }
    ]);
    console.log('Mock users seeded.');
  }

  const postCount = await Post.countDocuments();
  if (postCount === 0) {
    await Post.create([
      { title: 'Welcome to the Secure Portal', content: 'This system requires authentication to post.', author: 'admin' }
    ]);
    console.log('Mock posts seeded.');
  }
}

// 1. Get all posts
app.get('/api/posts', async (req, res) => {
  try {
    const posts = await Post.find().sort({ createdAt: -1 });
    res.json(posts);
  } catch (error) {
    console.error('Error fetching posts:', error);
    res.status(500).json({ error: "Server error" });
  }
});

// 2. Create a new post
app.post('/api/posts', async (req, res) => {
  try {
    const { title, content, author } = req.body;
    const newPost = await Post.create({ title, content, author });
    res.json({ success: true, post: newPost });
  } catch (error) {
    console.error('Error creating post:', error);
    res.status(500).json({ error: "Server error" });
  }
});

// 3. Vulnerable Login Endpoint (NoSQL Injection)
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;

  // Type control to make sure input is string and not an object.
  if (typeof username !== 'string' || typeof password !== 'string') {
    return res.status(400).json({ success: false, message: "Geçersiz parametre tipi!" });
  }

  // Cast inputs to String
  const safeUsername = String(username || '');
  const safePassword = String(password || '');
  try {
    const user = await User.findOne({ username: safeUsername, password: safePassword });
    if (user) {
      //send username to frontend on login
      res.json({ success: true, username: user.username, message: "Login successful", secret: user.privateNotes });
    } else {
      res.status(401).json({ success: false, message: "Invalid credentials" });
    }
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: "Server error" });
  }
});

// 4. Register Endpoint
app.post('/api/register', async (req, res) => {
  const { username, password } = req.body;
  // Type control to make sure input is string and not an object.
  if (typeof username !== 'string' || typeof password !== 'string') {
    return res.status(400).json({ success: false, message: "Geçersiz parametre tipi!" });
  }
  // Cast inputs to String
  const safeUsername = String(username || '');
  const safePassword = String(password || '');
  try {
    const existing = await User.findOne({ username: safeUsername });
    if (existing) {
      return res.status(400).json({ success: false, message: "Username already exists" });
    }
    const newUser = await User.create({ username: safeUsername, password: safePassword, privateNotes: "Özel bir not bulunmuyor." });
    res.json({ success: true, username: newUser.username, message: "Registration successful", secret: newUser.privateNotes });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: "Server error" });
  }
});

app.listen(port, () => {
  console.log(`API running on port ${port}.`);
});