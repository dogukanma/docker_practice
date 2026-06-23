const express = require('express');
const mongoose = require('mongoose');

const app = express();
const port = 3000;

// body parser to read incoming requests
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// mongodb connection
const mongoUri = process.env.MONGO_URI || 'mongodb://mongodb:27017/testdb';
mongoose.connect(mongoUri)
  .then(() => {
    console.log('mongodb connection is ok.');
    seedDatabase(); // add test user
  })
  .catch(err => console.error('mongodb connectione error', err));

// user
const User = mongoose.model('User', new mongoose.Schema({
  username: String,
  password: String,
  role: String,
  privateNotes: String,
  blogPosts: Array
}));

// add mock data to db
async function seedDatabase() {
  await User.deleteMany({}); // Clear existing data to avoid duplicates
  await User.create([
    {
      username: 'admin',
      password: 'SuperSecretAdminPassword123!',
      role: 'admin',
      privateNotes: 'access key: FKJSNFHE1908N3J2K',
      blogPosts: ['System Architecture V2', 'Docker Swarm Migration']
    },
    {
      username: 'johndoe',
      password: 'password123',
      role: 'author',
      privateNotes: 'Also, my bank account routing number: 122000661...',
      blogPosts: ['Hello World', 'A Guide to Containerization']
    }
  ]);
  console.log('Mock database seeded.');
}

app.get('/', (req, res) => res.send('API is running. Send POST requests to /api/profile'));

// vulnerable profile endpoint - nosql injection point
app.post('/api/profile', async (req, res) => {
  const { username, password } = req.body;

  try {
    // Directly passing user input into mongodb query
    // attacker can pass an object like { "$ne": "" } instead of true password.
    // example: curl -X POST http://localhost:3000/api/profile -H "Content-Type: application/json" -d "{\"username\": \"admin\", \"password\": {\"$ne\": \"\"}}"
    const userProfile = await User.findOne({ username: username, password: password });

    if (userProfile) {
      // if auth is successful
      res.json({
        success: true,
        profile: {
          username: userProfile.username,
          role: userProfile.role,
          privateNotes: userProfile.privateNotes,
          posts: userProfile.blogPosts
        }
      });
    } else {
      res.status(403).json({ success: false, message: "Access denied. Invalid credentials." });
    }
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
});

// start server
app.listen(port, () => {
  console.log(`Blog system running on port ${port}.`);
});