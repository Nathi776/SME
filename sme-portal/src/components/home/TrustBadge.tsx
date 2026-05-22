import { ShieldCheck } from "lucide-react";

export default function TrustBadge() {
  return (
    <section className="border-t border-gray-100 bg-white py-8">
      <div className="mx-auto flex max-w-7xl items-center justify-center gap-2 px-4 text-sm text-gray-500">
        <ShieldCheck className="h-5 w-5 text-green-500" />
        <span>Trusted by leading SMEs across South Africa</span>
      </div>
    </section>
  );
}
