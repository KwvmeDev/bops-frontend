import React, { useState, useEffect, useCallback } from 'react';
import { AnimatePresence } from 'framer-motion';
import { Plus, Search, ChevronDown, X, FileText } from 'lucide-react';
import dayjs from 'dayjs';
import { useAuth } from '../context/AuthContext';
import { prescriptionsApi } from '../api/client';
import { toast } from '../components/ui';
import { Table, Thead, Tbody, Th, Tr, Td } from '../components/ui/Table';
import PrescriptionForm from '../components/PrescriptionForm';

// ── Status badge palette ──────────────────────────────────────────────────────
const STATUS_STYLES = {
  ACTIVE:    'bg-blue-500/15 text-blue-400 border border-blue-500/20',
  PARTIAL:   'bg-amber-500/15 text-amber-400 border border-amber-500/20',
  DISPENSED: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20',
  EXPIRED:   'bg-red-500/15 text-red-400 border border-red-500/20',
  CANCELLED: 'bg-zinc-500/15 text-zinc-400 border border-zinc-500/20',
};

const STATUS_OPTIONS = ['ALL', 'ACTIVE', 'PARTIAL', 'DISPENSED', 'EXPIRED', 'CANCELLED'];

function StatusBadge({ status }) {
  const cls = STATUS_STYLES[status] ?? STATUS_STYLES.CANCELLED;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${cls}`}>
      {status}
    </span>
  );
}

// ── Row detail expansion — shows items + dispensed qty ───────────────────────
function PrescriptionDetailRow({ rx }) {
  return (
    <Tr>
      <Td colSpan={7} className="bg-surface-muted/20 py-0">
        <div className="px-2 py-3">
          <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">Prescription Items</p>
          {rx.items?.length > 0 ? (
            <div className="space-y-1.5">
              {rx.items.map(item => (
                <div key={item.id} className="flex items-center justify-between bg-surface-base rounded-lg px-3 py-2">
                  <div>
                    <p className="text-sm text-zinc-200">{item.product?.name ?? 'Unknown product'}</p>
                    {item.instructions && (
                      <p className="text-xs text-zinc-500 italic mt-0.5">{item.instructions}</p>
                    )}
                  </div>
                  <div className="text-right flex-shrink-0 ml-4">
                    <p className="text-sm text-zinc-300">
                      {item.dispensedQty} / {item.prescribedQty} dispensed
                    </p>
                    {item.durationDays && (
                      <p className="text-xs text-zinc-500">{item.durationDays} days</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-zinc-500">No item details available.</p>
          )}
        </div>
      </Td>
    </Tr>
  );
}

// ── Empty state ───────────────────────────────────────────────────────────────
function EmptyPrescriptions({ query }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="w-12 h-12 rounded-full bg-surface-muted flex items-center justify-center mb-4">
        <FileText className="w-6 h-6 text-zinc-500" />
      </div>
      <p className="text-zinc-300 font-medium mb-1">
        {query ? 'No prescriptions match your search' : 'No prescriptions yet'}
      </p>
      <p className="text-zinc-500 text-sm">
        {query ? 'Try a different name, phone number, or Rx number.' : 'Create a prescription to get started.'}
      </p>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function Prescriptions() {
  const { tenant } = useAuth();

  // Pharmacy-mode gate — only renders content when pharmacyMode is enabled
  if (!tenant?.pharmacyMode) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center p-8">
        <p className="text-zinc-400 text-sm">Pharmacy mode is not enabled for this account.</p>
      </div>
    );
  }

  return <PrescriptionsContent />;
}

function PrescriptionsContent() {
  // ── Filter state ──────────────────────────────────────────────────────────
  const [startDate, setStartDate] = useState(dayjs().subtract(30, 'day').format('YYYY-MM-DD'));
  const [endDate, setEndDate] = useState(dayjs().format('YYYY-MM-DD'));
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // ── Data state ────────────────────────────────────────────────────────────
  const [prescriptions, setPrescriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);

  // ── Sheet state ───────────────────────────────────────────────────────────
  const [formOpen, setFormOpen] = useState(false);

  const fetchPrescriptions = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        from: startDate,
        to: endDate,
        ...(statusFilter !== 'ALL' ? { status: statusFilter } : {}),
        ...(searchQuery.trim() ? { patientName: searchQuery.trim() } : {}),
      };
      const res = await prescriptionsApi.getAll(params);
      setPrescriptions(res.data?.data?.prescriptions ?? []);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to load prescriptions');
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, statusFilter, searchQuery]);

  useEffect(() => {
    fetchPrescriptions();
  }, [fetchPrescriptions]);

  const handleRowClick = (id) => {
    setExpandedId(prev => (prev === id ? null : id));
  };

  const handleNewSuccess = () => {
    fetchPrescriptions();
  };

  return (
    <div className="p-4 md:p-6 space-y-5">
      {/* ── Page header ──────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-semibold text-zinc-100">Prescriptions</h1>
          <p className="text-sm text-zinc-500 mt-0.5">View and manage patient prescriptions</p>
        </div>
        <button
          onClick={() => setFormOpen(true)}
          className="flex items-center gap-2 px-3.5 py-2 bg-brand hover:bg-brand-dark text-white text-sm font-semibold rounded-xl transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Prescription
        </button>
      </div>

      {/* ── Filters ──────────────────────────────────────────────────────── */}
      <div className="bg-surface-subtle border border-surface-muted/50 rounded-2xl p-4 space-y-3">
        {/* Row 1: date range */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="space-y-1">
            <label className="block text-xs font-medium text-zinc-500">From</label>
            <input
              type="date"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-surface-base border border-surface-muted/60 text-zinc-100 text-sm focus:outline-none focus:border-brand/50 transition-colors"
            />
          </div>
          <div className="space-y-1">
            <label className="block text-xs font-medium text-zinc-500">To</label>
            <input
              type="date"
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-surface-base border border-surface-muted/60 text-zinc-100 text-sm focus:outline-none focus:border-brand/50 transition-colors"
            />
          </div>

          {/* Status filter */}
          <div className="space-y-1">
            <label className="block text-xs font-medium text-zinc-500">Status</label>
            <div className="relative">
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                className="w-full appearance-none px-3 py-2 pr-8 rounded-lg bg-surface-base border border-surface-muted/60 text-zinc-100 text-sm focus:outline-none focus:border-brand/50 transition-colors"
              >
                {STATUS_OPTIONS.map(s => (
                  <option key={s} value={s}>{s === 'ALL' ? 'All Statuses' : s}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500 pointer-events-none" />
            </div>
          </div>

          {/* Patient search */}
          <div className="space-y-1">
            <label className="block text-xs font-medium text-zinc-500">Patient Search</label>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Name or phone..."
                className="w-full pl-8 pr-8 py-2 rounded-lg bg-surface-base border border-surface-muted/60 text-zinc-100 placeholder-zinc-600 text-sm focus:outline-none focus:border-brand/50 transition-colors"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-200 transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Table ────────────────────────────────────────────────────────── */}
      <div className="bg-surface-subtle border border-surface-muted/50 rounded-2xl overflow-hidden">
        <Table>
          <Thead>
            <tr>
              <Th>Rx Number</Th>
              <Th>Patient</Th>
              <Th>Phone</Th>
              <Th>Prescriber</Th>
              <Th>Status</Th>
              <Th>Prescribed</Th>
              <Th>Fills</Th>
            </tr>
          </Thead>
          <Tbody loading={loading} loadingRows={6} cols={7}>
            {!loading && prescriptions.length === 0 && (
              <tr>
                <td colSpan={7}>
                  <EmptyPrescriptions query={searchQuery} />
                </td>
              </tr>
            )}
            {prescriptions.map(rx => (
              // React.Fragment with key so React can track both sibling rows cleanly
              <React.Fragment key={rx.id}>
                <Tr
                  className="cursor-pointer"
                  onClick={() => handleRowClick(rx.id)}
                >
                  <Td>
                    <p className="font-mono text-xs font-semibold text-zinc-200">{rx.rxNumber}</p>
                    {rx.items?.length > 0 && (
                      <p className="text-xs text-zinc-500 mt-0.5 max-w-[180px] truncate">
                        {rx.items.map(i => i.product?.name).filter(Boolean).join(', ')}
                      </p>
                    )}
                  </Td>
                  <Td className="font-medium text-zinc-200">{rx.patientName}</Td>
                  <Td className="text-zinc-400">{rx.patientPhone ?? '—'}</Td>
                  <Td className="text-zinc-400">
                    {rx.prescriber?.name ?? rx.prescriberName ?? '—'}
                  </Td>
                  <Td><StatusBadge status={rx.status} /></Td>
                  <Td className="text-zinc-400">{dayjs(rx.prescribedDate).format('DD MMM YYYY')}</Td>
                  <Td>
                    <span className="text-xs font-medium text-zinc-300">
                      {rx.fillsUsed}/{rx.totalFills}
                    </span>
                  </Td>
                </Tr>

                {/* Inline detail expansion row */}
                <AnimatePresence>
                  {expandedId === rx.id && (
                    <PrescriptionDetailRow key={`${rx.id}-detail`} rx={rx} />
                  )}
                </AnimatePresence>
              </React.Fragment>
            ))}
          </Tbody>
        </Table>
      </div>

      {/* ── New prescription form sheet ───────────────────────────────── */}
      <PrescriptionForm
        open={formOpen}
        onOpenChange={setFormOpen}
        onSuccess={handleNewSuccess}
      />
    </div>
  );
}
