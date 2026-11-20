require("dotenv").config();

const app = require("./server/app");
const connectDatabase = require("./server/db");

const port = Number(process.env.PORT) || 5000;

connectDatabase()
  .then(() => {
    app.listen(port, () => console.log(`PawCare API listening on http://localhost:${port}`));
  })
  .catch((error) => {
    console.error("Could not connect to MongoDB:", error.message);
    process.exitCode = 1;
  });
