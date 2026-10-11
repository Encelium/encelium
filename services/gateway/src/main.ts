// Start the gateway: check the settings, then listen. Stops cleanly on Ctrl+C / SIGTERM.
import { configProblems, loadConfig } from "./config.ts";
import { createGateway, log } from "./server.ts";

const config = loadConfig();
const problems = configProblems(config);
if (problems.length) {
  console.error("The gateway can't start:\n- " + problems.join("\n- "));
  process.exit(1);
}
const { server, limiter } = createGateway(config);
server.listen(config.port, config.host, () => {
  log({ msg: `gateway listening on ${config.host}:${config.port}`, upstream: new URL(config.upstream.baseUrl).host, models: config.models.map((m) => m.id) });
});
const stop = () => { limiter.flush(); server.close(() => process.exit(0)); };
process.on("SIGTERM", stop);
process.on("SIGINT", stop);
