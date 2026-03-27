const path = require('path');
const AutoLoad = require('@fastify/autoload');

module.exports = async function (fastify, opts) {
  // Load plugins first
  fastify.register(AutoLoad, {
    dir: path.join(__dirname),
    ignorePattern: /autoload.js/,
  });

  // Load routes
  fastify.register(AutoLoad, {
    dir: path.join(__dirname, '../routes'),
  });
};