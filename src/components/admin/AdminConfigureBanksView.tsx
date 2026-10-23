import React, { useState, useMemo, useEffect } from 'react';
import { 
  Building2, 
  Plus, 
  Search, 
  CheckCircle2, 
  Edit3, 
  Trash2, 
  AlertCircle, 
  RefreshCw, 
  X, 
  ArrowLeft,
  Landmark,
  ShieldCheck,
  Save
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { PayoutCountry, PayoutBank } from '../../lib/apiConfig';

interface AdminConfigureBanksViewProps {
  country: PayoutCountry;
  onBack: () => void;
}

export const AdminConfigureBanksView: React.FC<AdminConfigureBanksViewProps> = ({
  country,
  onBack
}) => {
  const { 
    payoutBanks, 
    fetchPayoutBanks, 
    addPayoutBank, 
    updatePayoutBank, 
    deletePayoutBank, 
    togglePayoutBankActive,
    getPayoutBanksForCountry,
    seedKenyaBanks
  } = useApp();

  const isKenya = country.name.toLowerCase() === 'kenya' || country.id === 'pc-ke' || country.code === 'KE';
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingBank, setEditingBank] = useState<PayoutBank | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [bankToDelete, setBankToDelete] = useState<PayoutBank | null>(null);

  // Form State - strictly Bank Name and Is Active
  const [bankName, setBankName] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    fetchPayoutBanks(country.id);
  }, [country.id, fetchPayoutBanks]);

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchPayoutBanks(country.id);
    setIsRefreshing(false);
    showNotification('success', `Banks synchronized with live database for ${country.name}`);
  };

  const handleSeedKenyaBanks = async () => {
    setIsSeeding(true);
    try {
      await seedKenyaBanks();
      await fetchPayoutBanks(country.id);
      showNotification('success', 'Synchronized 32 licensed commercial and microfinance banks for Kenya with the database.');
    } catch (err: any) {
      showNotification('error', err?.message || 'Failed to sync Kenya banks with the database');
    } finally {
      setIsSeeding(false);
    }
  };

  // Banks for this specific country
  const countryBanks = useMemo(() => {
    return getPayoutBanksForCountry(country.id);
  }, [getPayoutBanksForCountry, country.id]);

  // Filtered Banks
  const filteredBanks = useMemo(() => {
    return countryBanks.filter(b => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = !q || b.name.toLowerCase().includes(q);
      const matchesStatus = 
        statusFilter === 'all' ? true :
        statusFilter === 'active' ? b.isActive !== false :
        b.isActive === false;
      return matchesSearch && matchesStatus;
    });
  }, [countryBanks, searchQuery, statusFilter]);

  // Metrics
  const totalCount = countryBanks.length;
  const activeCount = countryBanks.filter(b => b.isActive !== false).length;
  const inactiveCount = totalCount - activeCount;

  const handleOpenAddModal = () => {
    setEditingBank(null);
    setBankName('');
    setIsActive(true);
    setIsAddModalOpen(true);
  };

  const handleOpenEditModal = (bank: PayoutBank) => {
    setEditingBank(bank);
    setBankName(bank.name);
    setIsActive(bank.isActive !== false);
    setIsAddModalOpen(true);
  };

  const handleSaveBank = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = bankName.trim();
    if (!cleanName) {
      showNotification('error', 'Please enter a bank name.');
      return;
    }

    setIsSaving(true);
    try {
      if (editingBank) {
        await updatePayoutBank(editingBank.id, {
          name: cleanName,
          countryId: country.id,
          countryName: country.name,
          isActive
        });
        showNotification('success', `Bank "${cleanName}" updated successfully.`);
      } else {
        await addPayoutBank({
          countryId: country.id,
          countryName: country.name,
          name: cleanName,
          isActive
        });
        showNotification('success', `Bank "${cleanName}" added for ${country.name}.`);
      }
      setIsAddModalOpen(false);
    } catch (err: any) {
      showNotification('error', err?.message || 'Failed to save bank');
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleStatus = async (bank: PayoutBank) => {
    const newStatus = !bank.isActive;
    await togglePayoutBankActive(bank.id, newStatus);
    showNotification('success', `"${bank.name}" marked as ${newStatus ? 'Active' : 'Inactive'}.`);
  };

  const handleDeleteConfirm = async () => {
    if (!bankToDelete) return;
    try {
      await deletePayoutBank(bankToDelete.id);
      showNotification('success', `Bank "${bankToDelete.name}" removed successfully.`);
      setIsDeleteModalOpen(false);
      setBankToDelete(null);
    } catch (err: any) {
      showNotification('error', err?.message || 'Failed to delete bank');
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Top Header & Navigation */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-2">
            <button
              id="back-to-countries-btn"
              onClick={onBack}
              className="inline-flex items-center space-x-2 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors cursor-pointer group mb-1"
            >
              <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
              <span>Back to Supported Countries</span>
            </button>
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-200/60 dark:border-indigo-800 shrink-0">
                <Landmark className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center space-x-2 flex-wrap">
                  <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100">
                    Supported Banks for {country.name}
                  </h1>
                  <span className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-[10px] font-bold">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span>Database Synchronized</span>
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Configure the banks instructors residing in {country.name} can select for withdrawal settlements.
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <button
              id="open-add-bank-btn"
              onClick={handleOpenAddModal}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-md shadow-indigo-600/20 transition-all flex items-center space-x-2 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add Supported Bank</span>
            </button>
          </div>
        </div>

        {/* Notifications */}
        {notification && (
          <div 
            id="banks-notification"
            className={`mt-5 p-4 rounded-2xl border flex items-center space-x-3 text-xs font-bold animate-fadeIn ${
              notification.type === 'success' 
                ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200'
                : 'bg-rose-50 dark:bg-rose-950/50 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200'
            }`}
          >
            {notification.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400" />
            )}
            <span>{notification.message}</span>
          </div>
        )}

        {/* Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
          <div id="stat-total-banks" className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Total Banks</span>
              <Building2 className="w-4 h-4 text-indigo-500" />
            </div>
            <div className="text-2xl font-black text-slate-900 dark:text-slate-100 mt-1">{totalCount}</div>
            <p className="text-[11px] text-slate-400 mt-0.5">Configured for {country.name}</p>
          </div>

          <div id="stat-active-banks" className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Active Banks</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            </div>
            <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">{activeCount}</div>
            <p className="text-[11px] text-slate-400 mt-0.5">Visible in instructor dropdown</p>
          </div>

          <div id="stat-inactive-banks" className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Inactive Banks</span>
              <Landmark className="w-4 h-4 text-slate-400" />
            </div>
            <div className="text-2xl font-black text-slate-600 dark:text-slate-400 mt-1">{inactiveCount}</div>
            <p className="text-[11px] text-slate-400 mt-0.5">Disabled / hidden from instructors</p>
          </div>
        </div>
      </div>

      {/* Filter & Bank List Card */}
      <div id="payout-banks-list-card" className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-4 sm:p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              id="search-banks-input"
              type="text"
              placeholder={`Search banks in ${country.name}...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Status Filters */}
          <div className="flex items-center space-x-1 bg-slate-50 dark:bg-slate-800/60 p-1 rounded-xl border border-slate-200 dark:border-slate-700 shrink-0">
            <button
              id="filter-bank-status-all"
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                statusFilter === 'all'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              All ({totalCount})
            </button>
            <button
              id="filter-bank-status-active"
              onClick={() => setStatusFilter('active')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                statusFilter === 'active'
                  ? 'bg-white dark:bg-slate-700 text-emerald-700 dark:text-emerald-400 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              Active ({activeCount})
            </button>
            <button
              id="filter-bank-status-inactive"
              onClick={() => setStatusFilter('inactive')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                statusFilter === 'inactive'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              Inactive ({inactiveCount})
            </button>
          </div>
        </div>

        {/* Banks Table */}
        <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 uppercase tracking-wider font-bold border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="py-3.5 px-4">Bank Name</th>
                <th className="py-3.5 px-4">Country</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium text-slate-700 dark:text-slate-300">
              {filteredBanks.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-12 text-center text-slate-400">
                    <Building2 className="w-8 h-8 mx-auto mb-2 opacity-40 text-slate-400" />
                    <p className="font-bold text-sm text-slate-600 dark:text-slate-300">No supported banks configured for {country.name}</p>
                    <p className="text-xs text-slate-400 mt-1">Click "Add Supported Bank" above to add the first bank for this country.</p>
                  </td>
                </tr>
              ) : (
                filteredBanks.map(bank => (
                  <tr 
                    key={bank.id} 
                    id={`bank-row-${bank.id}`}
                    className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    {/* Bank Name */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300 shrink-0">
                          <Landmark className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                            {bank.name}
                          </div>
                          <span className="text-[10px] font-mono text-slate-400">
                            ID: {bank.id}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Country */}
                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold text-xs">
                        {country.name}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-4">
                      <button
                        id={`toggle-bank-status-${bank.id}`}
                        onClick={() => handleToggleStatus(bank)}
                        className={`inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
                          bank.isActive !== false
                            ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:bg-slate-200'
                        }`}
                        title="Click to toggle active / inactive"
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${bank.isActive !== false ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                        <span>{bank.isActive !== false ? 'Active' : 'Inactive'}</span>
                      </button>
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end space-x-1">
                        <button
                          id={`edit-bank-${bank.id}`}
                          onClick={() => handleOpenEditModal(bank)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 transition-all cursor-pointer"
                          title="Edit Bank"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          id={`delete-bank-${bank.id}`}
                          onClick={() => {
                            setBankToDelete(bank);
                            setIsDeleteModalOpen(true);
                          }}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-all cursor-pointer"
                          title="Delete Bank"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CREATE / EDIT BANK MODAL - ONLY Bank Name and Is Active */}
      {isAddModalOpen && (
        <div id="payout-bank-modal" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
                  <Landmark className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-slate-100">
                    {editingBank ? 'Edit Supported Bank' : 'Add Supported Bank'}
                  </h3>
                  <p className="text-xs text-slate-400 font-medium">
                    Destination: <strong className="text-indigo-600 dark:text-indigo-400">{country.name}</strong>
                  </p>
                </div>
              </div>
              <button 
                id="close-bank-modal-btn"
                onClick={() => setIsAddModalOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveBank} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
                  Bank Name *
                </label>
                <input
                  id="bank-name-input"
                  type="text"
                  required
                  placeholder="e.g. JPMorgan Chase, Barclays, Equity Bank, KCB"
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
                  autoFocus
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Enter the official name of the bank as it will appear in the instructor dropdown.
                </p>
              </div>

              {/* Status Toggle */}
              <div className="pt-2">
                <label className="flex items-center space-x-3 cursor-pointer select-none">
                  <input
                    id="bank-active-checkbox"
                    type="checkbox"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                    className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 dark:border-slate-600"
                  />
                  <div>
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                      Active (Visible to Instructors)
                    </span>
                    <span className="text-[11px] text-slate-400">
                      When enabled, instructors selecting {country.name} will see this bank in their dropdown.
                    </span>
                  </div>
                </label>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  id="cancel-bank-modal-btn"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  id="submit-bank-form-btn"
                  disabled={isSaving}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center space-x-2 disabled:opacity-50 cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>{isSaving ? 'Saving...' : editingBank ? 'Save Changes' : 'Add Bank'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {isDeleteModalOpen && bankToDelete && (
        <div id="delete-bank-modal" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 max-w-sm w-full shadow-2xl space-y-5 text-center">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto border border-rose-200 dark:border-rose-800">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900 dark:text-slate-100">Delete Supported Bank?</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Are you sure you want to remove <strong className="text-slate-800 dark:text-slate-200">{bankToDelete.name}</strong> from {country.name}? Instructors will no longer be able to select it.
              </p>
            </div>
            <div className="flex items-center justify-center space-x-3 pt-2">
              <button
                id="cancel-delete-bank-btn"
                onClick={() => {
                  setIsDeleteModalOpen(false);
                  setBankToDelete(null);
                }}
                className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
              >
                Cancel
              </button>
              <button
                id="confirm-delete-bank-btn"
                onClick={handleDeleteConfirm}
                className="px-5 py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer"
              >
                Yes, Delete Bank
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
