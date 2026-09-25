import http from "http";
import { createApp } from "./app";
import { env } from "./config/env";
import { initSocket } from "./sockets/socketHandlers";
import { startOverdueJob } from "./jobs/overdueJob";

const app = createApp();
const server = http.createServer(app);

initSocket(server);
startOverdueJob();

server.listen(env.port, () => {
  console.log(`API listening on http://localhost:${env.port}`);
});
