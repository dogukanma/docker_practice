const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');

const app = express();
const port = 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// mongodb auth variables
const mongoUri = process.env.MONGO_URI;
if (!mongoUri) {
  console.error('Error: MONGO_URI variable is not defined.');
  process.exit(1);
}

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
      { username: 'admin', password: 'admin', privateNotes: 'AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE' },
      { username: 'm.scott', password: 'm.scott', privateNotes: 'My bank PIN is 1234.' }
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

// 5. Delete post
app.delete('/api/posts/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { username } = req.query;

    if (typeof username !== 'string') {
      return res.status(400).json({ success: false, message: "Invalid user parameter!" });
    }

    const safeUsername = String(username || '');

    // Retrieve the post
    const post = await Post.findById(id);
    if (!post) {
      return res.status(404).json({ success: false, message: "Post not found" });
    }

    // Check if the user is the author
    if (post.author !== safeUsername) {
      return res.status(403).json({ success: false, message: "Unauthorized." });
    }

    await Post.findByIdAndDelete(id);
    res.json({ success: true, message: "Post deleted." });
  } catch (error) {
    console.error('Delete post error:', error);
    res.status(500).json({ error: "Server error" });
  }
});

// 6. Update user's notes
app.put('/api/users/secret', async (req, res) => {
  const { username, secret } = req.body;
  if (typeof username !== 'string' || typeof secret !== 'string') {
    return res.status(400).json({ success: false, message: "Geçersiz parametre tipi." });
  }

  const safeUsername = String(username || '');
  const safeSecret = String(secret || '');

  try {
    const user = await User.findOneAndUpdate(
      { username: safeUsername },
      { privateNotes: safeSecret },
      { new: true }
    );
    if (user) {
      res.json({ success: true, message: "Note updated.", secret: user.privateNotes });
    } else {
      res.status(404).json({ success: false, message: "User not found" });
    }
  } catch (error) {
    console.error('Update secret error:', error);
    res.status(500).json({ error: "Server error" });
  }
});

// 7. Path Traversal
app.get('/api/download', (req, res) => {
  const { file } = req.query;

  // Resolve base directory and requested file path to absolute paths
  const safeDir = path.join(__dirname, 'public');
  const filePath = path.resolve(safeDir, String(file || ''));

  // Prevent directory traversal by checking if path starts with the allowed directory
  if (!filePath.startsWith(safeDir)) {
    return res.status(403).send('Access Denied.');
  }

  fs.readFile(filePath, 'utf8', (err, data) => {
    if (err) {
      console.error('File read error:', err);
      return res.status(404).send('File not found');
    }
    res.send(data);
  });
});

// 8. Blind NoSQL Injection
app.post('/api/users/search', async (req, res) => {
  const { username, password } = req.body;

  // Enforce string type checks to prevent NoSQL query operator injection
  if (typeof username !== 'string' || typeof password !== 'string') {
    return res.status(400).json({ success: false, message: "Invalid parameters." });
  }

  try {
    // Explicitly query using verified string primitives
    const user = await User.findOne({
      username: String(username),
      password: String(password)
    });

    if (user) {
      res.json({ found: true });
    } else {
      res.json({ found: false });
    }
  } catch (error) {
    console.error('Search user error:', error);
    res.status(500).json({ error: "Server error" });
  }
});

// 9. IDOR
app.get('/api/users/profile', async (req, res) => {
  const { username } = req.query;
  const requester = req.headers['x-username'];

  // Prevent IDOR by verifying if the requester matches the requested profile
  if (username !== requester) {
    return res.status(403).json({ success: false, message: "Unauthorized profile access." });
  }

  try {
    const user = await User.findOne({ username: String(username || '') });
    if (user) {
      res.json({
        success: true,
        username: user.username,
        privateNotes: user.privateNotes
      });
    } else {
      res.status(404).json({ success: false, message: "User not found" });
    }
  } catch (error) {
    console.error('Profile fetch error:', error);
    res.status(500).json({ error: "Server error" });
  }
});

app.listen(port, () => {
  console.log(`API running on port ${port}.`);
});