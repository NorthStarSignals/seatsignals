'use client';

import { Paintbrush, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLocalStorageState } from '@/hooks/use-local-storage-state';
import toast from 'react-hot-toast';

const COLOR_PRESETS = [
  { name: 'Rose (Default)', primary: '#E11D48', bg: '#09090B' },
  { name: 'Ocean Blue', primary: '#3B82F6', bg: '#0A0F1A' },
  { name: 'Forest Green', primary: '#10B981', bg: '#09110D' },
  { name: 'Royal Purple', primary: '#8B5CF6', bg: '#0D0A14' },
  { name: 'Sunset Orange', primary: '#F97316', bg: '#110B08' },
  { name: 'Crimson', primary: '#DC2626', bg: '#110808' },
];

interface BrandingPrefs {
  brandName: string;
  tagline: string;
  selectedPreset: number;
  customPrimary: string;
  logoUrl: string;
  faviconUrl: string;
  hideWatermark: boolean;
  customDomain: string;
}

const DEFAULT_PREFS: BrandingPrefs = {
  brandName: 'SeatSignals',
  tagline: 'Restaurant Revenue OS',
  selectedPreset: 0,
  customPrimary: '#E11D48',
  logoUrl: '',
  faviconUrl: '',
  hideWatermark: false,
  customDomain: '',
};

export default function BrandingPage() {
  const [prefs, setPrefs] = useLocalStorageState<BrandingPrefs>(
    'seatsignals_settings_branding',
    DEFAULT_PREFS
  );

  const setField = <K extends keyof BrandingPrefs>(k: K, v: BrandingPrefs[K]) =>
    setPrefs(p => ({ ...p, [k]: v }));

  const saveSettings = () => {
    toast.success('Branding settings saved');
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-seat-red/10 flex items-center justify-center">
          <Paintbrush className="w-5 h-5 text-seat-red" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">White-Label Branding</h1>
          <p className="text-sm text-zinc-500">Customize the platform with your restaurant&apos;s brand</p>
        </div>
      </div>

      {/* Brand Identity */}
      <div className="bg-seat-card border border-seat-border rounded-xl p-5 space-y-4">
        <h3 className="text-sm font-semibold text-white">Brand Identity</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-zinc-400 mb-1 block">Brand Name</label>
            <input value={prefs.brandName} onChange={e => setField('brandName', e.target.value)}
              className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-white focus:outline-none focus:border-seat-red" />
          </div>
          <div>
            <label className="text-xs text-zinc-400 mb-1 block">Tagline</label>
            <input value={prefs.tagline} onChange={e => setField('tagline', e.target.value)}
              className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-white focus:outline-none focus:border-seat-red" />
          </div>
          <div>
            <label className="text-xs text-zinc-400 mb-1 block">Logo URL</label>
            <input value={prefs.logoUrl} onChange={e => setField('logoUrl', e.target.value)} placeholder="https://..."
              className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-seat-red" />
          </div>
          <div>
            <label className="text-xs text-zinc-400 mb-1 block">Favicon URL</label>
            <input value={prefs.faviconUrl} onChange={e => setField('faviconUrl', e.target.value)} placeholder="https://..."
              className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-seat-red" />
          </div>
        </div>
      </div>

      {/* Color Preset */}
      <div className="bg-seat-card border border-seat-border rounded-xl p-5 space-y-4">
        <h3 className="text-sm font-semibold text-white">Color Theme</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {COLOR_PRESETS.map((preset, i) => (
            <button
              key={i}
              onClick={() => setPrefs(p => ({ ...p, selectedPreset: i, customPrimary: preset.primary }))}
              className={cn(
                'p-4 rounded-xl border transition-all text-left',
                prefs.selectedPreset === i ? 'border-white ring-1 ring-white/20' : 'border-seat-border hover:border-zinc-600'
              )}
            >
              <div className="flex items-center gap-2 mb-2">
                <div className="w-6 h-6 rounded-full" style={{ backgroundColor: preset.primary }} />
                <div className="w-6 h-6 rounded-full border border-zinc-700" style={{ backgroundColor: preset.bg }} />
                {prefs.selectedPreset === i && <Check size={14} className="text-white ml-auto" />}
              </div>
              <p className="text-xs text-white">{preset.name}</p>
            </button>
          ))}
        </div>
        <div>
          <label className="text-xs text-zinc-400 mb-1 block">Custom Primary Color</label>
          <div className="flex items-center gap-3">
            <input type="color" value={prefs.customPrimary} onChange={e => setField('customPrimary', e.target.value)}
              className="w-10 h-10 rounded-lg border border-zinc-700 bg-transparent cursor-pointer" />
            <input value={prefs.customPrimary} onChange={e => setField('customPrimary', e.target.value)}
              className="px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-white font-mono focus:outline-none focus:border-seat-red w-32" />
          </div>
        </div>
      </div>

      {/* Preview */}
      <div className="bg-seat-card border border-seat-border rounded-xl p-5 space-y-4">
        <h3 className="text-sm font-semibold text-white">Preview</h3>
        <div className="bg-seat-black rounded-lg p-6 border border-zinc-800">
          <div className="flex items-center gap-3 mb-4">
            {prefs.logoUrl ? (
              <div className="w-8 h-8 rounded bg-zinc-800" />
            ) : (
              <div className="w-8 h-8 rounded flex items-center justify-center text-white text-xs font-bold" style={{ backgroundColor: prefs.customPrimary }}>
                {prefs.brandName.charAt(0) || 'S'}
              </div>
            )}
            <div>
              <h4 className="text-sm font-bold text-white">{prefs.brandName}</h4>
              <p className="text-[10px] text-zinc-500">{prefs.tagline}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <div className="px-3 py-1.5 rounded-lg text-xs text-white font-medium" style={{ backgroundColor: prefs.customPrimary }}>Primary Button</div>
            <div className="px-3 py-1.5 rounded-lg text-xs border bg-transparent" style={{ borderColor: prefs.customPrimary, color: prefs.customPrimary }}>Secondary</div>
          </div>
        </div>
      </div>

      {/* Custom Domain */}
      <div className="bg-seat-card border border-seat-border rounded-xl p-5 space-y-4">
        <h3 className="text-sm font-semibold text-white">Custom Domain</h3>
        <div>
          <label className="text-xs text-zinc-400 mb-1 block">Custom Domain (Pro plan required)</label>
          <input value={prefs.customDomain} onChange={e => setField('customDomain', e.target.value)} placeholder="app.yourrestaurant.com"
            className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-seat-red" />
        </div>
        <label className="flex items-center justify-between cursor-pointer">
          <div>
            <p className="text-sm text-white">Remove &quot;Powered by SeatSignals&quot; watermark</p>
            <p className="text-[10px] text-zinc-500">Pro plan required</p>
          </div>
          <button onClick={() => setField('hideWatermark', !prefs.hideWatermark)}
            className={cn('w-11 h-6 rounded-full transition-colors relative',
              prefs.hideWatermark ? 'bg-seat-red' : 'bg-zinc-700')}>
            <div className={cn('w-4 h-4 bg-white rounded-full absolute top-1 transition-all',
              prefs.hideWatermark ? 'left-6' : 'left-1')} />
          </button>
        </label>
      </div>

      <button onClick={saveSettings}
        className="px-6 py-3 bg-seat-red text-white rounded-lg text-sm font-medium hover:bg-seat-red/90 transition-colors">
        Save Branding
      </button>
    </div>
  );
}
