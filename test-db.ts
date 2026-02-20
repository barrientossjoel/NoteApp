import { createClient } from "@libsql/client";
import * as dotenv from "dotenv";

dotenv.config();

const url = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;

console.log("Testing connection to:", url);
console.log("Token length:", authToken?.length);

async function testConnection() {
    try {
        const client = createClient({
            url: url!,
            authToken: authToken,
        });

        const result = await client.execute("SELECT 1");
        console.log("Connection successful!", result);
    } catch (e) {
        console.error("Connection failed:", e);
    }
}

testConnection();
