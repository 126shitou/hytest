// app/api/test-hyperdrive/route.ts
import { getCloudflareContext } from "@opennextjs/cloudflare";

export async function GET() {
    const { env } = getCloudflareContext();
    console.log("++++",env);
    
    return Response.json({
        hyperdrive: env.onlinegemini
    });
}
