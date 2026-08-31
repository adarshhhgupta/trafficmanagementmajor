import "./App.css";
import { BrowserRouter, Routes, Route, Link, useLocation } from "react-router-dom";
import { LayoutDashboard, BarChart3, Crown, Settings as SettingsIcon } from "lucide-react";
import Dashboard from "./pages/Dashboard";
import Analytics from "./pages/Analytics";
import VIPControl from "./pages/VIPControl";
import Settings from "./pages/Settings";

const Navigation = () => {
  const location = useLocation();
  
  const navItems = [
    { path: "/", label: "Situation Room", icon: LayoutDashboard },
    { path: "/analytics", label: "Analytics", icon: BarChart3 },
    { path: "/vip", label: "VIP Corridor", icon: Crown },
    { path: "/settings", label: "Settings", icon: SettingsIcon },
  ];

  return (
    <nav className="bg-[#151210] border-b border-[#2d261e] px-4 md:px-8">
      <div className="flex items-center gap-2 overflow-x-auto py-2">
        <div className="flex items-center gap-2 pr-4 border-r border-[#2d261e] mr-2">
          <span className="h-2.5 w-2.5 rounded-full bg-[#D97706] animate-pulse"></span>
          <span className="font-fraunces font-bold text-stone-200 text-sm tracking-wide">Urban Pulse</span>
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-mono transition-all duration-200 whitespace-nowrap ${
                isActive
                  ? "bg-[#D97706]/15 text-amber-300 border border-[#D97706]/40 shadow-sm shadow-amber-950/30 font-semibold"
                  : "text-stone-400 hover:text-stone-200 hover:bg-[#1b1815] border border-transparent"
              }`}
            >
              <Icon size={15} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};

function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <Navigation />
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/vip" element={<VIPControl />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default App;
