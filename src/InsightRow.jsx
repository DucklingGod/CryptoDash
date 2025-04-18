export default function InsightRow({ icon, label, value, valueClass = "" }) {
    return (
      <div className="flex justify-between items-center border-b border-gray-700 pb-2">
        <div className="flex items-center gap-2">
          <span className="text-xl">{icon}</span>
          <span className="text-gray-400">{label}</span>
        </div>
        <span className={`font-semibold text-right ${valueClass}`}>{value}</span>
      </div>
    );
  }
  