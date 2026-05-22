type WelcomeBannerProps = {
  username?: string;
  smeName?: string;
  smeId?: number;
};

export default function WelcomeBanner({ username, smeName, smeId }: WelcomeBannerProps) {
  const firstName = username || "there";
  const businessId = smeId ? `SME-2024-${String(smeId).padStart(5, "0")}` : "SME-2024-00125";

  return (
    <div className="flex flex-col justify-between gap-6 rounded-lg border border-[#e6eefc] bg-white px-6 py-6 shadow-sm md:flex-row md:items-center">
      <div className="flex-1">
        <h2 className="text-2xl font-semibold tracking-[-0.01em] text-[#071942]">
          Welcome back, {firstName}! <span aria-hidden="true">{"\u{1F44B}"}</span>
        </h2>
        <p className="mt-2 text-sm text-[#536582]">Here's what's happening with your business today.</p>
      </div>

      <div className="flex items-center gap-4">
        <div className="hidden sm:flex sm:gap-4">
          <div className="rounded-md bg-[#f6f9ff] px-4 py-2 text-sm">
            <p className="text-xs text-[#52607a]">Business Name</p>
            <p className="mt-1 font-medium text-[#10203a] truncate max-w-[220px]">{smeName || "SME profile not found"}</p>
          </div>
          <div className="rounded-md bg-[#f6f9ff] px-4 py-2 text-sm">
            <p className="text-xs text-[#52607a]">Business ID</p>
            <p className="mt-1 font-medium text-[#10203a]">{businessId}</p>
          </div>
        </div>

        <button className="ml-2 rounded-lg bg-gradient-to-b from-[#4b6bff] to-[#315cff] px-5 py-2 text-sm font-semibold text-white shadow-[0_8px_20px_rgba(49,92,255,0.12)] transition hover:opacity-95">
          View Business Profile
        </button>
      </div>
    </div>
  );
}
