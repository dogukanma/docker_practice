const express = require('express');
const app = express();
const port = 3000;

app.get('/', (req, res) => {
  res.send('hello world. Docker practice in app.js')
})

app.listen(port, () => {
  console.log(`Uygulama http://localhost:${port} adresinde çalışıyor.`)
})