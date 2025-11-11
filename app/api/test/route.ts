// app/api/test-hyperdrive/route.ts

import { getDb } from "@/lib/db";
import { users } from "@/lib/db/schema/user";


export async function GET() {

    try {
        const db = getDb();
        const allUsers = await db.select().from(users);
        return Response.json(allUsers);
    } catch (error) {
        return Response.json({ error: "Failed to fetch users" }, { status: 500 });
    }
}
