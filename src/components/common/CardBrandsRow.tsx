import React from 'react';

export const CardBrandsRow: React.FC<{ className?: string }> = ({ className = '' }) => {
  return (
    <div className={`flex items-center justify-center space-x-1.5 flex-wrap ${className}`}>
      {/* Visa */}
      <div className="px-2 py-1 bg-white border border-slate-200 rounded-md flex items-center shadow-2xs">
        <span className="text-[10px] font-black tracking-tight italic text-[#1a1f71]">VISA</span>
      </div>

      {/* Mastercard */}
      <div className="px-2 py-1 bg-white border border-slate-200 rounded-md flex items-center space-x-[-4px] shadow-2xs">
        <div className="w-3 h-3 rounded-full bg-[#eb001b]"></div>
        <div className="w-3 h-3 rounded-full bg-[#f79e1b] opacity-90"></div>
      </div>

      {/* Amex */}
      <div className="px-2 py-1 bg-[#006fcf] text-white rounded-md flex items-center shadow-2xs">
        <span className="text-[9px] font-black tracking-tighter">AMEX</span>
      </div>

      {/* UnionPay */}
      <div className="px-1.5 py-1 bg-white border border-slate-200 rounded-md flex items-center space-x-0.5 shadow-2xs">
        <span className="text-[8px] font-black text-red-600">Union</span>
        <span className="text-[8px] font-black text-blue-600">Pay</span>
      </div>

      {/* Diners Club */}
      <div className="px-1.5 py-1 bg-white border border-slate-200 rounded-md flex items-center shadow-2xs">
        <span className="text-[9px] font-bold text-blue-800 tracking-tighter">DC</span>
      </div>

      {/* Discover */}
      <div className="px-1.5 py-1 bg-white border border-slate-200 rounded-md flex items-center shadow-2xs">
        <span className="text-[9px] font-bold text-slate-900 tracking-tighter">DISC<span className="text-orange-500">●</span></span>
      </div>

      {/* JCB */}
      <div className="px-1.5 py-1 bg-white border border-slate-200 rounded-md flex items-center space-x-0.5 shadow-2xs">
        <span className="text-[9px] font-black text-blue-600">J</span>
        <span className="text-[9px] font-black text-red-600">C</span>
        <span className="text-[9px] font-black text-emerald-600">B</span>
      </div>
    </div>
  );
};
