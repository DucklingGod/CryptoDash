function getGaugeAngle(trend) {
    if (trend === "bullish") return 0;    // right
    if (trend === "bearish") return 180;      // left
    if (trend === "neutral" || trend === "unknown") return 90; // top
    return 90;
  }
  
  export function HalfCircleGauge({ trend, label }) {
    const angle = getGaugeAngle(trend);
    const radius = 40;
    const cx = 50, cy = 60;
    const pointerLength = 35;
    const rad = (Math.PI * angle) / 180;
    const x = cx + pointerLength * Math.cos(rad);
    const y = cy - pointerLength * Math.sin(rad);
  
    return (
      <div className="flex flex-col items-center">
        <svg width="100" height="60" viewBox="0 0 100 60">
          {/* Half circle */}
          <path
            d="M10,60 A40,40 0 0,1 90,60"
            fill="none"
            stroke="#444"
            strokeWidth="8"
          />
          {/* Pointer */}
          <line
            x1={cx}
            y1={cy}
            x2={x}
            y2={y}
            stroke={
              trend === "bullish"
                ? "#22c55e"
                : trend === "bearish"
                ? "#ef4444"
                : "#fbbf24"
            }
            strokeWidth="5"
            strokeLinecap="round"
          />
        </svg>
        <span className="text-xs mt-1">{label}</span>
        <span className={`font-bold ${trend === "bullish" ? "text-green-400" : trend === "bearish" ? "text-red-400" : "text-yellow-400"}`}>
          {trend ? trend.toUpperCase() : "LOADING"}
        </span>
      </div>
    );
  }