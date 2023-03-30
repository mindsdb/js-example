const _BINANCE_INTEGRATION = "my_binance";
const _AGGREGATED_TRADE_DATA_TABLE = "aggregated_trade_data";

async function getLatestAggregatedTradeData(mdb, symbol, limit = 1000) {
  const binanceQuery = `SELECT * FROM ${_BINANCE_INTEGRATION}.${_AGGREGATED_TRADE_DATA_TABLE} WHERE symbol='${symbol.toUpperCase()}' LIMIT ${limit}`;
  const tradeDataResponse = await mdb.SQL.runQuery(binanceQuery);
  if (!tradeDataResponse.rows) {
    return [];
  }
  return tradeDataResponse.rows;
}

module.exports = { getLatestAggregatedTradeData };
