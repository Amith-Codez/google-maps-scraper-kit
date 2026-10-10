// Runs once when the Next.js server starts. Node-only checks live in instrumentation-node.ts.
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") await import("./instrumentation-node");
}
