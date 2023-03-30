const _BINANCE_INTEGRATION = "my_binance";
const _AGGREGATED_TRADE_DATA_TABLE = "aggregated_trade_data";

async function getOrCreateRecentTradeDataView(mdb, symbol) {
  const viewName = `recent_${symbol}_view`;
  const allViews = await mdb.Views.getAllViews("mindsdb");
  const existingView = allViews.find((v) => v.name === viewName);
  if (existingView) {
    return existingView;
  }
  // Get latest 1000m of data.
  const viewSelect = `SELECT * FROM ${_BINANCE_INTEGRATION}.${_AGGREGATED_TRADE_DATA_TABLE} WHERE symbol = '${symbol.toUpperCase()}'`;
  return await mdb.Views.createView(viewName, "mindsdb", viewSelect);
}

async function forecastNextSymbolPrices(mdb, symbol, modelName, limit = 10) {
  const recentView = await getOrCreateRecentTradeDataView(mdb, symbol);
  const predictQuery = `SELECT m.* FROM ${recentView.name} AS t JOIN mindsdb.${modelName} AS m WHERE m.open_time > LATEST LIMIT ${limit}`;
  const predictionsResponse = await mdb.SQL.runQuery(predictQuery);
  return predictionsResponse.rows;
}

module.exports = { forecastNextSymbolPrices };
