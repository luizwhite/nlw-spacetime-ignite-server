import fastify from 'fastify'
import cors from '@fastify/cors'
import { memoriesRoutes } from './routes/memories'
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library'

const app = fastify()

app.register(cors, {
  origin: ['http://localhost:3000'],
})
app.register(memoriesRoutes)

app.setErrorHandler((err, _, res) => {
  if (
    err instanceof PrismaClientKnownRequestError &&
    err.meta?.cause &&
    typeof err.meta.cause === 'string' &&
    /Record(.+)does not exist/.test(err.meta.cause)
  ) {
    return res.status(404).send(err.meta.cause)
  }

  throw err
})

app.listen({ port: 3333 }).then(() => {
  console.log('🚀 HTTP server running on http://localhost:3333')
})
