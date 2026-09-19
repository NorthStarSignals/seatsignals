'use client';

import { useState, useCallback, useRef } from 'react';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';
import {
  Upload, FileSpreadsheet, Database, ArrowRight, ArrowLeft,
  Check, AlertCircle, Download, Key, X, Loader2,
  Coffee, CreditCard, Store, Monitor, Utensils,
  Tablet, ChefHat, FileText,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────

interface POSSource {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
}

interface FieldMapping {
  detected: string;
  seatSignalsField: string;
}

interface ImportError {
  row: number;
  field: string;
  message: string;
}

interface PreviewRow {
  visit_date: string;
  customer_name: string;
  email: string;
  total_amount: string;
  items: string;
  payment_method: string;
}

type Step = 1 | 2 | 3 | 4;

// ─── Constants ────────────────────────────────────────────────────────

const POS_SOURCES: POSSource[] = [
  { id: 'toast', name: 'Toast', description: 'Import from Toast POS exports', icon: <Coffee size={28} /> },
  { id: 'square', name: 'Square', description: 'Square POS transaction data', icon: <CreditCard size={28} /> },
  { id: 'clover', name: 'Clover', description: 'Clover merchant data sync', icon: <Store size={28} /> },
  { id: 'lightspeed', name: 'Lightspeed', description: 'Lightspeed Restaurant data', icon: <Monitor size={28} /> },
  { id: 'aloha', name: 'Aloha', description: 'NCR Aloha POS integration', icon: <Utensils size={28} /> },
  { id: 'revel', name: 'Revel', description: 'Revel Systems cloud POS', icon: <Tablet size={28} /> },
  { id: 'touchbistro', name: 'TouchBistro', description: 'TouchBistro restaurant POS', icon: <ChefHat size={28} /> },
  { id: 'csv', name: 'Other CSV', description: 'Upload any CSV, XLSX, or JSON', icon: <FileText size={28} /> },
];

const SEATSIGNALS_FIELDS = [
  { value: '', label: '-- Select field --' },
  { value: 'visit_date', label: 'visit_date' },
  { value: 'customer_name', label: 'customer_name' },
  { value: 'email', label: 'email' },
  { value: 'total_amount', label: 'total_amount' },
  { value: 'items', label: 'items' },
  { value: 'payment_method', label: 'payment_method' },
];

const DETECTED_FIELDS = ['Date', 'Customer Name', 'Email', 'Amount', 'Items', 'Payment Method'];

const AUTO_MAP: Record<string, string> = {
  'Date': 'visit_date',
  'Customer Name': 'customer_name',
  'Email': 'email',
  'Amount': 'total_amount',
  'Items': 'items',
  'Payment Method': 'payment_method',
};

const MOCK_PREVIEW: PreviewRow[] = [
  { visit_date: '2026-04-01', customer_name: 'Sarah Chen', email: 'sarah@email.com', total_amount: '$87.50', items: 'Ribeye, Caesar Salad', payment_method: 'Credit Card' },
  { visit_date: '2026-04-01', customer_name: 'Marcus Wright', email: 'marcus.w@gmail.com', total_amount: '$124.00', items: 'Lobster Tail, Wine', payment_method: 'Credit Card' },
  { visit_date: '2026-04-02', customer_name: 'Ava Patel', email: 'ava.patel@yahoo.com', total_amount: '$45.25', items: 'Pasta Primavera', payment_method: 'Debit Card' },
  { visit_date: '2026-04-02', customer_name: 'James Oliver', email: 'j.oliver@mail.com', total_amount: '$210.75', items: 'Chef Tasting Menu x2', payment_method: 'Amex' },
  { visit_date: '2026-04-03', customer_name: 'Nina Rodriguez', email: 'nina.r@outlook.com', total_amount: '$63.00', items: 'Salmon, Dessert', payment_method: 'Cash' },
];

const MOCK_ERRORS: ImportError[] = [
  { row: 47, field: 'email', message: 'Invalid email format: "not-an-email"' },
  { row: 112, field: 'total_amount', message: 'Non-numeric value: "N/A"' },
  { row: 203, field: 'visit_date', message: 'Unrecognized date format: "04/31/2026"' },
];

const STEPS = [
  { num: 1 as Step, label: 'Select Source' },
  { num: 2 as Step, label: 'Upload Data' },
  { num: 3 as Step, label: 'Map Fields' },
  { num: 4 as Step, label: 'Review & Import' },
];

// ─── Component ────────────────────────────────────────────────────────

export default function ImportWizardPage() {
  const [currentStep, setCurrentStep] = useState<Step>(1);
  const [selectedSource, setSelectedSource] = useState<string | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [apiKey, setApiKey] = useState('');
  const [useApiSync, setUseApiSync] = useState(false);
  const [fieldMappings, setFieldMappings] = useState<FieldMapping[]>(
    DETECTED_FIELDS.map(f => ({ detected: f, seatSignalsField: AUTO_MAP[f] ?? '' }))
  );
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importComplete, setImportComplete] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ─── Navigation ──────────────────────────────────────────────────

  const canProceed = (): boolean => {
    switch (currentStep) {
      case 1: return selectedSource !== null;
      case 2: return uploadedFileName !== null || (useApiSync && apiKey.length > 0);
      case 3: return fieldMappings.every(m => m.seatSignalsField !== '');
      case 4: return true;
      default: return false;
    }
  };

  const goNext = () => {
    if (currentStep < 4 && canProceed()) {
      setCurrentStep((currentStep + 1) as Step);
    }
  };

  const goBack = () => {
    if (currentStep > 1) {
      setCurrentStep((currentStep - 1) as Step);
    }
  };

  // ─── File Upload (mock) ──────────────────────────────────────────

  const handleFileDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) {
      setUploadedFileName(file.name);
      setUseApiSync(false);
    }
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadedFileName(file.name);
      setUseApiSync(false);
    }
  }, []);

  // ─── Field Mapping ───────────────────────────────────────────────

  const updateMapping = (index: number, value: string) => {
    setFieldMappings(prev => prev.map((m, i) => i === index ? { ...m, seatSignalsField: value } : m));
  };

  // ─── Import (mock) ───────────────────────────────────────────────

  const startImport = () => {
    setImporting(true);
    setImportProgress(0);
    const interval = setInterval(() => {
      setImportProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setImporting(false);
          setImportComplete(true);
          toast.success('Import complete');
          return 100;
        }
        return prev + 2;
      });
    }, 80);
  };

  // ─── Stepper ─────────────────────────────────────────────────────

  const renderStepper = () => (
    <div className="flex items-center justify-between mb-10">
      {STEPS.map((step, i) => (
        <div key={step.num} className="flex items-center flex-1 last:flex-none">
          <div className="flex items-center gap-3">
            <div
              className={cn(
                'w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold transition-colors',
                currentStep > step.num
                  ? 'bg-emerald-600 text-white'
                  : currentStep === step.num
                    ? 'bg-[#E11D48] text-white'
                    : 'bg-[#27272A] text-zinc-500'
              )}
            >
              {currentStep > step.num ? <Check size={18} /> : step.num}
            </div>
            <span
              className={cn(
                'text-sm font-medium whitespace-nowrap',
                currentStep >= step.num ? 'text-zinc-100' : 'text-zinc-500'
              )}
            >
              {step.label}
            </span>
          </div>
          {i < STEPS.length - 1 && (
            <div
              className={cn(
                'flex-1 h-px mx-4',
                currentStep > step.num ? 'bg-emerald-600' : 'bg-[#27272A]'
              )}
            />
          )}
        </div>
      ))}
    </div>
  );

  // ─── Step 1: Select Source ───────────────────────────────────────

  const renderStep1 = () => (
    <div>
      <h2 className="text-xl font-semibold text-zinc-100 mb-2">Select Your POS System</h2>
      <p className="text-sm text-zinc-400 mb-6">
        Choose the point-of-sale system you want to import data from.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {POS_SOURCES.map(source => (
          <button
            key={source.id}
            onClick={() => setSelectedSource(source.id)}
            className={cn(
              'flex flex-col items-center gap-3 p-6 rounded-xl border transition-all text-center',
              'hover:border-[#E11D48]/50 hover:bg-[#E11D48]/5',
              selectedSource === source.id
                ? 'border-[#E11D48] bg-[#E11D48]/10'
                : 'border-[#27272A] bg-[#1C1C21]'
            )}
          >
            <div
              className={cn(
                'w-14 h-14 rounded-xl flex items-center justify-center',
                selectedSource === source.id
                  ? 'bg-[#E11D48]/20 text-[#E11D48]'
                  : 'bg-[#27272A] text-zinc-400'
              )}
            >
              {source.icon}
            </div>
            <div>
              <p className="font-semibold text-zinc-100">{source.name}</p>
              <p className="text-xs text-zinc-500 mt-1">{source.description}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );

  // ─── Step 2: Upload Data ─────────────────────────────────────────

  const renderStep2 = () => {
    const sourceName = POS_SOURCES.find(s => s.id === selectedSource)?.name ?? 'POS';

    return (
      <div>
        <h2 className="text-xl font-semibold text-zinc-100 mb-2">Upload {sourceName} Data</h2>
        <p className="text-sm text-zinc-400 mb-6">
          Upload a file export or connect directly with an API key.
        </p>

        {/* Tab toggle */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setUseApiSync(false)}
            className={cn(
              'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
              !useApiSync ? 'bg-[#E11D48] text-white' : 'bg-[#27272A] text-zinc-400 hover:text-zinc-200'
            )}
          >
            <Upload size={14} className="inline mr-2" />
            File Upload
          </button>
          <button
            onClick={() => setUseApiSync(true)}
            className={cn(
              'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
              useApiSync ? 'bg-[#E11D48] text-white' : 'bg-[#27272A] text-zinc-400 hover:text-zinc-200'
            )}
          >
            <Key size={14} className="inline mr-2" />
            API Sync
          </button>
        </div>

        {!useApiSync ? (
          <div>
            {/* Drop zone */}
            <div
              onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleFileDrop}
              onClick={() => fileInputRef.current?.click()}
              className={cn(
                'border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-all',
                isDragging
                  ? 'border-[#E11D48] bg-[#E11D48]/5'
                  : uploadedFileName
                    ? 'border-emerald-600 bg-emerald-600/5'
                    : 'border-[#27272A] bg-[#1C1C21] hover:border-zinc-600'
              )}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.xlsx,.json"
                onChange={handleFileSelect}
                className="hidden"
              />
              {uploadedFileName ? (
                <div className="flex flex-col items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-emerald-600/20 flex items-center justify-center">
                    <Check size={24} className="text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-zinc-100 font-medium">{uploadedFileName}</p>
                    <p className="text-xs text-zinc-500 mt-1">File ready for import</p>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); setUploadedFileName(null); }}
                    className="text-xs text-zinc-500 hover:text-zinc-300 flex items-center gap-1 mt-1"
                  >
                    <X size={12} /> Remove file
                  </button>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-[#27272A] flex items-center justify-center">
                    <Upload size={24} className="text-zinc-400" />
                  </div>
                  <div>
                    <p className="text-zinc-200">
                      <span className="text-[#E11D48] font-medium">Click to upload</span> or drag and drop
                    </p>
                    <p className="text-xs text-zinc-500 mt-1">Supported formats: CSV, XLSX, JSON</p>
                  </div>
                </div>
              )}
            </div>

            {/* Sample data download */}
            <div className="mt-4 flex items-center gap-2 text-sm">
              <Download size={14} className="text-zinc-500" />
              <button className="text-[#E11D48] hover:text-[#E11D48]/80 underline underline-offset-2 transition-colors">
                Download sample {sourceName} template
              </button>
              <span className="text-zinc-600">to see expected format</span>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-[#1C1C21] border border-[#27272A] rounded-xl p-6">
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                {sourceName} API Key
              </label>
              <div className="flex gap-3">
                <input
                  type="password"
                  value={apiKey}
                  onChange={e => setApiKey(e.target.value)}
                  placeholder={`Enter your ${sourceName} API key...`}
                  className="flex-1 px-4 py-2.5 bg-[#09090B] border border-[#27272A] rounded-lg text-zinc-100 text-sm placeholder:text-zinc-600 focus:outline-none focus:border-[#E11D48] transition-colors"
                />
                <button
                  className={cn(
                    'px-5 py-2.5 rounded-lg text-sm font-medium transition-colors',
                    apiKey.length > 0
                      ? 'bg-[#E11D48] text-white hover:bg-[#E11D48]/90'
                      : 'bg-[#27272A] text-zinc-600 cursor-not-allowed'
                  )}
                  disabled={apiKey.length === 0}
                >
                  Connect
                </button>
              </div>
              <p className="text-xs text-zinc-500 mt-3">
                Find your API key in {sourceName} &rarr; Settings &rarr; Integrations &rarr; API Keys
              </p>
            </div>
          </div>
        )}
      </div>
    );
  };

  // ─── Step 3: Map Fields ──────────────────────────────────────────

  const renderStep3 = () => {
    const allMapped = fieldMappings.every(m => m.seatSignalsField !== '');

    return (
      <div>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-xl font-semibold text-zinc-100">Map Fields</h2>
          {allMapped && (
            <span className="flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-400/10 px-3 py-1 rounded-full">
              <Check size={12} /> All fields mapped
            </span>
          )}
        </div>
        <p className="text-sm text-zinc-400 mb-6">
          We auto-detected your columns. Verify each mapping or adjust as needed.
        </p>

        <div className="bg-[#1C1C21] border border-[#27272A] rounded-xl overflow-hidden">
          {/* Table header */}
          <div className="grid grid-cols-[1fr_auto_1fr] gap-4 px-6 py-3 bg-[#09090B] border-b border-[#27272A]">
            <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Detected Column</span>
            <span className="w-8" />
            <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">SeatSignals Field</span>
          </div>

          {/* Table rows */}
          {fieldMappings.map((mapping, i) => (
            <div
              key={mapping.detected}
              className={cn(
                'grid grid-cols-[1fr_auto_1fr] gap-4 px-6 py-4 items-center',
                i < fieldMappings.length - 1 && 'border-b border-[#27272A]'
              )}
            >
              <div className="flex items-center gap-3">
                <FileSpreadsheet size={16} className="text-zinc-500" />
                <span className="text-sm text-zinc-200 font-mono">{mapping.detected}</span>
              </div>
              <ArrowRight size={16} className="text-zinc-600" />
              <select
                value={mapping.seatSignalsField}
                onChange={e => updateMapping(i, e.target.value)}
                className={cn(
                  'w-full px-3 py-2 rounded-lg text-sm font-mono',
                  'bg-[#09090B] border border-[#27272A] focus:outline-none focus:border-[#E11D48] transition-colors',
                  mapping.seatSignalsField ? 'text-zinc-100' : 'text-zinc-600'
                )}
              >
                {SEATSIGNALS_FIELDS.map(f => (
                  <option key={f.value} value={f.value}>{f.label}</option>
                ))}
              </select>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // ─── Step 4: Review & Import ─────────────────────────────────────

  const renderStep4 = () => {
    const totalRecords = 1247;
    const matchedRecords = 1244;
    const errorCount = MOCK_ERRORS.length;

    return (
      <div>
        <h2 className="text-xl font-semibold text-zinc-100 mb-2">Review & Import</h2>
        <p className="text-sm text-zinc-400 mb-6">
          Verify the summary below before starting the import.
        </p>

        {/* Summary cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="bg-[#1C1C21] border border-[#27272A] rounded-xl p-5">
            <div className="flex items-center gap-3 mb-2">
              <Database size={18} className="text-blue-400" />
              <span className="text-sm text-zinc-400">Records Found</span>
            </div>
            <p className="text-2xl font-bold text-zinc-100">{totalRecords.toLocaleString()}</p>
          </div>
          <div className="bg-[#1C1C21] border border-[#27272A] rounded-xl p-5">
            <div className="flex items-center gap-3 mb-2">
              <Check size={18} className="text-emerald-400" />
              <span className="text-sm text-zinc-400">Matched</span>
            </div>
            <p className="text-2xl font-bold text-emerald-400">{matchedRecords.toLocaleString()}</p>
          </div>
          <div className="bg-[#1C1C21] border border-[#27272A] rounded-xl p-5">
            <div className="flex items-center gap-3 mb-2">
              <AlertCircle size={18} className="text-amber-400" />
              <span className="text-sm text-zinc-400">Errors</span>
            </div>
            <p className="text-2xl font-bold text-amber-400">{errorCount}</p>
          </div>
        </div>

        {/* Errors list */}
        {MOCK_ERRORS.length > 0 && (
          <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-5 mb-6">
            <h3 className="text-sm font-semibold text-amber-400 mb-3 flex items-center gap-2">
              <AlertCircle size={14} />
              Errors to Review
            </h3>
            <div className="space-y-2">
              {MOCK_ERRORS.map((err, i) => (
                <div key={i} className="flex items-start gap-3 text-sm">
                  <span className="text-zinc-500 font-mono text-xs mt-0.5">Row {err.row}</span>
                  <span className="text-zinc-400">
                    <span className="text-zinc-300 font-mono">{err.field}</span> &mdash; {err.message}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Preview table */}
        <div className="bg-[#1C1C21] border border-[#27272A] rounded-xl overflow-hidden mb-6">
          <div className="px-5 py-3 border-b border-[#27272A]">
            <h3 className="text-sm font-semibold text-zinc-300">Preview (first 5 rows)</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[#09090B]">
                  {['Date', 'Name', 'Email', 'Amount', 'Items', 'Payment'].map(col => (
                    <th key={col} className="px-4 py-2.5 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wider whitespace-nowrap">
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {MOCK_PREVIEW.map((row, i) => (
                  <tr key={i} className={cn('border-t border-[#27272A]', i % 2 === 0 ? 'bg-[#1C1C21]' : 'bg-[#09090B]/50')}>
                    <td className="px-4 py-2.5 text-zinc-300 whitespace-nowrap">{row.visit_date}</td>
                    <td className="px-4 py-2.5 text-zinc-300 whitespace-nowrap">{row.customer_name}</td>
                    <td className="px-4 py-2.5 text-zinc-400 whitespace-nowrap">{row.email}</td>
                    <td className="px-4 py-2.5 text-zinc-300 whitespace-nowrap">{row.total_amount}</td>
                    <td className="px-4 py-2.5 text-zinc-400 whitespace-nowrap max-w-[200px] truncate">{row.items}</td>
                    <td className="px-4 py-2.5 text-zinc-400 whitespace-nowrap">{row.payment_method}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Import button + progress */}
        {!importComplete ? (
          <div>
            {importing ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-zinc-300 flex items-center gap-2">
                    <Loader2 size={14} className="animate-spin" />
                    Importing records...
                  </span>
                  <span className="text-zinc-400 font-mono">{importProgress}%</span>
                </div>
                <div className="w-full h-2 bg-[#27272A] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#E11D48] rounded-full transition-all duration-100 ease-linear"
                    style={{ width: `${importProgress}%` }}
                  />
                </div>
              </div>
            ) : (
              <button
                onClick={startImport}
                className="w-full py-3 bg-[#E11D48] hover:bg-[#E11D48]/90 text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                <Upload size={18} />
                Import {(1244).toLocaleString()} Records
              </button>
            )}
          </div>
        ) : (
          <div className="bg-emerald-600/10 border border-emerald-600/30 rounded-xl p-6 text-center">
            <div className="w-14 h-14 rounded-full bg-emerald-600/20 flex items-center justify-center mx-auto mb-3">
              <Check size={28} className="text-emerald-400" />
            </div>
            <h3 className="text-lg font-semibold text-emerald-400 mb-1">Import Complete</h3>
            <p className="text-sm text-zinc-400">
              Successfully imported 1,244 records. 3 rows were skipped due to errors.
            </p>
          </div>
        )}
      </div>
    );
  };

  // ─── Main Render ─────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[#09090B] p-6 lg:p-10">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-zinc-100">POS Data Import</h1>
          <p className="text-sm text-zinc-500 mt-1">Import your restaurant transaction data into SeatSignals</p>
        </div>

        {/* Stepper */}
        {renderStepper()}

        {/* Step Content */}
        <div className="bg-[#09090B] rounded-2xl">
          {currentStep === 1 && renderStep1()}
          {currentStep === 2 && renderStep2()}
          {currentStep === 3 && renderStep3()}
          {currentStep === 4 && renderStep4()}
        </div>

        {/* Navigation */}
        {!importComplete && (
          <div className="flex items-center justify-between mt-8 pt-6 border-t border-[#27272A]">
            <button
              onClick={goBack}
              disabled={currentStep === 1}
              className={cn(
                'flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-colors',
                currentStep === 1
                  ? 'text-zinc-700 cursor-not-allowed'
                  : 'text-zinc-300 hover:text-zinc-100 bg-[#1C1C21] hover:bg-[#27272A] border border-[#27272A]'
              )}
            >
              <ArrowLeft size={16} />
              Back
            </button>

            {currentStep < 4 ? (
              <button
                onClick={goNext}
                disabled={!canProceed()}
                className={cn(
                  'flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-colors',
                  canProceed()
                    ? 'bg-[#E11D48] text-white hover:bg-[#E11D48]/90'
                    : 'bg-[#27272A] text-zinc-600 cursor-not-allowed'
                )}
              >
                Continue
                <ArrowRight size={16} />
              </button>
            ) : (
              <div /> /* Spacer when on step 4 - import button is in the step content */
            )}
          </div>
        )}
      </div>
    </div>
  );
}
