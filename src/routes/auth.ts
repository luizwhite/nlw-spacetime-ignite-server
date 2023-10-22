import axios from 'axios'
import { z } from 'zod'

import type { FastifyInstance } from 'fastify'

import { prisma } from '../lib/prisma'

/* eslint-disable camelcase */
export default async function authRoutes(app: FastifyInstance) {
  app.post('/register', async (req) => {
    const bodySchema = z.object({
      code: z.string(),
      platform: z.enum(['web', 'mobile']).default('web'),
    })

    const { code, platform } = bodySchema.parse(req.body)

    const envs = {
      web: {
        client_id: process.env.GITHUB_CLIENT_ID,
        client_secret: process.env.GITHUB_CLIENT_SECRET,
      },
      mobile: {
        client_id: process.env.GITHUB_CLIENT_ID_MOBILE,
        client_secret: process.env.GITHUB_CLIENT_SECRET_MOBILE,
      },
    }

    const accessTokenResponse = await axios.post(
      'https://github.com/login/oauth/access_token',
      null,
      {
        params: {
          client_id: envs[platform].client_id,
          client_secret: envs[platform].client_secret,
          code,
        },
        headers: { Accept: 'application/json' },
      }
    )

    const { access_token } = accessTokenResponse.data

    const userResponse = await axios.get('https://api.github.com/user', {
      headers: { Authorization: `Bearer ${access_token}` },
    })

    const userSchema = z.object({
      id: z.number(),
      login: z.string(),
      name: z.string(),
      avatar_url: z.string().url(),
    })

    const {
      id,
      login,
      name,
      avatar_url: avatarUrl,
    } = userSchema.parse(userResponse.data)
    let user = await prisma.user.findUnique({
      where: { githubId: id },
    })

    if (!user) {
      user = await prisma.user.create({
        data: { githubId: id, login, name, avatarUrl },
      })
    }

    const token = app.jwt.sign(
      {
        name,
        avatarUrl,
      },
      {
        sub: String(user.id),
        expiresIn: '30 days',
      }
    )

    return { token }
  })
}
