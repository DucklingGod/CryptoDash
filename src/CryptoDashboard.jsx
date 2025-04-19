import React, { useEffect, useState } from "react";
import axios from "axios";
import { Sun, Moon } from "lucide-react";
import { HalfCircleGauge } from "./HalfCircleGauge"; // adjust path if needed

export default function CryptoDashboard() {
  const [allCoins, setAllCoins] = useState([]);
  const [selectedCoin, setSelectedCoin] = useState(null);
  const [pendingCoin, setPendingCoin] = useState(selectedCoin);
  const [coinInfo, setCoinInfo] = useState(null);
  const [newsItems, setNewsItems] = useState([]);
  const [coinPrices, setCoinPrices] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem("theme") !== "light");
  const [newsError, setNewsError] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState(searchQuery);
  const [marketTrend, setMarketTrend] = useState(null);
  const [coinInfoLoading, setCoinInfoLoading] = useState(true);
  const [marketTrends, setMarketTrends] = useState({
    trend_1d: null,
    trend_7d: null,
    trend_30d: null,
  });
  const [sidebarOpen, setSidebarOpen] = useState(false);

  console.log("selectedCoin at render:", selectedCoin);

  // Debounce search
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedSearch(searchQuery), 300);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  // Debounce coin selection
  useEffect(() => {
    const handler = setTimeout(() => setSelectedCoin(pendingCoin), 300);
    return () => clearTimeout(handler);
  }, [pendingCoin]);

  // Dark mode toggle
  useEffect(() => {
    document.documentElement.classList.toggle("dark", darkMode);
    localStorage.setItem("theme", darkMode ? "dark" : "light");
  }, [darkMode]);

  // Fetch top coins on mount
  useEffect(() => {
    async function fetchTopCoins() {
      try {
        const res = await axios.get(
          "https://api.coingecko.com/api/v3/coins/markets",
          {
            params: {
              vs_currency: "usd",
              order: "market_cap_desc",
              per_page: 20,
              page: 1,
            },
          }
        );
        const formatted = res.data.map((coin) => ({
          id: coin.id,
          symbol: coin.symbol.toUpperCase(),
          tradingview: `BINANCE:${coin.symbol.toUpperCase()}USDT`,
        }));
        setAllCoins(formatted);
        if (!selectedCoin) {
          setSelectedCoin(formatted[0]);
          setPendingCoin(formatted[0]); // <-- add this line
        }
      } catch (error) {
        console.error("Error fetching coins:", error);
      }
    }
    fetchTopCoins();
  }, []);

  // Fetch coin info when selectedCoin changes
  useEffect(() => {
    if (!selectedCoin) return;
    async function fetchData() {
      setCoinInfoLoading(true);
      try {
        const res = await axios.get(`https://api.coingecko.com/api/v3/coins/${selectedCoin.id}`);
        const data = res.data.market_data;
        setCoinInfo({
          price: data.current_price.usd,
          marketCap: data.market_cap.usd,
          roi: data.roi?.percentage || 0,
          priceChange: data.price_change_percentage_24h,
        });
      } catch (e) {
        console.error(e);
      }
      setCoinInfoLoading(false);
    }
    fetchData();
  }, [selectedCoin]);

  // Fetch prices for all coins
  useEffect(() => {
    if (allCoins.length === 0) return;
    async function fetchCoinPrices() {
      setIsLoading(true);
      try {
        const ids = allCoins.map((c) => c.id).join(",");
        const res = await axios.get(
          `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true`
        );
        setCoinPrices(res.data);
      } catch (e) {
        console.error(e);
      }
      setIsLoading(false);
    }
    fetchCoinPrices();
  }, [allCoins]);

  // Fetch news for selected coin
  useEffect(() => {
    if (!selectedCoin) return;
    async function fetchNews() {
      try {
        const key = import.meta.env.VITE_CRYPTOPANIC_KEY;
        const url = `https://thingproxy.freeboard.io/fetch/https://cryptopanic.com/api/v1/posts/?auth_token=${key}&public=true`;
        const res = await axios.get(url);
        setNewsItems(res.data.results.slice(0, 5));
        setNewsError(false);
      } catch {
        setNewsItems([]);
        setNewsError(true);
      }
    }
    fetchNews();
  }, [selectedCoin]);

  // Fetch market trends for different timeframes
  useEffect(() => {
    if (!selectedCoin) return;
    console.log("fetchMarketTrends running for", selectedCoin.symbol);
    async function fetchMarketTrends() {
      try {
        const prices_30d = await fetchCoinGeckoHistory(selectedCoin.id, 30);
        if (!prices_30d.length) throw new Error("No price data");
        const prices_7d = prices_30d.slice(-7);
        const prices_1d = prices_30d.slice(-2);

        console.log("CoinGecko prices:", { prices_1d, prices_7d, prices_30d });
        if (
          prices_1d.length < 2 ||
          prices_7d.length < 2 ||
          prices_30d.length < 2 ||
          prices_1d.some(isNaN) ||
          prices_7d.some(isNaN) ||
          prices_30d.some(isNaN)
        ) {
          setMarketTrends({
            trend_1d: "unknown",
            trend_7d: "unknown",
            trend_30d: "unknown",
          });
          return;
        }

        const backendUrl = import.meta.env.VITE_BACKEND_URL;
        const trendRes = await axios.post(`${backendUrl}/predict`, {
          prices_1d,
          prices_7d,
          prices_30d,
        });
        setMarketTrends(trendRes.data);
      } catch (e) {
        setMarketTrends({
          trend_1d: "unknown",
          trend_7d: "unknown",
          trend_30d: "unknown",
        });
      }
    }
    fetchMarketTrends();
  }, [selectedCoin]);

  async function fetchCoinGeckoHistory(id = "bitcoin", days = 30) {
    try {
      const url = `https://thingproxy.freeboard.io/fetch/https://api.coingecko.com/api/v3/coins/${id}/market_chart?vs_currency=usd&days=${days}`;
      const res = await axios.get(url);
      return res.data.prices.map(([_, price]) => price);
    } catch (e) {
      console.error("CoinGecko fetch error:", e);
      return [];
    }
  }

  // Filtering and sorting
  const filteredCoins = allCoins.filter(coin =>
    coin.symbol.toLowerCase().includes(debouncedSearch.toLowerCase())
  );

  const sortedCoins = allCoins
    .map((coin) => {
      const priceData = coinPrices[coin.id];
      if (!priceData) return null;
      return {
        id: coin.id,
        symbol: coin.symbol,
        price: priceData.usd,
        change: priceData.usd_24h_change,
      };
    })
    .filter(Boolean)
    .sort((a, b) => b.change - a.change);

  const topGainers = sortedCoins.slice(0, 3);
  const topLosers = sortedCoins.slice(-3).reverse();

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-gradient-to-r from-gray-900 via-black to-gray-900 text-white">
      {/* Centered title (top) */}
      <div className="fixed top-0 left-0 w-full z-20 flex justify-center items-center h-16 bg-black/60 backdrop-blur-md border-b border-gray-700 px-4 lg:hidden">
        <h1 className="text-3xl sm:text-3xl font-bold">CRYPTO DASH</h1>
      </div>

      {/* Hamburger button (top-left) */}
      <button
        className="fixed top-2 left-5 z-30 lg:hidden flex flex-col justify-center items-center w-12 h-12 bg-gray-800/80 rounded-lg"
        onClick={() => setSidebarOpen(true)}
        aria-label="Open sidebar"
      >
        <span className="block w-8 h-1 bg-white mb-1.5 rounded"></span>
        <span className="block w-8 h-1 bg-white mb-1.5 rounded"></span>
        <span className="block w-8 h-1 bg-white rounded"></span>
      </button>

      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={`
          fixed top-0 left-0 h-full w-64 bg-black/90 backdrop-blur-md border-r border-gray-700 z-40
          transform transition-transform duration-300
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
          lg:static lg:translate-x-0 lg:w-64 lg:h-auto lg:bg-black/50
          p-4 lg:p-6 flex flex-col
        `}
      >
        {/* Close button for mobile */}
        <button
          className="absolute top-4 right-4 lg:hidden text-white text-2xl"
          onClick={() => setSidebarOpen(false)}
          aria-label="Close sidebar"
        >
          &times;
        </button>
        <h1 className="text-2xl font-bold mb-6">CRYPTO DASH</h1>

        <input
          type="text"
          placeholder="Search for coins..."
          className="mb-6 p-2 bg-gray-800/70 rounded"
          onChange={(e) => setSearchQuery(e.target.value)}
        />

        <select
          value={selectedCoin?.id || ""}
          onChange={(e) => setPendingCoin(allCoins.find((c) => c.id === e.target.value))}
          className="mb-6 p-2 bg-gray-800/70 rounded"
        >
          {filteredCoins.map((c) => (
            <option key={c.id} value={c.id}>{c.symbol}</option>
          ))}
        </select>

        <button
          onClick={() => setDarkMode((d) => !d)}
          className="mb-6 flex items-center gap-2 hover:opacity-80"
        >
          {darkMode ? <Sun className="text-yellow-300" /> : <Moon className="text-blue-300" />}
          <span>Toggle {darkMode ? "Light" : "Dark"}</span>
        </button>

        <nav className="flex flex-col gap-4">
          {"Insights Analysis Risk Trading Settings".split(" ").map((item) => (
            <button key={item} className="text-gray-300 hover:text-white text-left">
              {item}
            </button>
          ))}
        </nav>
      </aside>

      <main className="flex-1 pt-16 p-2 sm:p-4 lg:p-8 grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-8">
        <div className="space-y-8">
          <div className="bg-black/40 backdrop-blur-lg border border-gray-700 rounded-2xl p-3 sm:p-6 shadow-xl mb-4 sm:mb-8 mt-8 sm:mt-0">
            <h2 className="text-3xl font-semibold mb-6">{selectedCoin?.symbol} Insights</h2>
            {coinInfoLoading || !coinInfo ? (
              <div className="space-y-3 animate-pulse">
                <div className="h-5 bg-gray-700 rounded w-1/3" />
                <div className="h-5 bg-gray-700 rounded w-2/3" />
                <div className="h-5 bg-gray-700 rounded w-1/2" />
              </div>
            ) : (
              <div className="space-y-4 text-sm">
                <div className="flex justify-between items-center border-b border-gray-700 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">💰</span>
                    <span className="text-gray-400">Price</span>
                  </div>
                  <span className="text-green-400 text-3xl font-semibold text-right">${coinInfo.price.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center border-b border-gray-700 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">📉</span>
                    <span className="text-gray-400">24h Change</span>
                  </div>
                  <span className={`${coinInfo.priceChange > 0 ? "text-green-400" : "text-red-400"} font-semibold text-right`}>
                    {coinInfo.priceChange.toFixed(2)}%
                  </span>
                </div>
                <div className="flex justify-between items-center border-b border-gray-700 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">📊</span>
                    <span className="text-gray-400">Market Cap</span>
                  </div>
                  <span className="text-white font-semibold text-right">${coinInfo.marketCap.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">📈</span>
                    <span className="text-gray-400">ROI</span>
                  </div>
                  <span className="text-blue-400 font-semibold text-right">{coinInfo.roi.toFixed(2)}%</span>
                </div>
              </div>
            )}
          </div>

          <div className="bg-black/40 backdrop-blur-lg border border-gray-700 rounded-2xl p-6 shadow-xl mb-8">
            <h2 className="text-xl font-semibold mb-4">Market Trends</h2>
            <div className="flex justify-around">
              <HalfCircleGauge trend={marketTrends.trend_1d} label="Day" />
              <HalfCircleGauge trend={marketTrends.trend_7d} label="Week" />
              <HalfCircleGauge trend={marketTrends.trend_30d} label="Month" />
            </div>
          </div>

          <div className="bg-black/40 backdrop-blur-lg border border-gray-700 rounded-2xl p-6 shadow-xl">
            <h2 className="text-xl font-semibold mb-4">Top Gainers & Losers</h2>
            <div className="grid grid-cols-2 gap-4 text-sm text-gray-300">
              <div>
                <h3 className="font-semibold text-green-400 mb-2">Top Gainers</h3>
                {topGainers.map((coin, index) => (
                  <div key={coin.id} className="flex justify-between mb-1">
                    <span>{index + 1}. {coin.symbol}</span>
                    <span className="text-green-500">{coin.change.toFixed(2)}%</span>
                  </div>
                ))}
              </div>
              <div>
                <h3 className="font-semibold text-red-400 mb-2">Top Losers</h3>
                {topLosers.map((coin, index) => (
                  <div key={coin.id} className="flex justify-between mb-1">
                    <span>{index + 1}. {coin.symbol}</span>
                    <span className="text-red-400">{coin.change.toFixed(2)}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="bg-black/40 backdrop-blur-lg border border-gray-700 rounded-2xl p-6 shadow-xl">
            <h2 className="text-xl font-semibold mb-4">Coin Prices Tracker</h2>
            <div className="max-h-40 sm:max-h-52 overflow-y-auto pr-1 space-y-2 scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-transparent">
              <div className="flex justify-between text-sm text-gray-500 border-b border-gray-700 pb-1">
                <span className="w-1/3">Coin</span>
                <span className="w-1/3">Price</span>
                <span className="w-1/3 text-right">Price Change</span>
              </div>
              {isLoading ? (
                <div className="animate-pulse space-y-2">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="h-5 bg-gray-700 rounded w-3/4" />
                  ))}
                </div>
              ) : (
                filteredCoins.map((coin) => {
                  const priceData = coinPrices[coin.id];
                  const price = priceData?.usd;
                  const change = priceData?.usd_24h_change;
                  return (
                    <div
                      key={coin.id}
                      className="flex justify-between text-sm text-gray-300 border-b border-gray-700 pb-1 cursor-pointer hover:text-white"
                      onClick={() => setSelectedCoin(coin)}
                    >
                      <span className="w-1/3">{coin.symbol}</span>
                      <span className="w-1/3 text-green-400">${price !== undefined ? price.toLocaleString() : "N/A"}</span>
                      <span
                        className={`w-1/3 text-right ${change > 0 ? "text-green-500" : "text-red-400"}`}
                      >
                        {change !== undefined ? change.toFixed(2) : "N/A"}%
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="bg-black/40 backdrop-blur-lg border border-gray-700 rounded-2xl p-6 shadow-xl">
            <h2 className="text-xl font-semibold mb-4">Latest News</h2>
            {newsError ? (
              <div className="text-sm text-red-400">⚠️ Failed to fetch news. Please try again later.</div>
            ) : (
              <ul className="space-y-3">
                {newsItems.length > 0 ? (
                  newsItems.map((news, index) => (
                    <li key={index} className="text-sm text-gray-300">
                      <a href={news.url} target="_blank" rel="noopener noreferrer" className="hover:text-blue-400">
                        {news.title}
                      </a>
                    </li>
                  ))
                ) : (
                  <li className="text-sm text-gray-500">No news available</li>
                )}
              </ul>
            )}
          </div>
        </div>

        <div className="bg-black/40 backdrop-blur-lg border border-gray-700 rounded-2xl p-6 shadow-xl">
          <h2 className="text-xl font-semibold mb-4">Price Chart</h2>
          {selectedCoin && (
            <iframe
              src={`https://s.tradingview.com/widgetembed/?symbol=${selectedCoin.tradingview}&interval=60&theme=${darkMode ? "dark" : "light"}&style=1`}
              className="w-full h-[500px] lg:h-[720px] rounded-lg border border-gray-600"
              frameBorder="0"
              allowTransparency
              scrolling="no"
            />
          )}
        </div>
      </main>
    </div>
  );
}
