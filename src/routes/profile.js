module.exports = async function (fastify, opts) {
  fastify.post('/edit/profile', async (request, reply) => {
    const userId = request.headers['x-user-id'] || request.headers['user-id'];

    if (!userId) {
      reply.status(400);
      return {
        success: false,
        error: 'Missing X-User-Id header',
      };
    }

    const payload = request.body;
    if (!payload || typeof payload !== 'object') {
      reply.status(400);
      return {
        success: false,
        error: 'Request body must be a valid JSON object',
      };
    }

    const users = fastify.mongo.collection('users');
    const now = new Date();

    const result = await users.updateOne(
      { user_id: userId },
      {
        $set: {
          user_id: userId,
          profile: payload,
          source: 'manual-edit',
          updated_at: now,
        },
        $setOnInsert: { created_at: now },
      },
      { upsert: true }
    );

    return {
      success: true,
      user_id: userId,
      matchedCount: result.matchedCount,
      modifiedCount: result.modifiedCount,
      upsertedId: result.upsertedId,
    };
  });
};
