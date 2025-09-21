import Navbar from "@/components/ui/navbar";
import Hero from "@/components/sections/Hero";
import Features from "@/components/sections/Features";
import Community from "@/components/sections/Community";
import Footer from "@/components/sections/Footer";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main>
        <Hero />
        <Features />
        <Community />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
