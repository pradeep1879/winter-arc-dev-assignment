import type { Request, Response } from "express"
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import  userRouter  from "../routes/routes"
import { userSignup, userSingin } from "../validation/validate"
import pool from "../db/db";


export const createUser =  async (req: Request, res: Response) => {
    const validatedUser = userSignup.parse(req.body);
    const { username, password_hash } = validatedUser;

    const checkUserQuery = `SELECT * FROM users WHERE username = $1`;
    const existingUser = await pool.query(checkUserQuery, [username]);

    const insertQuery = `
        INSERT INTO users (username, password_hash) 
        VALUES ($1, $2)
    `;
    await pool.query(insertQuery, [username, password_hash]);

    // 4. Return success response
      return res.json({ 
        message: "User created" 
    });
    
};







export const singupUser =   async (req: Request, res: Response): Promise<any> => {
  
  const validateUser = userSingin.parse(req.body);
  const { username, password_hash } = validateUser;

    const checkUserQuery = `SELECT * FROM users WHERE username = $1`;
    const userResult = await pool.query(checkUserQuery, [username]);
    console.log("userResult",userResult);


    const user = userResult.rows[0];



    if (password_hash != user.password_hash) {
      return res.json({ message: "Invalid username or password" });
    }


    const token = jwt.sign(
      { userId: user.id},
      process.env.JWT_SECRET || "randompassword"
    );

    // 5. Send successful response
    return res.json({
      message: "Sign-in successful",
      token: token
    });
};

