import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import Index from "./pages/Index";
import DevSocial from "./pages/DevSocial";
import ResumeAnalyzer from "./pages/ResumeAnalyzer";
import CareerRoadmap from "./pages/CareerRoadmap";
import AIMentor from "./pages/AIMentor";
import CollabBoard from "./pages/CollabBoard";
import StudyRooms from "./pages/StudyRooms";
import Login from "./pages/Login";
import SignUp from "./pages/SignUp";
import Profile from "./pages/Profile";
import NotFound from "./pages/NotFound";
import VideoTest from "./components/VideoTest";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<SignUp />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/devsocial" element={<DevSocial />} />
            <Route path="/resume-analyzer" element={<ResumeAnalyzer />} />
            <Route path="/career-roadmap" element={<CareerRoadmap />} />
            <Route path="/ai-mentor" element={<AIMentor />} />
            <Route path="/collabboard" element={<CollabBoard />} />
            <Route path="/collabboard/:boardId" element={<CollabBoard />} />
            <Route path="/study-rooms" element={<StudyRooms />} />
            <Route path="/study-rooms/:roomId" element={<StudyRooms />} />
            <Route path="/video-test" element={<VideoTest />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
