// lib/db.ts
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { cache } from "react";
import * as schema from "@/lib/db/schema";


// 用于 API Routes 和动态路由
export const getDb = cache(() => {
    const testEnv = getCloudflareContext().env.test;

    const pool = new Pool({
        connectionString: testEnv.connectionString,
        max: 5,
        maxUses: 1,
    });

    return drizzle({ client: pool, schema });
});



// 用于静态路由 (ISR/SSG)
export const getDbAsync = cache(async () => {
    const { env } = await getCloudflareContext({ async: true });

    const pool = new Pool({
        connectionString: env.test.connectionString,
        max: 5,
        maxUses: 1,
    });

    return drizzle({ client: pool, schema });
});
