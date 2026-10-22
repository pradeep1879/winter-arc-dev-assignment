import type { Request, Response } from "express";
import { workspace } from "../validation/validate";
import pool from "../db/db";


export const createWorkspace = async (req: Request, res: Response) => {
  const validateWorkspace = workspace.parse(req.body);
  const { name } = validateWorkspace;

  const insertQuery = `INSERT INTO workspaces (name)
    VALUES($1)`;

    await pool.query(insertQuery, [name]);

    res.json({
      message: "Workspace created"
    })
}