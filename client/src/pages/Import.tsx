import React, { useState } from 'react';
import { api } from '../api/client';
import { ImportSummary } from '@gmaps/shared';
import {
  UploadCloud,
  FileSpreadsheet,
  CheckCircle,
  AlertTriangle,
  XCircle,
  ArrowRight,
  RefreshCw,
  Info,
} from 'lucide-react';

export const Import: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [previewRows, setPreviewRows] = useState<Record<string, string>[]>([]);
  const [totalFileRows, setTotalFileRows] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Column Mapping State
  const [mapping, setMapping] = useState({
    companyName: '',
    contactPerson: '',
    email: '',
    phone: '',
    industry: '',
    city: '',
    state: '',
    website: '',
    emailConsent: '',
    whatsAppConsent: '',
  });

  // Final Summary State
  const [summary, setSummary] = useState<ImportSummary | null>(null);

  const handleFileSelect = async (selectedFile: File) => {
    setFile(selectedFile);
    setError(null);
    setSummary(null);

    try {
      setLoading(true);
      const res = await api.previewImport(selectedFile);
      setHeaders(res.headers);
      setPreviewRows(res.previewRows);
      setTotalFileRows(res.totalRows);

      // Smart auto-mapping heuristic
      const newMap: Record<string, string> = { ...mapping };
      res.headers.forEach((h) => {
        const lower = h.toLowerCase();
        if (lower.includes('company') || lower.includes('organization') || lower.includes('business')) newMap.companyName = h;
        if (lower.includes('contact') || lower.includes('person') || lower.includes('name') && !newMap.companyName) newMap.contactPerson = h;
        if (lower.includes('email') || lower.includes('mail')) newMap.email = h;
        if (lower.includes('phone') || lower.includes('mobile') || lower.includes('contact no')) newMap.phone = h;
        if (lower.includes('city')) newMap.city = h;
        if (lower.includes('state')) newMap.state = h;
        if (lower.includes('industry') || lower.includes('type') || lower.includes('category')) newMap.industry = h;
        if (lower.includes('web') || lower.includes('site')) newMap.website = h;
        if (lower.includes('consent') || lower.includes('opt')) {
          newMap.emailConsent = h;
          newMap.whatsAppConsent = h;
        }
      });
      setMapping(newMap as typeof mapping);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  const handleExecuteImport = async () => {
    if (!file) return;
    if (!mapping.companyName) {
      alert('Company Name mapping is strictly required.');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const res = await api.executeImport(file, mapping);
      setSummary(res.summary);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* File Upload Zone */}
      <div className="glass-panel p-6 rounded-2xl space-y-4">
        <h2 className="text-base font-semibold text-white">Import Production Leads (.xlsx / .csv)</h2>
        <p className="text-xs text-slate-400">
          Upload spreadsheets containing up to 200+ leads/day. All rows undergo Indian DoT phone classification, duplicate detection, and branch-preservation checks.
        </p>

        <label className="border-2 border-dashed border-slate-700 hover:border-blue-500 rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer transition bg-slate-900/40 group">
          <UploadCloud className="text-slate-400 group-hover:text-blue-400 transition mb-3" size={36} />
          <span className="text-sm font-medium text-slate-200">
            {file ? file.name : 'Click to select or drag and drop Excel or CSV spreadsheet'}
          </span>
          <span className="text-xs text-slate-500 mt-1">Accepts .xlsx, .xls, and .csv files</span>
          <input
            type="file"
            accept=".xlsx, .xls, .csv"
            onChange={(e) => {
              if (e.target.files && e.target.files[0]) {
                handleFileSelect(e.target.files[0]);
              }
            }}
            className="hidden"
          />
        </label>
      </div>

      {loading && (
        <div className="p-8 flex items-center justify-center">
          <RefreshCw className="animate-spin text-blue-500" size={28} />
          <span className="ml-3 text-sm text-slate-300 font-medium">Processing spreadsheet...</span>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-sm flex items-center gap-2">
          <XCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {/* Column Mapping Section */}
      {headers.length > 0 && !summary && (
        <div className="glass-panel p-6 rounded-2xl space-y-6">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div>
              <h3 className="text-sm font-semibold text-white">Column Field Mapping</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Map columns from <strong>{file?.name}</strong> ({totalFileRows} rows detected)
              </p>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/20">
              <Info size={14} />
              <span>Company Name is required</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
            {/* Company Name */}
            <div className="space-y-1.5">
              <label className="font-semibold text-slate-200">Company Name *</label>
              <select
                value={mapping.companyName}
                onChange={(e) => setMapping({ ...mapping, companyName: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white"
              >
                <option value="">-- Select Column --</option>
                {headers.map((h) => (
                  <option key={h} value={h}>{h}</option>
                ))}
              </select>
            </div>

            {/* Contact Person */}
            <div className="space-y-1.5">
              <label className="font-semibold text-slate-200">Contact Person</label>
              <select
                value={mapping.contactPerson}
                onChange={(e) => setMapping({ ...mapping, contactPerson: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white"
              >
                <option value="">-- None / Optional --</option>
                {headers.map((h) => (
                  <option key={h} value={h}>{h}</option>
                ))}
              </select>
            </div>

            {/* Email */}
            <div className="space-y-1.5">
              <label className="font-semibold text-slate-200">Email Address</label>
              <select
                value={mapping.email}
                onChange={(e) => setMapping({ ...mapping, email: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white"
              >
                <option value="">-- None / Optional --</option>
                {headers.map((h) => (
                  <option key={h} value={h}>{h}</option>
                ))}
              </select>
            </div>

            {/* Phone */}
            <div className="space-y-1.5">
              <label className="font-semibold text-slate-200">Phone Number (DoT Normalizer)</label>
              <select
                value={mapping.phone}
                onChange={(e) => setMapping({ ...mapping, phone: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white"
              >
                <option value="">-- None / Optional --</option>
                {headers.map((h) => (
                  <option key={h} value={h}>{h}</option>
                ))}
              </select>
            </div>

            {/* Industry */}
            <div className="space-y-1.5">
              <label className="font-semibold text-slate-200">Industry / Manufacturing Type</label>
              <select
                value={mapping.industry}
                onChange={(e) => setMapping({ ...mapping, industry: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white"
              >
                <option value="">-- None / Optional --</option>
                {headers.map((h) => (
                  <option key={h} value={h}>{h}</option>
                ))}
              </select>
            </div>

            {/* City */}
            <div className="space-y-1.5">
              <label className="font-semibold text-slate-200">City</label>
              <select
                value={mapping.city}
                onChange={(e) => setMapping({ ...mapping, city: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white"
              >
                <option value="">-- None / Optional --</option>
                {headers.map((h) => (
                  <option key={h} value={h}>{h}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Preview rows */}
          <div className="space-y-2 pt-2">
            <h4 className="text-xs font-semibold text-slate-400">First 3 Rows Preview</h4>
            <div className="overflow-x-auto border border-slate-800 rounded-lg">
              <table className="w-full text-left text-[11px]">
                <thead className="bg-slate-900 text-slate-400 border-b border-slate-800">
                  <tr>
                    {headers.slice(0, 5).map((h) => (
                      <th key={h} className="p-2">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300">
                  {previewRows.slice(0, 3).map((r, idx) => (
                    <tr key={idx}>
                      {headers.slice(0, 5).map((h) => (
                        <td key={h} className="p-2 truncate max-w-[150px]">{r[h]}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex justify-end pt-3 border-t border-slate-800">
            <button
              onClick={handleExecuteImport}
              disabled={loading || !mapping.companyName}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold text-sm transition shadow-lg shadow-blue-600/30"
            >
              <CheckCircle size={16} />
              <span>Execute Validated Import</span>
            </button>
          </div>
        </div>
      )}

      {/* Import Execution Summary & Error Report */}
      {summary && (
        <div className="glass-panel p-6 rounded-2xl space-y-6 border border-emerald-500/30">
          <div className="flex items-center gap-2 text-emerald-400">
            <CheckCircle size={22} />
            <h3 className="text-base font-bold text-white">Import Execution Completed</h3>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
              <span className="text-[11px] text-slate-400">Total Rows</span>
              <div className="text-xl font-bold text-white mt-0.5">{summary.totalRows}</div>
            </div>
            <div className="p-3 rounded-xl bg-slate-900 border border-emerald-500/30">
              <span className="text-[11px] text-emerald-400">Valid Leads Saved</span>
              <div className="text-xl font-bold text-emerald-400 mt-0.5">{summary.validRows}</div>
            </div>
            <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
              <span className="text-[11px] text-slate-400">Duplicates Filtered</span>
              <div className="text-xl font-bold text-slate-300 mt-0.5">{summary.duplicateRows}</div>
            </div>
            <div className="p-3 rounded-xl bg-slate-900 border border-rose-500/30">
              <span className="text-[11px] text-rose-400">Invalid Records</span>
              <div className="text-xl font-bold text-rose-400 mt-0.5">{summary.invalidRows}</div>
            </div>
          </div>

          {/* Error Table if any */}
          {summary.errors.length > 0 && (
            <div className="space-y-3 pt-3 border-t border-slate-800">
              <h4 className="text-xs font-semibold text-rose-400 uppercase tracking-wider flex items-center gap-1.5">
                <AlertTriangle size={14} /> Validation Problems Report
              </h4>
              <div className="max-h-48 overflow-y-auto border border-rose-500/20 rounded-lg">
                <table className="w-full text-left text-xs">
                  <thead className="bg-rose-950/40 text-rose-300 border-b border-rose-500/20">
                    <tr>
                      <th className="p-2">Row</th>
                      <th className="p-2">Field</th>
                      <th className="p-2">Raw Value</th>
                      <th className="p-2">Reason</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-rose-500/10 text-slate-300">
                    {summary.errors.map((e, idx) => (
                      <tr key={idx}>
                        <td className="p-2 font-mono text-slate-400">{e.rowNumber}</td>
                        <td className="p-2 font-medium">{e.fieldName}</td>
                        <td className="p-2 font-mono text-slate-400">{e.rawValue || '—'}</td>
                        <td className="p-2 text-rose-400">{e.errorMessage}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="flex justify-end pt-2">
            <button
              onClick={() => {
                setFile(null);
                setHeaders([]);
                setSummary(null);
              }}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-white transition"
            >
              Import Another File
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
