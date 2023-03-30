const commander = require("commander");
const fs = require("fs");
const MindsDB = require("mindsdb-js-sdk").default;

/**
 * Checks the status of a model (generating, training, error, or complete).
 * Example usage: node ./scripts/getStatus.js --name btcusdt_model
 */

commander
  .version("1.0.0", "-v, --version")
  .usage("[OPTIONS]...")
  .option(
    "-c, --config-path <value>",
    "path to config JSON file used for connecting to MindsDB.",
    "./config/mindsdb-config.json"
  )
  .option("-n, --name <value>", "name of the model to check the status for")
  .parse(process.argv);

const options = commander.opts();

const configPath = options.configPath;
const rawConfig = fs.readFileSync(configPath);
const config = JSON.parse(rawConfig);

async function main() {
  await MindsDB.connect({
    host: config.host,
    user: config.user,
    password: config.password,
  });
  return await MindsDB.Models.getModel(options.name, "mindsdb");
}

main()
  .then((model) => {
    if (model) {
      console.log(`Status of model ${model.name} is ${model.status}`);
      return;
    }
    console.log(`Model with name ${options.name} does not exist`);
  })
  .catch((err) => {
    console.log("Fetching model failed with error:");
    console.log(err);
  });
