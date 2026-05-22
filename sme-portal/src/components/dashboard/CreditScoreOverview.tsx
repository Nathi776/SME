import { Info } from "lucide-react";

type CreditScoreOverviewProps = {
  score: number | string | null;
};

export default function CreditScoreOverview({ score }: CreditScoreOverviewProps) {
  const numericScore = Number(score ?? 0);
  const displayScore = Math.max(0, Math.min(numericScore, 100));
  const standing = score === null ? "No score yet" : numericScore >= 80 ? "Excellent" : numericScore >= 60 ? "Good Standing" : numericScore >= 40 ? "Needs Attention" : "High Risk";
  const standingColor = score === null ? "text-[#6d7b99]" : numericScore >= 60 ? "text-[#009a65]" : "text-[#d97706]";

  return (
    <div className="flex min-h-[380px] flex-col rounded-lg border border-[#eef4ff] bg-white px-6 py-6 shadow-sm xl:col-span-4">
      <div className="mb-6 flex items-center gap-2">
        <h3 className="text-base font-bold text-[#071942]">Credit Score Overview</h3>
        <Info className="h-4 w-4 text-[#91a1bf]" />
      </div>

      <div className="flex flex-1 flex-col items-center justify-center">
        <div className="relative h-44 w-[280px] max-w-full">
          <svg viewBox="0 0 280 170" className="h-full w-full" aria-hidden="true">
            <defs>
              <linearGradient id="scoreGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#ff4545" />
                <stop offset="33%" stopColor="#ff7a30" />
                <stop offset="67%" stopColor="#ffce36" />
                <stop offset="100%" stopColor="#05a879" />
              </linearGradient>
            </defs>
            <path d="M 34 136 A 106 106 0 0 1 246 136" fill="none" stroke="#edf2fa" strokeLinecap="round" strokeWidth="18" />
            <path
              d="M 34 136 A 106 106 0 0 1 246 136"
              fill="none"
              stroke="url(#scoreGradient)"
              strokeDasharray={`${displayScore * 3.33} 333`}
              strokeLinecap="round"
              strokeWidth="18"
            />
          </svg>
          <div className="absolute inset-x-0 bottom-4 flex flex-col items-center">
            <span className="text-5xl font-extrabold text-[#071942]">{score === null ? "-" : displayScore}</span>
            <span className="mt-1 text-sm text-[#6b7f99]">out of 100</span>
          </div>
        </div>
        <div className="mt-3 flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-[#58d67b]" />
          <span className={`text-base font-bold ${standingColor}`}>{standing}</span>
        </div>
        <p className="mt-4 max-w-[260px] text-center text-sm leading-6 text-[#31456f]">
          Your score is based on payment behavior, revenue consistency, and invoice history.
        </p>
      </div>

      <button className="mt-4 inline-flex items-center justify-center self-center rounded-md border border-[#a9bcf5] bg-white px-5 py-2.5 text-sm font-semibold text-[#315cff] hover:bg-[#f5f7ff]">
        View Score Details
      </button>
    </div>
  );
}
