'use client';

import { Palette, Moon, Sun, Monitor, Type, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLocalStorageState } from '@/hooks/use-local-storage-state';
import toast from 'react-hot-toast';

const ACCENT_COLORS = [
  { name: 'Rose', value: '#E11D48', class: 'bg-rose-600' },
  { name: 'Blue', value: '#3B82F6', class: 'bg-blue-500' },
  { name: 'Emerald', value: '#10B981', class: 'bg-emerald-500' },
  { name: 'Amber', value: '#F59E0B', class: 'bg-amber-500' },
  { name: 'Purple', value: '#8B5CF6', class: 'bg-purple-500' },
  { name: 'Pink', value: '#EC4899', class: 'bg-pink-500' },
  { name: 'Cyan', value: '#06B6D4', class: 'bg-cyan-500' },
  { name: 'Orange', value: '#F97316', class: 'bg-orange-500' },
];

const FONT_OPTIONS = [
  { name: 'Inter', value: 'Inter', sample: 'The quick brown fox' },
  { name: 'Poppins', value: 'Poppins', sample: 'The quick brown fox' },
  { name: 'DM Sans', value: 'DM Sans', sample: 'The quick brown fox' },
  { name: 'Space Grotesk', value: 'Space Grotesk', sample: 'The quick brown fox' },
];

const DENSITY_OPTIONS = [
  { label: 'Comfortable', value: 'comfortable', description: 'More spacing, larger text' },
  { label: 'Default', value: 'default', description: 'Balanced layout' },
  { label: 'Compact', value: 'compact', description: 'Less spacing, more data' },
];

interface AppearancePrefs {
  theme: 'dark' | 'light' | 'system';
  accent: string;
  font: string;
  density: string;
  sidebarCollapsed: boolean;
}

const DEFAULTS: AppearancePrefs = {
  theme: 'dark',
  accent: '#E11D48',
  font: 'Inter',
  density: 'default',
  sidebarCollapsed: false,
};

export default function AppearancePage() {
  const [prefs, setPrefs] = useLocalStorageState<AppearancePrefs>(
    'seatsignals_settings_appearance',
    DEFAULTS
  );

  const setField = <K extends keyof AppearancePrefs>(k: K, v: AppearancePrefs[K]) =>
    setPrefs(p => ({ ...p, [k]: v }));

  const saveSettings = () => {
    toast.success('Appearance settings saved');
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-seat-red/10 flex items-center justify-center">
          <Palette className="w-5 h-5 text-seat-red" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">Appearance</h1>
          <p className="text-sm text-zinc-500">Customize the look and feel of your dashboard</p>
        </div>
      </div>

      {/* Theme */}
      <div className="bg-seat-card border border-seat-border rounded-xl p-5 space-y-4">
        <h3 className="text-sm font-semibold text-white">Theme</h3>
        <div className="grid grid-cols-3 gap-4">
          {([
            { value: 'dark' as const, label: 'Dark', icon: Moon, description: 'Easy on the eyes' },
            { value: 'light' as const, label: 'Light', icon: Sun, description: 'Classic bright theme' },
            { value: 'system' as const, label: 'System', icon: Monitor, description: 'Match device settings' },
          ]).map(t => (
            <button key={t.value} onClick={() => setField('theme', t.value)}
              className={cn(
                'flex flex-col items-center gap-3 p-5 rounded-xl border transition-all',
                prefs.theme === t.value
                  ? 'border-seat-red bg-seat-red/5 ring-1 ring-seat-red/20'
                  : 'border-seat-border bg-zinc-800/30 hover:border-zinc-600'
              )}>
              <t.icon size={24} className={prefs.theme === t.value ? 'text-seat-red' : 'text-zinc-400'} />
              <div>
                <p className="text-sm font-medium text-white">{t.label}</p>
                <p className="text-[10px] text-zinc-500">{t.description}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Accent */}
      <div className="bg-seat-card border border-seat-border rounded-xl p-5 space-y-4">
        <h3 className="text-sm font-semibold text-white">Accent Color</h3>
        <div className="flex gap-3">
          {ACCENT_COLORS.map(c => (
            <button key={c.value} onClick={() => setField('accent', c.value)}
              className={cn('w-10 h-10 rounded-full relative transition-transform', c.class,
                prefs.accent === c.value ? 'ring-2 ring-white ring-offset-2 ring-offset-seat-black scale-110' : 'hover:scale-105')}>
              {prefs.accent === c.value && <Check size={16} className="absolute inset-0 m-auto text-white" />}
            </button>
          ))}
        </div>
        <p className="text-xs text-zinc-500">Current: {ACCENT_COLORS.find(c => c.value === prefs.accent)?.name || 'Custom'}</p>
      </div>

      {/* Font */}
      <div className="bg-seat-card border border-seat-border rounded-xl p-5 space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <Type size={16} className="text-zinc-400" />
          <h3 className="text-sm font-semibold text-white">Font</h3>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {FONT_OPTIONS.map(f => (
            <button key={f.value} onClick={() => setField('font', f.value)}
              className={cn(
                'p-3 rounded-lg border text-left transition-all',
                prefs.font === f.value ? 'border-seat-red bg-seat-red/5' : 'border-seat-border hover:border-zinc-600'
              )}>
              <p className="text-sm font-medium text-white" style={{ fontFamily: f.value }}>{f.name}</p>
              <p className="text-xs text-zinc-400 mt-1" style={{ fontFamily: f.value }}>{f.sample}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Density */}
      <div className="bg-seat-card border border-seat-border rounded-xl p-5 space-y-4">
        <h3 className="text-sm font-semibold text-white">Display Density</h3>
        <div className="space-y-2">
          {DENSITY_OPTIONS.map(d => (
            <button key={d.value} onClick={() => setField('density', d.value)}
              className={cn(
                'w-full flex items-center justify-between p-3 rounded-lg border transition-all',
                prefs.density === d.value ? 'border-seat-red bg-seat-red/5' : 'border-seat-border hover:border-zinc-600'
              )}>
              <div>
                <p className="text-sm font-medium text-white">{d.label}</p>
                <p className="text-[10px] text-zinc-500">{d.description}</p>
              </div>
              {prefs.density === d.value && <Check size={16} className="text-seat-red" />}
            </button>
          ))}
        </div>
      </div>

      {/* Sidebar */}
      <div className="bg-seat-card border border-seat-border rounded-xl p-5 space-y-4">
        <h3 className="text-sm font-semibold text-white">Sidebar</h3>
        <label className="flex items-center justify-between cursor-pointer">
          <div>
            <p className="text-sm text-white">Collapsed by Default</p>
            <p className="text-[10px] text-zinc-500">Show only icons in the sidebar</p>
          </div>
          <button onClick={() => setField('sidebarCollapsed', !prefs.sidebarCollapsed)}
            className={cn('w-11 h-6 rounded-full transition-colors relative',
              prefs.sidebarCollapsed ? 'bg-seat-red' : 'bg-zinc-700')}>
            <div className={cn('w-4 h-4 bg-white rounded-full absolute top-1 transition-all',
              prefs.sidebarCollapsed ? 'left-6' : 'left-1')} />
          </button>
        </label>
      </div>

      <button onClick={saveSettings}
        className="px-6 py-3 bg-seat-red text-white rounded-lg text-sm font-medium hover:bg-seat-red/90 transition-colors">
        Save Changes
      </button>
    </div>
  );
}
