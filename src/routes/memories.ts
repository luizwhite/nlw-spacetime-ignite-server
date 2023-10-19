import { prisma } from '../lib/prisma'
import { z } from 'zod'

import type { FastifyInstance } from 'fastify'

const checkIfObjectIsNotEmpty = (
  b: unknown,
  fields: string[]
): [() => boolean, { message: string }] => [
  () => Object.keys(b as Record<string, unknown>).length > 0,
  {
    message: `One of the fields must be defined: ${fields
      .map((f) => `'${f}'`)
      .join(', ')}`,
  },
]

export async function memoriesRoutes(app: FastifyInstance) {
  app.addHook('preHandler', async (req) => {
    await req.jwtVerify()
  })

  app.get('/memories', async (req) => {
    const memories = await prisma.memory.findMany({
      where: { userId: req.user.sub },
      orderBy: { createdAt: 'asc' },
    })

    return memories.map(({ id, coverUrl, content }) => ({
      id,
      coverUrl,
      excerpt: content.substring(0, 110).concat('...'),
    }))
  })

  app.get('/memories/:id', async (req, res) => {
    const resultParams = z
      .object({
        id: z.string().uuid(),
      })
      .safeParse(req.params)

    if (!resultParams.success) {
      return res
        .status(400)
        .send('Invalid id of memory informed, it should be an UUID')
    }

    const { id } = resultParams.data

    const memory = await prisma.memory.findUniqueOrThrow({
      where: {
        id,
      },
    })

    if (memory.userId !== req.user.sub && !memory.isPublic) {
      return res
        .status(403)
        .send('This memory is forbidden for the requester user.')
    }

    return memory
  })

  app.post('/memories', async (req) => {
    const bodySchema = z.object({
      content: z.string(),
      coverUrl: z.string(),
      isPublic: z.coerce.boolean().default(false),
    })

    const { content, coverUrl, isPublic } = bodySchema.parse(req.body)

    const memory = prisma.memory.create({
      data: {
        content,
        coverUrl,
        isPublic,
        userId: req.user.sub,
      },
    })

    return memory
  })

  app.put('/memories/:id', async (req, res) => {
    const resultParams = z
      .object({
        id: z.string().uuid(),
      })
      .safeParse(req.params)

    if (!resultParams.success) {
      return res
        .status(400)
        .send('Invalid id of memory informed, it should be an UUID')
    }

    const { id } = resultParams.data

    const memory = await prisma.memory.findUniqueOrThrow({
      where: { id },
    })

    if (memory.userId !== req.user.sub && !memory.isPublic) {
      return res
        .status(403)
        .send('This memory is forbidden for the requester user.')
    }

    const memoryPartial = (({ content, coverUrl, isPublic }) => ({
      content,
      coverUrl,
      isPublic,
    }))(memory)

    const result = z
      .object({
        content: z.string().optional(),
        coverUrl: z.string().optional(),
        isPublic: z.coerce.boolean().default(false),
      })
      .refine(...checkIfObjectIsNotEmpty(req.body, Object.keys(memoryPartial)))
      .safeParse(req.body)

    if (!result.success) {
      return res.status(400).send(result.error.issues[0].message)
    }

    const { content, coverUrl, isPublic } = result.data

    const memoryUpdated = await prisma.memory.update({
      where: { id },
      data: {
        ...memoryPartial,
        content,
        coverUrl,
        isPublic,
      },
    })

    return memoryUpdated
  })

  app.delete('/memories/:id', async (req, res) => {
    const resultParams = z
      .object({
        id: z.string().uuid(),
      })
      .safeParse(req.params)

    if (!resultParams.success) {
      return res
        .status(400)
        .send('Invalid id of memory informed, it should be an UUID')
    }

    const { id } = resultParams.data

    const memory = await prisma.memory.findUniqueOrThrow({
      where: { id },
    })

    if (memory.userId !== req.user.sub && !memory.isPublic) {
      return res
        .status(403)
        .send('This memory is forbidden for the requester user.')
    }

    await prisma.memory.delete({
      where: { id, userId: req.user.sub },
    })

    return res.status(204).send()
  })
}
