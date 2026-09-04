import { Footer } from "@/components/marketing/footer";
import { MarketingHeader } from "@/components/marketing/header";
import { ScrollMotion } from "@/components/motion/scroll-motion";

export default function CareersLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-paper">
      <ScrollMotion />
      <MarketingHeader />
      <main>{children}</main>
      <Footer />
    </div>
  );
}
