export default function WelcomeBanner() {
  const firstName = "there";

  return (
    <div className="bg-card rounded-xl border border-border p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div>
        <h2 className="text-xl font-bold text-foreground">
          Welcome back, {firstName}! 👋
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Here's what's happening with your business today.
        </p>
      </div>
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <div className="text-sm">
          <p className="text-muted-foreground text-xs">Business Name</p>
          <p className="font-semibold text-foreground">Mokoena Electrical (Pty) Ltd</p>
        </div>
        <div className="text-sm">
          <p className="text-muted-foreground text-xs">Business ID</p>
          <p className="font-semibold text-foreground">SME-2024-00125</p>
        </div>
        <button className="rounded-md bg-sidebar-primary px-4 py-2 text-xs font-semibold text-white hover:bg-sidebar-primary/90">
          View Business Profile
        </button>
      </div>
    </div>
  );
}
