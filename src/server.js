import 'dotenv/config';
import http from 'http';
import { router } from './router.js';
import { errorHandler } from './common/utils/errorHandler.js';

const server = http.createServer(async (req, res) => {
 try {
    await router(req, res);
  } catch (err) {
    errorHandler(err, res);
  }
});

const PORT = process.env.PORT;
server.listen(PORT, () => {
  console.log(`Server started: http://localhost:${PORT}`);
});
