type WelcomeBannerProps = {
  username?: string;
  smeName?: string;
  industry?: string;
};

export default function WelcomeBanner({ username, smeName, industry }: WelcomeBannerProps) {
  const firstName = username || "there";

  return (
    <div className="bg-white border border-gray-100 rounded-lg shadow-sm p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div>
        <h2 className="text-xl font-semibold text-foreground">Welcome back, {firstName}! 👋</h2>
        <p className="text-sm text-muted-foreground mt-1">Here's what's happening with your business today.</p>
      </div>
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <div className="text-sm">
          <p className="text-muted-foreground text-xs">Business Name</p>
          <p className="font-semibold text-foreground">{smeName || "SME profile not found"}</p>
        </div>
        <div className="text-sm">
          <p className="text-muted-foreground text-xs">Industry</p>
          <p className="font-semibold text-foreground">{industry || "-"}</p>
        </div>
        <button className="rounded-md bg-[#2F6BFF] px-4 py-2 text-xs font-semibold text-white hover:bg-[#245be6]">
          View Business Profile
        </button>
      </div>
    </div>
  );
}
