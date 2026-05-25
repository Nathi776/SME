type WelcomeBannerProps = {
  username?: string;
  smeName?: string;
  smeId?: string;
};

export default function WelcomeBanner({ username, smeName, smeId }: WelcomeBannerProps) {
  const firstName = username || "there";

  return (
    <div className="flex flex-col justify-between gap-6 rounded-2xl border border-[#e9eef8] bg-white p-6 shadow-sm sm:flex-row sm:items-center">
      <div>
        <h1 className="text-2xl font-bold text-[#071942]">
          Welcome back, {firstName}! <span aria-hidden="true">{"\u{1F44B}"}</span>
        </h1>
        <p className="mt-1 text-sm text-[#31456f]">Here's what's happening with your business today.</p>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-8">
        <div>
          <p className="text-xs font-medium text-[#31456f]">Business Name</p>
          <p className="text-sm font-semibold text-[#071942]">{smeName || "SME profile not found"}</p>
        </div>
        <div>
          <p className="text-xs font-medium text-[#31456f]">Business ID</p>
          <p className="text-sm font-semibold text-[#071942]">{smeId || "SME-2024-00125"}</p>
        </div>
        <button className="inline-flex items-center justify-center rounded-2xl bg-[#3f63f1] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#2d4fd4]">
          View Business Profile
        </button>
      </div>
    </div>
  );
}
