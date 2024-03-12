export default async function (fastify) {
    fastify.get('/test', async (request, reply) => {
        reply.code(200).header('Content-Type', 'application/json; charset=utf-8').send({ hello: 'world' });
    })
}