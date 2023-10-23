import { resolve } from 'node:path'
import fastify from 'fastify'
import cors from '@fastify/cors'
import jwt from '@fastify/jwt'
import multipart from '@fastify/multipart'
import fastifyStatic from '@fastify/static'
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library'

import 'dotenv/config'

import { authRoutes, memoriesRoutes, uploadRoutes } from './routes'

const app = fastify()

app.register(cors, {
  origin: ['http://localhost:3000'],
})
app.register(jwt, { secret: '82decd8a828c934f337a3499c2f044ee' })
app.register(multipart)

app.register(fastifyStatic, {
  root: resolve(__dirname, '..', 'uploads'),
  prefix: '/uploads',
})

app.register(authRoutes)
app.register(memoriesRoutes)
app.register(uploadRoutes)

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

app.listen({ port: 3333, host: '::' }).then(() => {
  console.log('🚀 HTTP server running on http://localhost:3333')
})
