Chart.defaults.scale.grid.display = false;
_MAX_RETRIES = 3;

fetchTradeData("btcusdt");
fetchTradeData("ethusdt");
fetchTradeData("bnbusdt");
fetchTradeData("dogeusdt");
fetchTradeData("solusdt");
fetchPredictionData("btcusdt");
fetchPredictionData("ethusdt");
fetchPredictionData("bnbusdt");
fetchPredictionData("dogeusdt");
fetchPredictionData("solusdt");

function makeTradeDataChart(symbol, tradeData) {
  // Include labels for the last hour.
  const labels = tradeData.slice(-61).map((d, i) => "-" + (60 - i) + "m");
  labels[labels.length - 1] = "Now";

  const lineData = {
    labels: labels,
    datasets: [
      {
        label: "",
        data: lastHourPrices,
        borderColor: "#00A587",
        tension: 0.1,
      },
    ],
  };

  const chartDiv = document.getElementById(`${symbol}-chart`);
  const chartCanvas = document.createElement("canvas");
  chartCanvas.style.height = "100px";
  chartDiv.parentNode.replaceChild(chartCanvas, chartDiv);
  new Chart(chartCanvas, {
    type: "line",
    data: lineData,
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false,
        },
      },
      scales: {
        x: {
          ticks: {
            autoSkip: true,
            autoSkipPadding: 40,
          },
        },
      },
    },
  });
}

function fetchTradeData(symbol, currentRetry = 0) {
  axios
    .get(`/trade-data/${symbol}?limit=1440`)
    .then((data) => {
      const tradeData = data.data;
      if (tradeData.length === 0) {
        // If we fail to get trade data the promise won't reject, it will
        // just return empty data. So handle retrying this way.
        if (currentRetry < _MAX_RETRIES) {
          console.log(`Couldn't fetch data for symbol ${symbol}. Retrying`);
          return fetchTradeData(symbol, currentRetry + 1);
        }
        return Promise.reject(data);
      }
      const allPrices = tradeData.map((d) => d["close_price"]);
      lastHourPrices = allPrices.slice(-61);

      // Update current price.
      const symbolPriceEle = document.getElementById(`${symbol}-price`);
      symbolPriceEle.innerHTML =
        "$" + parseFloat(tradeData[tradeData.length - 1]["close_price"]);

      // Update change in price since last minute.
      const symbol1pChangeEle = document.getElementById(`${symbol}-1m-percent`);
      oneMinutePercentChange =
        (100 *
          (lastHourPrices[lastHourPrices.length - 1] -
            lastHourPrices[lastHourPrices.length - 2])) /
        lastHourPrices[lastHourPrices.length - 2];
      symbol1pChangeEle.innerHTML = oneMinutePercentChange.toPrecision(3) + "%";
      symbol1pChangeEle.classList +=
        oneMinutePercentChange < 0 ? " text-red-500" : " text-primary-500";

      // Update change in price since last hour.
      const symbol1hPercentChangeEle = document.getElementById(
        `${symbol}-1h-percent`
      );
      oneHourPercentChange =
        (100 *
          (lastHourPrices[lastHourPrices.length - 1] - lastHourPrices[0])) /
        lastHourPrices[0];
      symbol1hPercentChangeEle.innerHTML =
        oneHourPercentChange.toPrecision(3) + "%";
      symbol1hPercentChangeEle.classList +=
        oneHourPercentChange < 0 ? " text-red-500" : " text-primary-500";

      // Update change in price since last day.
      const symbol1dPercentChangeEle = document.getElementById(
        `${symbol}-1d-percent`
      );
      oneDayPercentChange =
        (100 * (allPrices[allPrices.length - 1] - allPrices[0])) / allPrices[0];
      symbol1dPercentChangeEle.innerHTML =
        oneDayPercentChange.toPrecision(3) + "%";
      symbol1dPercentChangeEle.classList +=
        oneDayPercentChange < 0 ? " text-red-500" : " text-primary-500";

      makeTradeDataChart(symbol, tradeData);
    })
    .catch((err) => {
      console.log("Could not fetch trade data");
      console.log(err);
    });
}

function fetchPredictionData(symbol, currentRetry = 0) {
  axios
    .get(`/forecast/${symbol}`)
    .then((predictions) => {
      if (predictions.data.length === 0) {
        // If we fail to get predictions the promise won't reject, it will
        // just return empty data. So handle retrying this way.
        if (currentRetry < _MAX_RETRIES) {
          console.log(
            `Couldn't prediction data for symbol ${symbol}. Retrying`
          );
          return fetchPredictionData(symbol, currentRetry + 1);
        }
        return Promise.reject(predictions);
      }
      // Update 1m prediction.
      const nextMinPrice = predictions.data[0]["open_price"];
      const nextPriceEle = document.getElementById(`${symbol}-1m-forecast`);
      nextPriceEle.innerHTML = "$" + parseFloat(nextMinPrice).toFixed(3);
    })
    .catch((err) => {
      console.log("Could not fetch predictions for . Retrying");
      console.log(err);
    });
}
