import React from 'react';

const InputField = ({ label, val, set, type='text', req=false, col=1 }) => (
  <div className={col === 2 ? "col-span-2" : ""}>
    <label className="block text-xs font-bold text-gray-600 mb-1">{label}</label>
    <input 
      type={type} 
      required={req} 
      value={val || ''} 
      onChange={e => set(e.target.value)} 
      className="w-full border border-gray-300 rounded p-1.5 text-sm outline-none focus:ring-1 focus:ring-[#C09D9B]" 
    />
  </div>
);

export default InputField;
