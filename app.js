const Fastify = require('fastify');
const autoload = require('./src/plugins/autoload');

function buildApp() {
  const app = Fastify({ logger: true });

  // Register plugins + routes automatically
  app.register(autoload);

  return app;
}

module.exports = buildApp;