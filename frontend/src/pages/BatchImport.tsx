import React, { useState, useEffect } from 'react';
import {
  UploadCloud,
  FileText,
  AlertCircle,
  CheckCircle2,
  Download,
  Clock,
  RefreshCw,
  Info,
} from 'lucide-react';
import { api } from '../services/api';
import { ImportBatch, PaginatedResult } from '../types';
import { TableSkeleton } from '../components/LoadingSkeleton';

export const BatchImport: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<ImportBatch | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [batches, setBatches] = useState<PaginatedResult<ImportBatch> | null>(null);
  const [loadingBatches, setLoadingBatches] = useState(true);

  useEffect(() => {
    fetchBatches();
  }, []);

  const fetchBatches = async () => {
    setLoadingBatches(true);
    try {
      const data = await api.getImportBatches(1);
      setBatches(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingBatches(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0];
      if (!selected.name.endsWith('.csv')) {
        setError('Only .csv files are supported.');
        setFile(null);
        return;
      }
      setFile(selected);
      setError(null);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    setUploading(true);
    setError(null);
    setUploadResult(null);

    try {
      const res = await api.uploadCsv(file);
      setUploadResult(res);
      setFile(null);
      fetchBatches();
    } catch (err: any) {
      setError(err.message || 'Batch upload failed.');
    } finally {
      setUploading(false);
    }
  };

  const handleDownloadTemplate = () => {
    const csvContent =
      'step,type,amount,nameOrig,oldbalanceOrg,newbalanceOrig,nameDest,oldbalanceDest,newbalanceDest\n' +
      '1,PAYMENT,150.00,C123456789,500.00,350.00,M987654321,1200.00,1350.00\n' +
      '2,TRANSFER,195000.00,C234567890,195000.00,0.00,C876543210,0.00,195000.00\n';

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'tracex_transaction_template.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-800/80">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            <UploadCloud className="w-5 h-5 text-brand-cyan" />
            <span>CSV Batch Transaction Ingestion</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Bulk ingest historical financial records, run batch ML scoring, and detect high-risk clusters.
          </p>
        </div>
        <button
          onClick={handleDownloadTemplate}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-navy-900 hover:bg-navy-850 text-slate-200 border border-slate-800 rounded-xl text-xs font-medium transition-colors"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Download PaySim CSV Template</span>
        </button>
      </div>

      {/* Upload Box */}
      <div className="p-8 bg-navy-900/60 border border-slate-800/80 rounded-2xl">
        <form onSubmit={handleUpload} className="max-w-xl mx-auto text-center space-y-4">
          <label className="border-2 border-dashed border-slate-800 hover:border-cyan-500/50 rounded-2xl p-8 flex flex-col items-center justify-center cursor-pointer transition-colors bg-navy-950/40">
            <UploadCloud className="w-12 h-12 text-brand-cyan/80 mb-3" />
            <span className="text-sm font-semibold text-slate-200">
              {file ? file.name : 'Select or Drop CSV File Here'}
            </span>
            <span className="text-xs text-slate-400 mt-1">
              Supports standard PaySim schema &bull; Max 25MB per batch
            </span>
            <input
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="hidden"
            />
          </label>

          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-xs flex items-center gap-2 text-left">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {uploadResult && (
            <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400 text-xs text-left space-y-1">
              <div className="flex items-center gap-2 font-bold text-sm">
                <CheckCircle2 className="w-4 h-4" />
                <span>Batch Processed Successfully</span>
              </div>
              <div>
                Total Records: <span className="font-mono">{uploadResult.total_records}</span> &bull; Successfully Scored: <span className="font-mono">{uploadResult.successful_records}</span> &bull; Failed: <span className="font-mono">{uploadResult.failed_records}</span>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={!file || uploading}
            className="w-full py-3 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-xs rounded-xl shadow-glow-cyan transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {uploading ? (
              <>
                <span className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                <span>Running Batch Inference Pipeline...</span>
              </>
            ) : (
              <>
                <UploadCloud className="w-4 h-4" />
                <span>Upload & Score Transactions</span>
              </>
            )}
          </button>
        </form>
      </div>

      {/* Batch History Table */}
      <div className="bg-navy-900/60 border border-slate-800/80 rounded-2xl overflow-hidden shadow-subtle p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm font-semibold text-slate-200">Historical Ingestion Batches</h2>
            <p className="text-xs text-slate-400">Audit log of submitted bulk files and scoring yields</p>
          </div>
          <button
            onClick={fetchBatches}
            className="p-1.5 rounded-lg bg-navy-950 border border-slate-800 text-slate-400 hover:text-white transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {loadingBatches ? (
          <TableSkeleton rows={4} cols={6} />
        ) : !batches || batches.items.length === 0 ? (
          <p className="text-xs text-slate-400 text-center py-8 font-mono">
            No historical batches recorded yet.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-navy-950/80 border-b border-slate-800 text-slate-400 uppercase font-mono text-[11px]">
                  <th className="py-3 px-4">Filename</th>
                  <th className="py-3 px-4">Size</th>
                  <th className="py-3 px-4">Total Rows</th>
                  <th className="py-3 px-4">Successful</th>
                  <th className="py-3 px-4">Failed</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4 text-right">Error Report</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {batches.items.map((b) => (
                  <tr key={b.id} className="hover:bg-navy-850/50">
                    <td className="py-3 px-4 font-mono text-slate-200">{b.filename}</td>
                    <td className="py-3 px-4 text-slate-400 font-mono">
                      {(b.file_size_bytes / 1024).toFixed(1)} KB
                    </td>
                    <td className="py-3 px-4 font-mono font-semibold">{b.total_records}</td>
                    <td className="py-3 px-4 font-mono text-emerald-400">{b.successful_records}</td>
                    <td className="py-3 px-4 font-mono text-red-400">{b.failed_records}</td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-mono font-semibold ${
                          b.status === 'COMPLETED'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                            : b.status === 'PARTIALLY_COMPLETED'
                            ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                            : 'bg-red-500/10 text-red-400 border border-red-500/30'
                        }`}
                      >
                        {b.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-400 font-mono text-[11px]">
                      {new Date(b.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4 text-right">
                      {b.failed_records > 0 ? (
                        <a
                          href={`/api/v1/imports/batches/${b.id}/errors.csv`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-red-400 hover:underline"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>Errors CSV</span>
                        </a>
                      ) : (
                        <span className="text-slate-400 text-[11px]">Clean</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
