const express = require('express');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

app.get('/supabase-config.js', (request, response) => {
  const url = process.env.SUPABASE_URL || '';
  const anonKey = process.env.SUPABASE_ANON_KEY || '';
  response.type('application/javascript').send(`window.SUPABASE_CONFIG = ${JSON.stringify({ url, anonKey })};`);
});

app.use(express.static(path.join(__dirname)));

app.get('*', (request, response) => {
  response.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(port, '0.0.0.0', () => {
  console.log(`Tomorrow menu is running on port ${port}`);
});