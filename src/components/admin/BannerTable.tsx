import React from 'react';
import { HeroBanner } from '../../types';
import { 
  Edit2, 
  Trash2, 
  Eye, 
  EyeOff, 
  ExternalLink, 
  GripVertical,
  ImageIcon
} from 'lucide-react';

interface BannerTableProps {
  banners: HeroBanner[];
  onEdit: (banner: HeroBanner) => void;
  onDelete: (id: string) => void;
}

export const BannerTable: React.FC<BannerTableProps> = ({ banners, onEdit, onDelete }) => {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b border-slate-200 dark:border-slate-800">
            <th className="w-10 pb-4"></th>
            <th className="text-left text-[10px] font-black text-slate-400 uppercase tracking-widest pb-4 px-4">Banner Image</th>
            <th className="text-center text-[10px] font-black text-slate-400 uppercase tracking-widest pb-4 px-4">Status</th>
            <th className="text-center text-[10px] font-black text-slate-400 uppercase tracking-widest pb-4 px-4">Order</th>
            <th className="text-right text-[10px] font-black text-slate-400 uppercase tracking-widest pb-4 px-4">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
          {banners.map((banner) => (
            <tr key={banner.id} className="group hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors">
              <td className="py-4">
                <GripVertical className="w-4 h-4 text-slate-300 dark:text-slate-700 cursor-grab active:cursor-grabbing" />
              </td>
              <td className="py-4 px-4">
                <div className="flex items-center space-x-3">
                  <div className="w-24 h-12 rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shrink-0">
                    {banner.imageUrl ? (
                      <img src={banner.imageUrl} alt="Banner" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <ImageIcon className="w-4 h-4 text-slate-400" />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="text-[10px] text-slate-500 font-mono truncate max-w-[300px]">
                      {banner.imageUrl}
                    </div>
                  </div>
                </div>
              </td>
              <td className="py-4 px-4 text-center">
                <span className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-tighter ${
                  banner.isActive 
                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400' 
                    : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-500'
                }`}>
                  {banner.isActive ? (
                    <><Eye className="w-2.5 h-2.5" /><span>Visible</span></>
                  ) : (
                    <><EyeOff className="w-2.5 h-2.5" /><span>Hidden</span></>
                  )}
                </span>
              </td>
              <td className="py-4 px-4 text-center">
                <span className="inline-flex items-center justify-center w-6 h-6 rounded-lg bg-slate-100 dark:bg-slate-800 text-[10px] font-black text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                  {banner.order}
                </span>
              </td>
              <td className="py-4 px-4 text-right">
                <div className="flex items-center justify-end space-x-1">
                  <button 
                    onClick={() => onEdit(banner)}
                    className="p-1.5 text-slate-400 hover:text-teal-600 hover:bg-teal-50 dark:hover:bg-teal-950/30 rounded-lg transition-colors cursor-pointer"
                    title="Edit Banner"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button 
                    onClick={() => onDelete(banner.id)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition-colors cursor-pointer"
                    title="Delete Banner"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
          {banners.length === 0 && (
            <tr>
              <td colSpan={5} className="py-12 text-center text-slate-400 text-xs font-bold">
                No banners found in the database.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};
