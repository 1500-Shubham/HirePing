const { MongoClient } = require('mongodb');

module.exports = async function (fastify, opts) {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error('MONGODB_URI environment variable is required');
  }

  const client = new MongoClient(uri);
  await client.connect();

  fastify.decorate('mongo', client.db());
  fastify.decorate('mongoClient', client);

  fastify.addHook('onClose', async (instance, done) => {
    await client.close();
    done();
  });
};
