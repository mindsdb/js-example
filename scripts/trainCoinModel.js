const commander = require("commander");
const fs = require("fs");
const MindsDB = require("mindsdb-js-sdk").default;

/**
 * Trains a ML timeseries model to forecast prices for a cryptocurrency pair, using
 * aggregated trade data from the Binance API. Note that you need to wait for the model to finish
 * training before you can use it.
 *
 * For a more accurate model that will take longer to train, increase the --size option.
 * For a model that may not be as accurate but will train quicker, decrease the --size and --window options.
 *
 * The --window option should always be less than the --size option.
 *
 * See (https://docs.mindsdb.com/model-types#time-series-models) for more detailed explanations.
 *
 * Example usage:
 *  node ./scripts/trainCoinModel.js --pair ethusdt --exit true
 *  node ./scripts/trainCoinModel.js --pair ethusdt --size 1000 --window 100 --exit true
 */

commander
  .version("1.0.0", "-v, --version")
  .usage("[OPTIONS]...")
  .option(
    "-c, --config-path <value>",
    "path to config JSON file used for connecting to MindsDB.",
    "./config/mindsdb-config.json"
  )
  .option(
    "-n, --name <value>",
    "name of the trained model. By default is <pair>_model (e.g. btcusdt_model)"
  )
  .option(
    "-p, --pair <value>",
    "symbol pair to train the model against (e.g. BTCUSDT)",
    "BTCUSDT"
  )
  .option(
    "-s, --size <value>",
    "how many rows of historical data you want to use for training.",
    10000
  )
  .option(
    "-w, --window <value>",
    "number of data rows used to train the model (see https://docs.mindsdb.com/model-types#time-series-models)",
    100
  )
  .option(
    "-h, --horizon <value>",
    "how many rows in the future you want to predict (see https://docs.mindsdb.com/model-types#time-series-models)",
    10
  )
  .option(
    "-x, --exit <value>",
    "whether or not to exit after training has begun. If false, will wait until training completes to exit",
    "false"
  )
  .parse(process.argv);

const options = commander.opts();

const configPath = options.configPath;
const rawConfig = fs.readFileSync(configPath);
const config = JSON.parse(rawConfig);

const _BINANCE_DATABASE = "my_binance";

async function createDatabaseIfNotExists(name) {
  const database = await MindsDB.Databases.getDatabase(name);
  if (!database) {
    console.log(`Connecting MindsDB database ${name} to Binance API`);
    await MindsDB.Databases.createDatabase(name, "binance", {});
    console.log("Connected");
  }
}

async function trainModel(name, symbolPair, limit, window, horizon) {
  const select = `
    SELECT * FROM aggregated_trade_data
    WHERE symbol = '${symbolPair}'
    AND interval = '1m'
    LIMIT ${limit};
  `;
  return await MindsDB.Models.trainModel(name, "open_price", "mindsdb", {
    integration: "my_binance",
    select: select,
    orderBy: "open_time",
    window: window,
    horizon: horizon,
    using: {
      "model.args": {
        submodels: [
          {
            module: "NeuralTs",
            args: {
              fit_on_dev: false,
              search_hyperparameters: false,
            },
          },
        ],
      },
    },
  });
}

function waitForTraining(name) {
  let intervalIterations = 0;
  return new Promise((resolve, reject) => {
    const modelInterval = setInterval(async () => {
      coinModel = await MindsDB.Models.getModel(name, "mindsdb");
      if (coinModel.status === "complete") {
        console.log(
          `Training for model ${name} complete after ${intervalIterations}s`
        );
        clearInterval(modelInterval);
        resolve();
      } else if (coinModel.status === "error") {
        console.log(
          `Something went wrong training ${name}. Please check you set the right command line options and try again.`
        );
        clearInterval(modelInterval);
        reject("Unknown error");
      } else if (intervalIterations % 10 === 0) {
        // Don't want to spam the command line so update every 10s.
        console.log(
          `Still training model ${name} after ${intervalIterations}s`
        );
      }
      intervalIterations++;
    }, 1000);
  });
}

async function main() {
  await MindsDB.connect({
    host: config.host,
    user: config.user,
    password: config.password,
  });
  console.log("Connected to MindsDB");

  await createDatabaseIfNotExists(_BINANCE_DATABASE);

  let modelName = `${options.pair.toLowerCase()}_model`;
  if (options.name) {
    modelName = options.name;
  }

  await trainModel(
    modelName,
    options.pair.toUpperCase(),
    parseInt(options.size),
    parseInt(options.window),
    parseInt(options.horizon)
  );
  console.log(`Started training model ${modelName}`);
  console.log(
    "Before you can use the model, you need to wait for training to be complete"
  );
  const statusCmd = `node ./scripts/getStatus.js --name=${modelName}`;

  const shouldExit = options.exit === "false" ? false : true;
  if (shouldExit) {
    console.log(
      `You can monitor the status of this model with \`${statusCmd}\``
    );
    return;
  }
  console.log(
    `You can exit and check the status of this model until it's complete with \`${statusCmd}\` instead of waiting here`
  );
  await waitForTraining(modelName);
}

main().catch((err) => {
  console.log("Training model failed with error:");
  console.log(err);
});
