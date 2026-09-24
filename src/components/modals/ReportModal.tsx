import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, CheckCircle2, ShieldAlert } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import type { ContentReport } from '../../types';

export const ReportModal: React.FC = () => {
  const { reportModal, closeReportModal } = useAuth();
  const [reason, setReason] = useState<ContentReport['reason']>('copyright');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  if (!reportModal.isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportModal.trackId) return;
    setIsSubmitting(true);
    setError('');
    try {
      await api.submitReport({
        trackId: reportModal.trackId,
        reason,
        notes: notes.trim()
      });
      setSubmitted(true);
    } catch (err: any) {
      setError(err.message || 'Failed to submit report. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setSubmitted(false);
    setNotes('');
    closeReportModal();
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="relative w-full max-w-md overflow-hidden rounded-2xl border border-white/10 bg-[#0f1422] text-white shadow-2xl"
        >
          <div className="flex items-center justify-between border-b border-white/10 p-5">
            <div className="flex items-center gap-2 text-amber-400">
              <ShieldAlert className="h-5 w-5" />
              <h3 className="font-semibold text-white">Report Track</h3>
            </div>
            <button
              onClick={handleClose}
              className="rounded-full p-1.5 text-zinc-400 hover:bg-white/10 hover:text-white transition"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="p-6">
            {submitted ? (
              <div className="text-center py-6">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400">
                  <CheckCircle2 className="h-6 w-6" />
                </div>
                <h4 className="text-lg font-bold text-white mb-1">Report Submitted</h4>
                <p className="text-xs text-zinc-400 max-w-xs mx-auto mb-6">
                  Thank you for helping keep Resonance safe and compliant. Our moderation team will review this track promptly.
                </p>
                <button
                  onClick={handleClose}
                  className="rounded-xl bg-white/10 px-6 py-2.5 text-sm font-semibold text-white hover:bg-white/20 transition cursor-pointer"
                >
                  Close
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="rounded-xl bg-white/5 p-3 text-xs text-zinc-300">
                  <p className="font-medium text-white mb-0.5">{reportModal.trackTitle}</p>
                  <p className="text-zinc-400">by {reportModal.artistName}</p>
                </div>

                {error && (
                  <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-2.5 text-xs text-red-400">
                    {error}
                  </div>
                )}

                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1.5">Violation Reason</label>
                  <select
                    value={reason}
                    onChange={(e) => setReason(e.target.value as any)}
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-3.5 py-2.5 text-sm text-white focus:border-amber-400 focus:outline-none"
                  >
                    <option value="copyright" className="bg-[#0f1422] text-white">Copyright or IP Infringement</option>
                    <option value="spam" className="bg-[#0f1422] text-white">Spam or Misleading Content</option>
                    <option value="offensive" className="bg-[#0f1422] text-white">Offensive / Hate Speech</option>
                    <option value="impersonation" className="bg-[#0f1422] text-white">Artist Impersonation</option>
                    <option value="illegal" className="bg-[#0f1422] text-white">Illegal Content</option>
                    <option value="other" className="bg-[#0f1422] text-white">Other Policy Violation</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1.5">Additional Details</label>
                  <textarea
                    rows={3}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Provide timestamps or specific information for our moderators..."
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-3.5 py-2 text-sm text-white placeholder-zinc-500 focus:border-amber-400 focus:outline-none"
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={handleClose}
                    className="flex-1 rounded-xl border border-white/10 bg-white/5 py-2.5 text-sm font-medium text-zinc-300 hover:bg-white/10 transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 rounded-xl bg-amber-500 py-2.5 text-sm font-semibold text-black hover:bg-amber-400 transition disabled:opacity-50 cursor-pointer"
                  >
                    {isSubmitting ? 'Submitting...' : 'Submit Report'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
