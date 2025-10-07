try {
  require("dotenv").config();
  require("./server");

  process.on("unhandledRejection", (error) => {
    console.error(`There was an unhandled rejection: ${error.message}`);
    console.error(error.stack);
  });

  process.on("uncaughtException", (error) => {
    console.error(`There was an uncaught error: ${error.message}`);
    console.error(error.stack);
  });
} catch (error) {
  console.error(`There was an uncaught error: ${error.message}`);
  console.error(error.stack);
}


