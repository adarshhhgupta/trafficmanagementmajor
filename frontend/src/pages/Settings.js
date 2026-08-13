import { useState } from 'react';
import { Settings as SettingsIcon, Database, Bell, Sliders, Monitor, Save, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

const Settings = () => {
  const [settings, setSettings] = useState({
    autoRefresh: true,
    refreshInterval: 1000,
    soundAlerts: true,
    ambulancePriority: true,
    maxGreenDuration: 40,
    minGreenDuration: 10,
    densityThreshold: 50,
    enableAnalytics: true,
    darkMode: true
  });

  const [saving, setSaving] = useState(false);

  const handleSave = () => {
    setSaving(true);
    // Simulate saving to backend
    setTimeout(() => {
      localStorage.setItem('trafficSettings', JSON.stringify(settings));
      setSaving(false);
      toast.success('Settings saved successfully');
    }, 1000);
  };

  const handleReset = () => {
    const defaultSettings = {
      autoRefresh: true,
      refreshInterval: 1000,
      soundAlerts: true,
      ambulancePriority: true,
      maxGreenDuration: 40,
      minGreenDuration: 10,
      densityThreshold: 50,
      enableAnalytics: true,
      darkMode: true
    };
    setSettings(defaultSettings);
    toast.success('Settings reset to defaults');
  };

  return (
    <div className="min-h-screen bg-[#0B0C10] text-[#C5C6C7] p-4 md:p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-3 bg-[#66FCF1]/10 rounded-lg">
            <SettingsIcon className="text-[#66FCF1]" size={32} />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-[#66FCF1]" style={{ fontFamily: 'Manrope, sans-serif' }}>
              System Settings
            </h1>
            <p className="text-slate-400" style={{ fontFamily: 'Inter, sans-serif' }}>
              Configure traffic management system preferences
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* General Settings */}
        <div className="bg-[#1F2833] border border-slate-700 rounded-xl p-6">
          <h2 className="text-lg font-bold text-[#66FCF1] mb-4 flex items-center gap-2" style={{ fontFamily: 'Manrope, sans-serif' }}>
            <Sliders size={20} />
            General Settings
          </h2>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium text-white">Auto Refresh</div>
                <div className="text-sm text-slate-400">Automatically refresh traffic data</div>
              </div>
              <button
                onClick={() => setSettings({ ...settings, autoRefresh: !settings.autoRefresh })}
                className={`w-12 h-6 rounded-full transition-colors ${
                  settings.autoRefresh ? 'bg-[#66FCF1]' : 'bg-slate-700'
                }`}
              >
                <div className={`w-5 h-5 rounded-full bg-white transition-transform ${
                  settings.autoRefresh ? 'translate-x-6' : 'translate-x-0.5'
                }`} />
              </button>
            </div>

            <div>
              <div className="font-medium text-white mb-2">Refresh Interval</div>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min="500"
                  max="5000"
                  step="500"
                  value={settings.refreshInterval}
                  onChange={(e) => setSettings({ ...settings, refreshInterval: parseInt(e.target.value) })}
                  className="flex-1"
                />
                <span className="text-sm text-slate-400 w-20">{settings.refreshInterval}ms</span>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium text-white">Dark Mode</div>
                <div className="text-sm text-slate-400">Use dark theme</div>
              </div>
              <button
                onClick={() => setSettings({ ...settings, darkMode: !settings.darkMode })}
                className={`w-12 h-6 rounded-full transition-colors ${
                  settings.darkMode ? 'bg-[#66FCF1]' : 'bg-slate-700'
                }`}
              >
                <div className={`w-5 h-5 rounded-full bg-white transition-transform ${
                  settings.darkMode ? 'translate-x-6' : 'translate-x-0.5'
                }`} />
              </button>
            </div>
          </div>
        </div>

        {/* Traffic Control Settings */}
        <div className="bg-[#1F2833] border border-slate-700 rounded-xl p-6">
          <h2 className="text-lg font-bold text-[#66FCF1] mb-4 flex items-center gap-2" style={{ fontFamily: 'Manrope, sans-serif' }}>
            <Monitor size={20} />
            Traffic Control
          </h2>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium text-white">Ambulance Priority</div>
                <div className="text-sm text-slate-400">Give priority to ambulances</div>
              </div>
              <button
                onClick={() => setSettings({ ...settings, ambulancePriority: !settings.ambulancePriority })}
                className={`w-12 h-6 rounded-full transition-colors ${
                  settings.ambulancePriority ? 'bg-[#66FCF1]' : 'bg-slate-700'
                }`}
              >
                <div className={`w-5 h-5 rounded-full bg-white transition-transform ${
                  settings.ambulancePriority ? 'translate-x-6' : 'translate-x-0.5'
                }`} />
              </button>
            </div>

            <div>
              <div className="font-medium text-white mb-2">Max Green Duration</div>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min="20"
                  max="120"
                  step="10"
                  value={settings.maxGreenDuration}
                  onChange={(e) => setSettings({ ...settings, maxGreenDuration: parseInt(e.target.value) })}
                  className="flex-1"
                />
                <span className="text-sm text-slate-400 w-20">{settings.maxGreenDuration}s</span>
              </div>
            </div>

            <div>
              <div className="font-medium text-white mb-2">Min Green Duration</div>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min="5"
                  max="30"
                  step="5"
                  value={settings.minGreenDuration}
                  onChange={(e) => setSettings({ ...settings, minGreenDuration: parseInt(e.target.value) })}
                  className="flex-1"
                />
                <span className="text-sm text-slate-400 w-20">{settings.minGreenDuration}s</span>
              </div>
            </div>

            <div>
              <div className="font-medium text-white mb-2">Density Threshold</div>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min="20"
                  max="100"
                  step="10"
                  value={settings.densityThreshold}
                  onChange={(e) => setSettings({ ...settings, densityThreshold: parseInt(e.target.value) })}
                  className="flex-1"
                />
                <span className="text-sm text-slate-400 w-20">{settings.densityThreshold}%</span>
              </div>
            </div>
          </div>
        </div>

        {/* Notifications */}
        <div className="bg-[#1F2833] border border-slate-700 rounded-xl p-6">
          <h2 className="text-lg font-bold text-[#66FCF1] mb-4 flex items-center gap-2" style={{ fontFamily: 'Manrope, sans-serif' }}>
            <Bell size={20} />
            Notifications
          </h2>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium text-white">Sound Alerts</div>
                <div className="text-sm text-slate-400">Play sound for alerts</div>
              </div>
              <button
                onClick={() => setSettings({ ...settings, soundAlerts: !settings.soundAlerts })}
                className={`w-12 h-6 rounded-full transition-colors ${
                  settings.soundAlerts ? 'bg-[#66FCF1]' : 'bg-slate-700'
                }`}
              >
                <div className={`w-5 h-5 rounded-full bg-white transition-transform ${
                  settings.soundAlerts ? 'translate-x-6' : 'translate-x-0.5'
                }`} />
              </button>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium text-white">Enable Analytics</div>
                <div className="text-sm text-slate-400">Collect analytics data</div>
              </div>
              <button
                onClick={() => setSettings({ ...settings, enableAnalytics: !settings.enableAnalytics })}
                className={`w-12 h-6 rounded-full transition-colors ${
                  settings.enableAnalytics ? 'bg-[#66FCF1]' : 'bg-slate-700'
                }`}
              >
                <div className={`w-5 h-5 rounded-full bg-white transition-transform ${
                  settings.enableAnalytics ? 'translate-x-6' : 'translate-x-0.5'
                }`} />
              </button>
            </div>
          </div>
        </div>

        {/* Database Info */}
        <div className="bg-[#1F2833] border border-slate-700 rounded-xl p-6">
          <h2 className="text-lg font-bold text-[#66FCF1] mb-4 flex items-center gap-2" style={{ fontFamily: 'Manrope, sans-serif' }}>
            <Database size={20} />
            System Information
          </h2>
          
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-400">Backend URL</span>
              <span className="text-white">{process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Database</span>
              <span className="text-white">MongoDB</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">AI Model</span>
              <span className="text-white">YOLOv8n</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Version</span>
              <span className="text-white">1.0.0</span>
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="mt-8 flex gap-4">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex-1 flex items-center justify-center gap-2 py-3 bg-[#66FCF1]/20 border-2 border-[#66FCF1] text-[#66FCF1] rounded-xl font-bold hover:bg-[#66FCF1]/30 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Save size={20} />
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
        <button
          onClick={handleReset}
          className="flex items-center justify-center gap-2 px-6 py-3 bg-slate-700/50 border border-slate-600 text-slate-300 rounded-xl font-bold hover:bg-slate-700 transition-all duration-200"
        >
          <RefreshCw size={20} />
          Reset to Defaults
        </button>
      </div>
    </div>
  );
};

export default Settings;
