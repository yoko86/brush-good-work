import { createServer } from '../src/backend/server.js';

const port = Number(process.env.PORT || 3000);
const app = createServer();

app.listen(port, () => {
  console.log(`Server listening on http://localhost:${port}`);
});
