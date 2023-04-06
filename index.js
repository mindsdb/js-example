const commander = require("commander");
const express = require("express");
const fs = require("fs");
const path = require("path");
const MindsDB = require("mindsdb-js-sdk").default;

const tradeDataHandler = require("./handlers/tradeDataHandler.js");
const forecastHandler = require("./handlers/forecastHandler.js");

commander
  .version("1.0.0", "-v, --version")
  .usage("[OPTIONS]...")
  .option(
    "-c, --config-path <value>",
    "path to config JSON file used for connecting to MindsDB.",
    "./config/mindsdb-config.json"
  )
  .option(
    "-m, --model-config-path <value>",
    "path to config JSON file used for mapping trained models to symbols.",
    "./config/model-config.json"
  )
  .parse(process.argv);

const options = commander.opts();

// Connect to MindsDB before we do anything.
const configPath = options.configPath;
const rawConfig = fs.readFileSync(configPath);
const config = JSON.parse(rawConfig);
MindsDB.connect({
  host: config.host,
  user: config.user,
  password: config.password,
})
  .then(() => {
    console.log("Successfully connected to MindsDB.");
  })
  .catch((error) => {
    console.log(
      `Something went wrong while connecting to MindsDB. Check that you have the right credentials in ${configPath}`
    );
    console.log(error);
    process.exit();
  });

const modelConfigPath = options.modelConfigPath;
const rawModelConfig = fs.readFileSync(modelConfigPath);
const modelConfig = JSON.parse(rawModelConfig);

const _DEFAULT_TRADE_DATA_LIMIT = 1000;
const _MAX_TRADE_DATA_LIMIT = 10000;

const app = express();
app.use(express.static("public"));
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "/index.html"));
});

app.get("/how-it-works", (_, res) => {
  res.sendFile(path.join(__dirname, "/how-it-works.html"));
});

app.get("/trade-data/:symbolId", async (req, res) => {
  let limit = _DEFAULT_TRADE_DATA_LIMIT;
  if (req.query && req.query.limit) {
    limit = parseInt(req.query.limit);
    if (limit > _MAX_TRADE_DATA_LIMIT) {
      res.status(400);
      res.send(
        `Limit ${limit} exceeds max aggregated trade data limit of ${_MAX_TRADE_DATA_LIMIT}`
      );
      return;
    }
  }
  const tradeData = await tradeDataHandler.getLatestAggregatedTradeData(
    MindsDB,
    req.params.symbolId,
    limit
  );
  res.send(tradeData);
});

app.get("/forecast/:symbolId", async (req, res) => {
  if (!req.params.symbolId in modelConfig) {
    res.status(400);
    res.send(`Unsupported symbol ${req.params.symbolId}. No model available.`);
    return;
  }
  const modelName = modelConfig[req.params.symbolId];
  const predictions = await forecastHandler.forecastNextSymbolPrices(
    MindsDB,
    req.params.symbolId,
    modelName
  );
  res.send(predictions);
});

const port = 3000;
app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
