/**
 * RetailerCard.jsx
 * Shows a live price result from the AI search agent.
 */
export default function RetailerCard({ retailer, packSize, totalPrice, pricePerNappy, url }) {
  return (
    <div className="flex justify-between items-center bg-white rounded-2xl border border-cream-200 p-4 mb-2">
      <div>
        <p className="text-[13px] font-medium">{retailer}</p>
        <p className="text-[12px] text-cream-400">{packSize} nappies · £{pricePerNappy?.toFixed(2)}/nappy</p>
      </div>
      <div className="text-right">
        <p className="text-base font-semibold mb-1.5">£{totalPrice?.toFixed(2)}</p>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-primary !w-auto !py-2 !px-3.5 !text-[13px] inline-block text-center"
        >
          View deal
        </a>
      </div>
    </div>
  );
}
