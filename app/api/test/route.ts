// app/api/test-hyperdrive/route.ts
import { getCloudflareContext } from "@opennextjs/cloudflare";

import { getDb } from "@/lib/db";
import { users } from "@/lib/db/schema/user";

export async function GET() {
    try {
        const { env } = getCloudflareContext();


        const db = getDb();
        const allUsers = await db.select().from(users);
        return Response.json({
            user: allUsers, hyperdrive: env.onlinegemini
        });
    } catch (error) {
        return Response.json({ error: "Failed to fetch users" }, { status: 500 });
    }
}
