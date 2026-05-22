import HomeNav from "../components/home/HomeNav";
import HeroSection from "../components/home/HeroSection";
import StatsBar from "../components/home/StatsBar";
import FeaturesSection from "../components/home/FeaturesSection";
import TrustBadge from "../components/home/TrustBadge";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white font-inter">
      <HomeNav />
      <main>
        <HeroSection />
        <StatsBar />
        <FeaturesSection />
        <TrustBadge />
      </main>
    </div>
  );
}
