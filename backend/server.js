const buildApp = require('./app');
require('dotenv').config();

const start = async () => {
  const app = buildApp();

  try {
    await app.listen({ port: process.env.PORT || 3000 });
    console.log(`🚀 Server running on http://localhost:${process.env.PORT}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();