import React, { useState, useMemo } from 'react';
import { 
  Globe, 
  Plus, 
  Search, 
  CheckCircle2, 
  Edit3, 
  Trash2, 
  AlertCircle, 
  RefreshCw, 
  X, 
  Save, 
  Building2,
  ShieldCheck,
  Landmark
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { PayoutCountry } from '../../lib/apiConfig';
import { AdminConfigureBanksView } from './AdminConfigureBanksView';

export const AdminPayoutCountriesTab: React.FC = () => {
  const { 
    payoutCountries, 
    fetchPayoutCountries, 
    addPayoutCountry, 
    updatePayoutCountry, 
    deletePayoutCountry, 
    togglePayoutCountryActive,
    getPayoutBanksForCountry
  } = useApp();

  const [selectedCountryForBanks, setSelectedCountryForBanks] = useState<PayoutCountry | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCountry, setEditingCountry] = useState<PayoutCountry | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [countryToDelete, setCountryToDelete] = useState<PayoutCountry | null>(null);

  // Form State - strictly Country Name and Is Active as requested
  const [formData, setFormData] = useState({
    name: '',
    isActive: true
  });

  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchPayoutCountries();
    setIsRefreshing(false);
    showNotification('success', 'Payout countries synchronized with live database');
  };

  // Filtered Countries
  const filteredCountries = useMemo(() => {
    return payoutCountries.filter(c => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = !q || 
        c.name.toLowerCase().includes(q) || 
        c.code.toLowerCase().includes(q);

      const matchesStatus = 
        statusFilter === 'all' ? true :
        statusFilter === 'active' ? c.isActive !== false :
        c.isActive === false;

      return matchesSearch && matchesStatus;
    });
  }, [payoutCountries, searchQuery, statusFilter]);

  // Summary Metrics
  const totalCount = payoutCountries.length;
  const activeCount = payoutCountries.filter(c => c.isActive !== false).length;
  const inactiveCount = totalCount - activeCount;

  const handleOpenAddModal = () => {
    setEditingCountry(null);
    setFormData({
      name: '',
      isActive: true
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (country: PayoutCountry) => {
    setEditingCountry(country);
    setFormData({
      name: country.name,
      isActive: country.isActive !== false
    });
    setIsModalOpen(true);
  };

  const handleSaveForm = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = formData.name.trim();
    if (!cleanName) {
      showNotification('error', 'Please enter a country name');
      return;
    }

    if (editingCountry) {
      // Update
      await updatePayoutCountry(editingCountry.id, {
        name: cleanName,
        isActive: formData.isActive
      });
      showNotification('success', `Updated ${cleanName}`);
    } else {
      // Create
      await addPayoutCountry({
        name: cleanName,
        isActive: formData.isActive
      });
      showNotification('success', `Added ${cleanName} to supported payout destinations`);
    }

    setIsModalOpen(false);
  };

  const handleToggleStatus = async (country: PayoutCountry) => {
    const nextState = country.isActive === false ? true : false;
    await togglePayoutCountryActive(country.id, nextState);
    showNotification('success', `${country.name} is now ${nextState ? 'active' : 'inactive'}`);
  };

  const handleDeleteConfirm = async () => {
    if (!countryToDelete) return;
    await deletePayoutCountry(countryToDelete.id);
    showNotification('success', `Removed ${countryToDelete.name}`);
    setIsDeleteModalOpen(false);
    setCountryToDelete(null);
  };

  // Helper flag emoji from 2-letter code if available
  const getFlagEmoji = (countryCode: string) => {
    if (!countryCode || countryCode.length !== 2) return '🌐';
    try {
      const codePoints = countryCode
        .toUpperCase()
        .split('')
        .map(char => 127397 + char.charCodeAt(0));
      return String.fromCodePoint(...codePoints);
    } catch {
      return '🌐';
    }
  };

  // If viewing/configuring banks for a country, render the dedicated view
  if (selectedCountryForBanks) {
    return (
      <AdminConfigureBanksView
        country={selectedCountryForBanks}
        onBack={() => setSelectedCountryForBanks(null)}
      />
    );
  }

  return (
    <div id="admin-payout-countries-tab" className="space-y-6">
      {/* Header Banner */}
      <div id="payout-countries-header" className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2 text-indigo-600 dark:text-indigo-400 font-bold text-xs uppercase tracking-wider mb-2">
              <Globe className="w-4 h-4" />
              <span>Financial Infrastructure</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
              Supported Payout Countries
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-2xl">
              Add countries where you send instructor earnings. Instructors will choose from this list when configuring bank details.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <button
              id="open-add-country-btn"
              onClick={handleOpenAddModal}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-md shadow-indigo-600/20 transition-all flex items-center space-x-2 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add Supported Payout Country</span>
            </button>
          </div>
        </div>

        {/* Notifications */}
        {notification && (
          <div 
            id="payout-countries-notification"
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
          <div id="stat-total-countries" className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Total Countries</span>
              <Building2 className="w-4 h-4 text-indigo-500" />
            </div>
            <div className="text-2xl font-black text-slate-900 dark:text-slate-100 mt-1">{totalCount}</div>
            <p className="text-[11px] text-slate-400 mt-0.5">Configured destinations</p>
          </div>

          <div id="stat-active-countries" className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Active Countries</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            </div>
            <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">{activeCount}</div>
            <p className="text-[11px] text-slate-400 mt-0.5">Visible to instructors</p>
          </div>

          <div id="stat-inactive-countries" className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Inactive Countries</span>
              <Globe className="w-4 h-4 text-slate-400" />
            </div>
            <div className="text-2xl font-black text-slate-600 dark:text-slate-400 mt-1">{inactiveCount}</div>
            <p className="text-[11px] text-slate-400 mt-0.5">Hidden from instructors</p>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div id="payout-countries-list-card" className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-4 sm:p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              id="search-countries-input"
              type="text"
              placeholder="Search countries..."
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
              id="filter-status-all"
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
              id="filter-status-active"
              onClick={() => setStatusFilter('active')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                statusFilter === 'active'
                  ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              Active ({activeCount})
            </button>
            <button
              id="filter-status-inactive"
              onClick={() => setStatusFilter('inactive')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                statusFilter === 'inactive'
                  ? 'bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              Inactive ({inactiveCount})
            </button>
          </div>
        </div>

        {/* Instructor Visibility Info */}
        <div className="p-3.5 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/50 flex items-center justify-between text-xs text-indigo-900 dark:text-indigo-200">
          <div className="flex items-center space-x-2.5">
            <ShieldCheck className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
            <span>
              <strong>Instructor Selector:</strong> Instructors setting up bank details will only see countries with <strong>Active</strong> status.
            </span>
          </div>
        </div>

        {/* Countries Table */}
        <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 uppercase tracking-wider font-bold border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="py-3.5 px-4">Country</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4">Supported Banks</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium text-slate-700 dark:text-slate-300">
              {filteredCountries.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-12 text-center text-slate-400">
                    <Globe className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    <p className="font-bold text-sm text-slate-600 dark:text-slate-300">No payout countries configured</p>
                    <p className="text-xs text-slate-400 mt-1">Click "Add Supported Payout Country" to add your first destination country.</p>
                  </td>
                </tr>
              ) : (
                filteredCountries.map(country => {
                  const countryBanks = getPayoutBanksForCountry(country.id);
                  const activeBanksCount = countryBanks.filter(b => b.isActive !== false).length;

                  return (
                    <tr 
                      key={country.id} 
                      id={`country-row-${country.id}`}
                      className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      {/* Country Name */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center space-x-3">
                          <span className="text-2xl select-none" title={country.name}>
                            {getFlagEmoji(country.code)}
                          </span>
                          <div>
                            <div className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                              {country.name}
                            </div>
                            {country.code && (
                              <span className="text-[10px] font-mono text-slate-400 uppercase">
                                {country.code}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        <button
                          id={`toggle-status-${country.id}`}
                          onClick={() => handleToggleStatus(country)}
                          className={`inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
                            country.isActive !== false
                              ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:bg-slate-200'
                          }`}
                          title="Click to toggle active / inactive"
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${country.isActive !== false ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                          <span>{country.isActive !== false ? 'Active' : 'Inactive'}</span>
                        </button>
                      </td>

                      {/* Supported Banks Summary & Link */}
                      <td className="py-3.5 px-4">
                        <button
                          id={`quick-banks-${country.id}`}
                          onClick={() => setSelectedCountryForBanks(country)}
                          className="inline-flex items-center space-x-2 px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 hover:text-indigo-600 dark:hover:text-indigo-400 text-slate-700 dark:text-slate-300 font-bold text-xs transition-colors cursor-pointer border border-slate-200 dark:border-slate-700"
                          title="View & manage banks for this country"
                        >
                          <Landmark className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                          <span>
                            {countryBanks.length} {countryBanks.length === 1 ? 'bank' : 'banks'}
                          </span>
                          {activeBanksCount > 0 && activeBanksCount !== countryBanks.length && (
                            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
                              ({activeBanksCount} active)
                            </span>
                          )}
                        </button>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end space-x-2">
                          <button
                            id={`configure-banks-btn-${country.id}`}
                            onClick={() => setSelectedCountryForBanks(country)}
                            className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 font-bold text-xs transition-all cursor-pointer border border-indigo-200/60 dark:border-indigo-800"
                            title={`Configure banks for ${country.name}`}
                          >
                            <Landmark className="w-3.5 h-3.5" />
                            <span>Configure Banks</span>
                          </button>
                          <button
                            id={`edit-country-${country.id}`}
                            onClick={() => handleOpenEditModal(country)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 transition-all cursor-pointer"
                            title="Edit Country"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            id={`delete-country-${country.id}`}
                            onClick={() => {
                              setCountryToDelete(country);
                              setIsDeleteModalOpen(true);
                            }}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-all cursor-pointer"
                            title="Delete Country"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CREATE / EDIT MODAL - ONLY Country Field and Is Active */}
      {isModalOpen && (
        <div id="payout-country-modal" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
                  <Globe className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900 dark:text-slate-100">
                    {editingCountry ? 'Edit Payout Country' : 'Add Supported Payout Country'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Configure supported country for instructor payouts
                  </p>
                </div>
              </div>
              <button
                id="close-country-modal-btn"
                onClick={() => setIsModalOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveForm} className="space-y-5">
              {/* Country Field Only */}
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
                  Country *
                </label>
                <input
                  id="country-name-input"
                  type="text"
                  required
                  autoFocus
                  placeholder="e.g. United States, United Kingdom, Kenya, Nigeria..."
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500 placeholder:text-slate-400"
                />
              </div>

              {/* Is Active Toggle */}
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                <label className="flex items-center space-x-3 cursor-pointer select-none">
                  <input
                    id="country-is-active-toggle"
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 dark:border-slate-600 cursor-pointer"
                  />
                  <div>
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                      Is Active
                    </span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 block">
                      Enable this country for instructor payout selection (uncheck to deactivate)
                    </span>
                  </div>
                </label>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 font-bold text-xs hover:bg-slate-50 dark:hover:bg-slate-800 transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  id="save-payout-country-btn"
                  type="submit"
                  className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-md shadow-indigo-600/20 transition-all flex items-center space-x-2 cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>{editingCountry ? 'Save Changes' : 'Add Country'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {isDeleteModalOpen && countryToDelete && (
        <div id="delete-country-modal" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 sm:p-7 max-w-md w-full shadow-2xl space-y-5">
            <div className="flex items-center space-x-3 text-rose-600 dark:text-rose-400">
              <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/50">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-slate-100">
                  Delete Payout Country?
                </h3>
                <p className="text-xs text-slate-500">
                  {countryToDelete.name}
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Are you sure you want to remove <strong>{countryToDelete.name}</strong> from the supported payout countries list? Instructors will no longer see this country when configuring their bank details.
            </p>

            <div className="flex items-center justify-end space-x-3 pt-2">
              <button
                onClick={() => {
                  setIsDeleteModalOpen(false);
                  setCountryToDelete(null);
                }}
                className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 font-bold text-xs hover:bg-slate-50 dark:hover:bg-slate-800 transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                id="confirm-delete-country-btn"
                onClick={handleDeleteConfirm}
                className="px-5 py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-xl shadow-md shadow-rose-600/20 transition-all cursor-pointer"
              >
                Delete Country
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
