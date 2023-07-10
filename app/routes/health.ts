import { LoaderArgs } from "@remix-run/node";
import { prisma } from "../db.server";

export const loader = async ({ request }: LoaderArgs) => {
  try {
    await prisma.$queryRaw`select 1`;
    return new Response("OK");
  } catch (e) {
    throw "Connection to DB missing";
  }
};
