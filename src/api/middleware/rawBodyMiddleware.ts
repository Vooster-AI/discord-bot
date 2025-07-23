import { Request, Response, NextFunction } from "express";

export interface RawBodyRequest extends Request {
  rawBody?: Buffer;
}

export function rawBodyMiddleware(req: RawBodyRequest, res: Response, next: NextFunction): void {
  const chunks: Buffer[] = [];

  req.on("data", (chunk: Buffer) => {
    chunks.push(chunk);
  });

  req.on("end", () => {
    req.body = Buffer.concat(chunks);
    next();
  });

  req.on("error", (error) => {
    console.error("Error reading raw body:", error);
    res.status(400).json({ error: "Invalid request body" });
  });
}