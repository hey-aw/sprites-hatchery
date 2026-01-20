import { SignJWT, jwtVerify } from "jose";

const SECRET = new TextEncoder().encode(
  process.env.WS_TICKET_SECRET || "change-me-in-production"
);

export interface ConsoleTicket {
  spriteName: string;
  sessionId?: string;
  cols: number;
  rows: number;
  exp: number;
}

export async function signTicket(ticket: Omit<ConsoleTicket, "exp">): Promise<string> {
  const exp = Math.floor(Date.now() / 1000) + 60 * 5; // 5 minutes
  const jwt = await new SignJWT({ ...ticket, exp })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .sign(SECRET);
  return jwt;
}

export async function verifyTicket(token: string): Promise<ConsoleTicket> {
  const { payload } = await jwtVerify(token, SECRET);
  return {
    spriteName: payload.spriteName as string,
    sessionId: payload.sessionId as string | undefined,
    cols: payload.cols as number,
    rows: payload.rows as number,
    exp: payload.exp as number,
  };
}
