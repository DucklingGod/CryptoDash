export default function TopMoversList({ title, coins, color }) {
    return (
      <div>
        <h3 className={`font-semibold ${color} mb-2`}>{title}</h3>
        {coins.map((coin, index) => (
          <div key={coin.id} className="flex justify-between mb-1">
            <span>{index + 1}. {coin.symbol}</span>
            <span className={color}>{coin.change.toFixed(2)}%</span>
          </div>
        ))}
      </div>
    );
  }
  