import React, { useEffect, useState } from 'react';
import { api } from '../api/client';
import { ExportJob, ExportBatch } from '@gmaps/shared';
import {
  X,
  FileSpreadsheet,
  Send,
  CheckCircle2,
  AlertCircle,
  Clock,
  RotateCw,
  Download,
  Check,
  Ban,
  Radio,
  ExternalLink,
} from 'lucide-react';

interface ExportDeliveryModalProps {
  isOpen: boolean;
  onClose: () => void;
  exportId: string | null;
  onDownloadExcel?: () => void;
}

export const ExportDeliveryModal: React.FC<ExportDeliveryModalProps> = ({
  isOpen,
  onClose,
  exportId,
  onDownloadExcel,
}) => {
  const [job, setJob] = useState<ExportJob | null>(null);
  const [loading, setLoading] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Poll job status until completed, failed, or cancelled
  useEffect(() => {
    if (!isOpen || !exportId) {
      setJob(null);
      return;
    }

    let isMounted = true;
    let pollInterval: any = null;

    const fetchStatus = async () => {
      try {
        const res = await api.getWebhookTransferStatus(exportId);
        if (isMounted) {
          setJob(res.job);
          setError(null);

          // Stop polling if done
          if (['completed', 'failed', 'cancelled'].includes(res.job.status)) {
            if (pollInterval) clearInterval(pollInterval);
          }
        }
      } catch (err: unknown) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : String(err));
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    setLoading(true);
    fetchStatus();

    pollInterval = setInterval(fetchStatus, 1500);

    return () => {
      isMounted = false;
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [isOpen, exportId]);

  if (!isOpen) return null;

  const handleRetry = async () => {
    if (!exportId) return;
    try {
      setRetrying(true);
      setError(null);
      const res = await api.retryFailedBatches(exportId);
      setJob(res.job);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setRetrying(false);
    }
  };

  const handleCancel = async () => {
    if (!exportId) return;
    try {
      setCancelling(true);
      const res = await api.cancelWebhookTransfer(exportId);
      setJob(res.job);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setCancelling(false);
    }
  };

  const totalBatches = job?.totalBatches || 0;
  const successfulBatches = job?.successfulBatches || 0;
  const failedBatches = job?.failedBatches || 0;
  const totalRecords = job?.totalRecords || 0;
  const deliveredRecords = job?.deliveredRecords || 0;
  const remainingRecords = Math.max(0, totalRecords - deliveredRecords);
  const pendingBatches = Math.max(0, totalBatches - successfulBatches - failedBatches);

  const percentComplete = totalRecords > 0 ? Math.round((deliveredRecords / totalRecords) * 100) : 0;
  const isFinished = job && ['completed', 'failed', 'cancelled'].includes(job.status);
  const isAllSuccess = isFinished && failedBatches === 0 && successfulBatches === totalBatches;

  // Identify currently processing batch
  const currentBatch = job?.batches?.find((b) => b.status === 'in_progress' || b.status === 'retrying');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl max-w-3xl w-full p-6 space-y-5 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg ${
              isAllSuccess
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                : failedBatches > 0
                ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                : 'bg-blue-600/20 text-blue-400 border border-blue-500/40'
            }`}>
              {isAllSuccess ? <CheckCircle2 size={20} /> : <Send size={20} />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white">AI Agent Dashboard Transfer</h3>
                <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300">
                  {job?.id || exportId}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                100-company sequential batch delivery via multipart Excel webhook
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X size={18} />
          </button>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle size={15} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Status & Progress Bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 font-semibold">
              <span className={`w-2 h-2 rounded-full ${
                job?.status === 'in_progress' ? 'bg-blue-400 animate-ping' : isAllSuccess ? 'bg-emerald-400' : 'bg-amber-400'
              }`} />
              <span className="text-white capitalize">
                {job?.status === 'in_progress' ? 'Transferring Batches...' : job?.status}
              </span>
              {currentBatch && (
                <span className="text-slate-400 font-normal">
                  (Sending Batch {currentBatch.batchNumber} of {totalBatches})
                </span>
              )}
            </div>
            <div className="font-mono font-bold text-slate-300">
              {percentComplete}% Complete ({deliveredRecords.toLocaleString()} / {totalRecords.toLocaleString()} companies)
            </div>
          </div>

          {/* Progress track */}
          <div className="w-full h-2.5 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
            <div
              className={`h-full transition-all duration-500 ${
                isAllSuccess
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-400'
                  : failedBatches > 0
                  ? 'bg-gradient-to-r from-blue-500 via-amber-500 to-rose-500'
                  : 'bg-gradient-to-r from-blue-600 to-indigo-500'
              }`}
              style={{ width: `${percentComplete}%` }}
            />
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/80">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">TOTAL COMPANIES</div>
            <div className="text-base font-bold text-white mt-0.5">{totalRecords.toLocaleString()}</div>
            <div className="text-[10px] text-slate-500">Batch size: {job?.batchSize || 100}</div>
          </div>

          <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/80">
            <div className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">SUCCESSFUL BATCHES</div>
            <div className="text-base font-bold text-emerald-400 mt-0.5">
              {successfulBatches} <span className="text-xs text-slate-500 font-normal">/ {totalBatches}</span>
            </div>
            <div className="text-[10px] text-slate-500">{deliveredRecords} companies delivered</div>
          </div>

          <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/80">
            <div className="text-[10px] font-bold text-amber-400 uppercase tracking-wider">PENDING BATCHES</div>
            <div className="text-base font-bold text-amber-400 mt-0.5">{pendingBatches}</div>
            <div className="text-[10px] text-slate-500">{remainingRecords} remaining</div>
          </div>

          <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/80">
            <div className="text-[10px] font-bold text-rose-400 uppercase tracking-wider">FAILED BATCHES</div>
            <div className="text-base font-bold text-rose-400 mt-0.5">{failedBatches}</div>
            <div className="text-[10px] text-slate-500">
              {failedBatches > 0 ? 'Retry available' : 'None'}
            </div>
          </div>
        </div>

        {/* Target Destination Info */}
        <div className="px-3.5 py-2.5 rounded-xl bg-slate-950/90 border border-slate-800 text-[11px] flex flex-wrap items-center justify-between gap-2 text-slate-300">
          <div className="flex items-center gap-2">
            <span className="text-blue-400 font-bold">🎯 Destination Webhook:</span>
            <span className="font-mono text-slate-400 truncate max-w-sm" title={job?.targetWebhookUrl}>
              {job?.targetWebhookUrl || 'Configured via AI_DASHBOARD_WEBHOOK_URL'}
            </span>
          </div>
          {job?.startedAt && (
            <div className="text-slate-500">
              Started: {new Date(job.startedAt).toLocaleTimeString()}
            </div>
          )}
        </div>

        {/* Batches Table (Scrollable) */}
        <div className="flex-1 overflow-hidden flex flex-col space-y-2 min-h-[180px]">
          <div className="text-xs font-semibold text-slate-300">Batch Delivery Ledger:</div>
          <div className="flex-1 overflow-y-auto rounded-xl border border-slate-800 shadow-inner">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-950 text-slate-400 font-semibold uppercase text-[10px] sticky top-0 border-b border-slate-800">
                <tr>
                  <th className="py-2.5 px-3">Batch</th>
                  <th className="py-2.5 px-3">Record Range</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Attempts</th>
                  <th className="py-2.5 px-3">Details / Acknowledged</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-normal text-slate-300">
                {(!job?.batches || job.batches.length === 0) ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-500 text-xs">
                      Initializing batches...
                    </td>
                  </tr>
                ) : (
                  job.batches.map((batch) => {
                    const isSuccess = batch.status === 'success';
                    const isFailed = batch.status === 'failed';
                    const isInProgress = batch.status === 'in_progress' || batch.status === 'retrying';

                    return (
                      <tr key={batch.id} className="hover:bg-slate-800/30 transition">
                        <td className="py-2.5 px-3 font-mono font-bold text-white text-[11px]">
                          #{batch.batchNumber}
                        </td>
                        <td className="py-2.5 px-3 text-slate-400 whitespace-nowrap text-[11px]">
                          Records {batch.recordStartIndex}–{batch.recordEndIndex} ({batch.recordCount})
                        </td>
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold ${
                            isSuccess
                              ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                              : isFailed
                              ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                              : isInProgress
                              ? 'bg-blue-500/15 text-blue-400 border border-blue-500/30'
                              : 'bg-slate-800 text-slate-400 border border-slate-700'
                          }`}>
                            {isSuccess && <Check size={11} />}
                            {isInProgress && <Radio size={11} className="animate-pulse" />}
                            {isFailed && <AlertCircle size={11} />}
                            {batch.status.toUpperCase()}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-slate-400 font-mono text-[11px]">
                          {batch.retryCount} / {batch.maxRetries}
                        </td>
                        <td className="py-2.5 px-3 text-[11px] truncate max-w-xs text-slate-400">
                          {isSuccess ? (
                            <span className="text-emerald-400/90 font-mono">
                              ✓ Acknowledged (HTTP {batch.httpStatus || 200})
                            </span>
                          ) : isFailed ? (
                            <span className="text-rose-400" title={batch.errorMessage}>
                              {batch.errorMessage || 'Transfer failed'}
                            </span>
                          ) : isInProgress ? (
                            <span className="text-blue-400">Transmitting .xlsx workbook...</span>
                          ) : (
                            <span className="text-slate-500">Queued</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="pt-2 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            {onDownloadExcel && (
              <button
                type="button"
                onClick={onDownloadExcel}
                className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold transition flex items-center gap-1.5"
              >
                <Download size={13} className="text-emerald-400" />
                <span>Download Complete Excel (.xlsx)</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {failedBatches > 0 && isFinished && (
              <button
                type="button"
                onClick={handleRetry}
                disabled={retrying}
                className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold transition flex items-center gap-1.5 shadow-md shadow-amber-600/20"
              >
                <RotateCw size={13} className={retrying ? 'animate-spin' : ''} />
                <span>Retry Failed Batches ({failedBatches})</span>
              </button>
            )}

            {!isFinished && (
              <button
                type="button"
                onClick={handleCancel}
                disabled={cancelling}
                className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-rose-950/40 text-slate-400 hover:text-rose-400 border border-slate-700 font-semibold transition flex items-center gap-1.5"
              >
                <Ban size={13} />
                <span>Cancel Transfer</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold transition"
            >
              {isFinished ? 'Done' : 'Close View'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
