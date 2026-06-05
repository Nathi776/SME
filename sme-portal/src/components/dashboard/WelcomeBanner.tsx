type WelcomeBannerProps = {
  username?: string;
  smeName?: string;
  smeId?: string;
};

export default function WelcomeBanner({ username, smeName, smeId }: WelcomeBannerProps) {
  const firstName = username || "there";
  const businessId = smeId ? (smeId.startsWith("SME-") ? smeId : `SME-2024-${String(smeId).padStart(4, "0")}`) : "Not available";

  return (
    <div className="flex min-h-[98px] flex-col justify-between gap-6 rounded-lg border border-[#e9eef8] bg-white px-6 py-5 shadow-sm xl:flex-row xl:items-center">
      <div>
        <h1 className="text-[22px] font-bold text-[#071942]">
          Welcome back, {firstName}! <span aria-hidden="true">{"\u{1F44B}"}</span>
        </h1>
        <p className="mt-1 text-sm text-[#31456f]">Here's what's happening with your business today.</p>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center xl:gap-16">
        <div>
          <p className="text-xs font-medium text-[#31456f]">Business Name</p>
          <p className="text-sm font-semibold text-[#071942]">{smeName || "Not available"}</p>
        </div>
        <div>
          <p className="text-xs font-medium text-[#31456f]">Business ID</p>
          <p className="text-sm font-semibold text-[#071942]">{businessId}</p>
        </div>
        <button className="inline-flex h-10 items-center justify-center rounded-md bg-[#3f63f1] px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#2d4fd4]">
          View Business Profile
        </button>
      </div>
    </div>
  );
}
