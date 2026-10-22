import express from 'express';
import { createUser, singupUser } from '../controllers/userControllers';

const userRouter = express.Router();

userRouter.post("/signup", createUser);
userRouter.post("/signin", singupUser);

export default userRouter

