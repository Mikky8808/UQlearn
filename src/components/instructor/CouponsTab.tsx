import React, { useState, useEffect } from 'react';
import { Tag, Plus, Trash2, Copy } from 'lucide-react';
import { apiFetch } from '../../lib/apiConfig';

export const CouponsTab: React.FC = () => {
  const [coupons, setCoupons] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchCoupons = async () => {
    setLoading(true);
    const res = await apiFetch('coupons.php');
    if (res?.success) setCoupons(res.data);
    setLoading(false);
  };

  useEffect(() => { fetchCoupons(); }, []);

  const generateCoupon = async () => {
    const res = await apiFetch('coupons.php', {
      method: 'POST',
      body: JSON.stringify({ action: 'generate', discount_value: 20 })
    });
    if (res?.success) fetchCoupons();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-black">Manage Coupons</h2>
        <button onClick={generateCoupon} className="flex items-center space-x-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold">
          <Plus className="w-4 h-4" />
          <span>Generate New Promo Code</span>
        </button>
      </div>

      <div className="bg-white rounded-2xl border p-6">
        {loading ? <p>Loading...</p> : (
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b text-slate-500">
                <th className="text-left pb-2">Code</th>
                <th className="text-left pb-2">Discount</th>
                <th className="text-left pb-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {coupons.map(c => (
                <tr key={c.id} className="border-b">
                  <td className="py-3 font-bold">{c.code}</td>
                  <td className="py-3">{c.discount_value} {c.discount_type === 'percentage' ? '%' : '$'}</td>
                  <td className="py-3">{c.is_active ? 'Active' : 'Expired'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};
