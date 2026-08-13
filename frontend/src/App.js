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
    { path: "/", label: "Dashboard", icon: LayoutDashboard },
    { path: "/analytics", label: "Analytics", icon: BarChart3 },
    { path: "/vip", label: "VIP Control", icon: Crown },
    { path: "/settings", label: "Settings", icon: SettingsIcon },
  ];

  return (
    <nav className="bg-[#1F2833] border-b border-slate-800 px-4 md:px-8">
      <div className="flex items-center gap-1 overflow-x-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-2 px-4 py-3 rounded-lg transition-all duration-200 whitespace-nowrap ${
                isActive
                  ? "bg-[#66FCF1]/10 text-[#66FCF1] border border-[#66FCF1]/30"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
              }`}
            >
              <Icon size={18} />
              <span className="font-medium">{item.label}</span>
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
