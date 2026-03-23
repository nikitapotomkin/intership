const fs = require("fs");

function asyncRacer() {
  console.log("Start");

  setTimeout(() => console.log("Timeout 0ms"), 0);
  setImmediate(() => console.log("Immediate"));
  process.nextTick(() => console.log("Next Tick"));
  Promise.resolve().then(() => console.log("Promise"));

  console.log("End");
}

function blockingTimer() {
  console.log("Start heavy loop");

  setTimeout(() => console.log("I should run early!"), 10);

  const start = Date.now();
  while (Date.now() - start < 5000) {
  }

  console.log("Heavy loop finished");
}

function fileReadDemo() {
  console.log("Start reading files");

  fs.readFile("bigfile.txt", "utf8", () => {
    console.log("Async file read finished");
  });

  const data = fs.readFileSync("bigfile.txt", "utf8");
  console.log("Sync file read finished");

  console.log("End of script");
}


const choice = process.argv[2];

switch (choice) {
  case "asyncRacer":
    asyncRacer();
    break;
  case "blockingTimer":
    blockingTimer();
    break;
  case "fileReadDemo":
    fileReadDemo();
    break;
}