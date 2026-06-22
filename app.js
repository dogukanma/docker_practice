const express = require('express');
const mongoose = require('mongoose');

const app = express();
const port = 3000;

// docker compose içindeki servis adını (mongodb) kullanıyoruz.
const mongoUri = process.env.MONGO_URI || 'mongodb://mongodb:27017/testdb'

mongoose.connect(mongoUri)
  .then(() => console.log('MongoDB bağlantısı kuruldu.'))
  .catch((err) => console.error('MongoDB bağlantı hatası: ', err));

// storing visitor logs
const LogSchema = new mongoose.Schema({ timestamp: { type: Date, default: Date.now } });
const Log = mongoose.model('Log', LogSchema);

app.get('/', async (req, res) => {
  try {
    // New log in every login
    await Log.create({})
    const totalLogs = await Log.countDocuments();

    res.send(`Hello world, This page is visited ${totalLogs} times.`);
  } catch (error) {
    res.status(500).send('Veritabanı işlem hatası.')
  }
});

app.listen(port, () => {
  console.log(`Uygulama ${port} portunda çalışıyor.`)
})