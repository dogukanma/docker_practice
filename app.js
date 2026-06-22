const express = require('express');
const mongoose = require('mongoose');

const app = express();
const port = 3000;

// body parser to read incoming post requests
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
  secretFlag: String
}));

// add test user to db
async function seedDatabase() {
  await User.deleteMany({}); // clear db before adding
  await User.create({
    username: 'admin',
    password: 'passwordnosql123'
  });
  console.log('test user added to db');
}

// nosql injection point
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;

  try {
    // -------- vulnerable part --------
    // user input is directly processed as object in query
    const user = await User.findOne({ username: username, password: password });

    if (user) {
      res.json({ success: true, message: "Login success." });
    } else {
      res.status(401).json({ success: false, message: "Incorrect username or password." });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// homepage
app.get('/', (req, res) => {
  res.send(`
    <h3>Homepage</h3>
    <p>Try commands below</p>

    <h4>1. Normal try:</h4>
    <pre>curl -X POST http://localhost:3000/api/login -H "Content-Type: application/json" -d "{\\"username\\": \\"admin\\", \\"password\\": \\"wrong_password\\"}"</pre>
    
    <h4>2. Vulnerable try:</h4>
    <pre>curl -X POST http://localhost:3000/api/login -H "Content-Type: application/json" -d "{\\"username\\": \\"admin\\", \\"password\\": {\\"$ne\\": \\"wrong_password\\"}}"</pre>
  `);
});

app.listen(port, () => {
  console.log(`App is running on port ${port}.`);
});