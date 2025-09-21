import Navbar from "@/components/ui/navbar";
import DevSocialConnected from "@/components/DevSocialConnected";

const DevSocial = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="pt-16">
        <DevSocialConnected />
      </main>
    </div>
  );
};

export default DevSocial;