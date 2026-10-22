import z from 'zod';

export const userSignup = z.object({
  username: z.string(),
  password_hash: z.string(),
});

export const userSingin = z.object({
  username: z.string(),
  password_hash: z.string(),
});


export const workspace = z.object({
  name: z.string()
});

export const createTask = z.object({
  title: z.string(),
  description: z.string()
})