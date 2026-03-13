import React, { useMemo } from 'react';
import { Shield, Plus, Minus, Check, X, Users, Lock } from 'lucide-react';
import InputField from '../common/InputField';
import { formatDateForInput } from '../../utils/dateHelpers';

const calculateTenure = (joinDate, milStart, milEnd, isOldSystem, internshipPeriods) => {
  if (!joinDate) return '-';
  let t = new Date() - new Date(String(joinDate));
  if (milStart && milEnd) { 
    const s = new Date(String(milStart)), e = new Date(String(milEnd)); 
    if (e > s) t -= (e - s); 
  }
  if (isOldSystem && Array.isArray(internshipPeriods)) {
    internshipPeriods.forEach(p => { 
      if (p.start && p.end) { 
        const s = new Date(String(p.start)), e = new Date(String(p.end)); 
        if (e > s) t += (e - s); 
      } 
    });
  }
  if (t < 0) return '尚未到職';
  const d = t / (1000 * 3600 * 24), y = Math.floor(d / 365), m = Math.floor((d % 365) / 30);
  if (y === 0 && m === 0) return '未滿一個月';
  return `${y > 0 ? y + ' 年 ' : ''}${m > 0 ? m + ' 個月' : ''}`.trim();
};

export default function BackendModal({
  formOpen,
  closeBackendForm,
  editingItem,
  setEditingItem,
  backendTab,
  personFormTab,
  setPersonFormTab,
  safeDepartments,
  safeEmployees,
  handleSaveItem,
  leavePolicy = {}
}) {
  if (!formOpen || !editingItem) return null;

  const allTitles = useMemo(() => {
    const titles = safeEmployees.map(p => p?.title).filter(t => typeof t === 'string' && t.trim() !== '');
    return [...new Set(titles)];
  }, [safeEmployees]);

  const addInternship = () => setEditingItem(prev => ({ ...prev, internshipPeriods: [...(prev.internshipPeriods || []), { start: '', end: '' }] }));
  const updateInternship = (idx, field, val) => setEditingItem(prev => ({ ...prev, internshipPeriods: prev.internshipPeriods.map((p, i) => i === idx ? { ...p, [field]: val } : p) }));
  const removeInternship = (idx) => setEditingItem(prev => ({ ...prev, internshipPeriods: prev.internshipPeriods.filter((_, i) => i !== idx) }));

  const addRenewContract = () => setEditingItem(prev => ({ ...prev, renewContracts: [...(prev.renewContracts || []), ''] }));
  const updateRenewContract = (idx, val) => setEditingItem(prev => ({ ...prev, renewContracts: prev.renewContracts.map((c, i) => i === idx ? val : c) }));
  const removeRenewContract = (idx) => setEditingItem(prev => ({ ...prev, renewContracts: prev.renewContracts.filter((_, i) => i !== idx) }));

  const handleConcurrentToggle = (deptId) => {
    setEditingItem(prev => {
      const isC = prev.concurrentDepts?.some(c => c.deptId === deptId);
      if (isC) return { ...prev, concurrentDepts: prev.concurrentDepts.filter(c => c.deptId !== deptId) };
      return { ...prev, concurrentDepts: [...(prev.concurrentDepts || []), { deptId, title: '' }] };
    });
  };

  const handleConcurrentTitleChange = (deptId, title) => {
    setEditingItem(prev => ({
       ...prev, 
       concurrentDepts: prev.concurrentDepts.map(c => c.deptId === deptId ? { ...c, title } : c)
    }));
  };

  const isDeptDescendant = (s, t) => { 
    let ct = safeDepartments.find(d => d.id === t); 
    const v = new Set(); 
    while (ct) { 
      if (ct.id === s) return true; 
      if (v.has(ct.id)) return false; 
      v.add(ct.id); 
      ct = safeDepartments.find(d => d.id === ct.parentId); 
    } 
    return false; 
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden max-h-[95vh] flex flex-col">
        <div className="bg-gray-50 p-4 border-b border-gray-200 flex justify-between items-center shrink-0">
          <h3 className="font-black text-gray-800 text-lg">{backendTab === 'dept' ? '部門設定' : `人員資料設定 - ${editingItem.name || '新進員工'}`}</h3>
          <button type="button" onClick={closeBackendForm} className="p-1.5 text-gray-400 hover:bg-gray-200 hover:text-gray-800 rounded-lg transition"><X size={20} /></button>
        </div>
        
        <div className="p-6 overflow-y-auto bg-white flex-1">
          <form onSubmit={handleSaveItem} className="flex flex-col gap-4 h-full">
            {backendTab === 'person' && (
              <div className="flex gap-2 border-b border-gray-200 mb-2 shrink-0 overflow-x-auto pb-1">
                <button type="button" onClick={() => setPersonFormTab('public')} className={`pb-2 px-3 text-sm font-bold border-b-2 transition-colors whitespace-nowrap ${personFormTab === 'public' ? 'border-[#C09D9B] text-[#C09D9B]' : 'border-transparent text-gray-400 hover:text-gray-700'}`}>📇 公開名片與系統權限</button>
                <button type="button" onClick={() => setPersonFormTab('private')} className={`pb-2 px-3 text-sm font-bold border-b-2 transition-colors whitespace-nowrap ${personFormTab === 'private' ? 'border-[#C09D9B] text-[#C09D9B]' : 'border-transparent text-gray-400 hover:text-gray-700'}`}>🔒 HR機密檔案</button>
                <button type="button" onClick={() => setPersonFormTab('leave')} className={`pb-2 px-3 text-sm font-bold border-b-2 transition-colors whitespace-nowrap ${personFormTab === 'leave' ? 'border-[#C09D9B] text-[#C09D9B]' : 'border-transparent text-gray-400 hover:text-gray-700'}`}>🗓️ 假別配額</button>
                <button type="button" onClick={() => setPersonFormTab('skills')} className={`pb-2 px-3 text-sm font-bold border-b-2 transition-colors whitespace-nowrap ${personFormTab === 'skills' ? 'border-[#C09D9B] text-[#C09D9B]' : 'border-transparent text-gray-400 hover:text-gray-700'}`}>⚡ 專業技能</button>
              </div>
            )}

            {backendTab === 'dept' && (
              <div className="flex flex-col gap-4">
                <InputField label="部門名稱 *" req={true} val={editingItem.name || ''} set={v => setEditingItem({...editingItem, name: v})} />
                
                <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                  <label className="block text-sm font-bold text-blue-800 mb-1 flex items-center gap-2"><Users size={16}/> 指派部門主管 (Manager)</label>
                  <p className="text-xs text-blue-600 mb-2">此主管將有權限於戰情室審核此部門員工之請假與補打卡單據。</p>
                  <select value={editingItem.managerId || ''} onChange={e => setEditingItem({...editingItem, managerId: e.target.value})} className="w-full border border-blue-200 rounded-lg p-2 outline-none font-bold">
                    <option value="">(未指派)</option>{safeEmployees.map(emp => (<option key={emp.id} value={emp.id}>{emp.name}</option>))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">隸屬上層單位</label>
                  <select value={editingItem.parentId || ''} onChange={e => setEditingItem({...editingItem, parentId: e.target.value || null})} className="w-full border border-gray-300 rounded-lg p-2 outline-none"><option value="">(最頂層決策單位)</option>{safeDepartments.filter(d => d.id !== editingItem.id && !isDeptDescendant(editingItem.id, d.id)).map(dept => (<option key={dept.id} value={dept.id}>{dept.name}</option>))}</select>
                </div>
                <div className="flex gap-4"><label className="flex items-center gap-2 cursor-pointer p-2"><input type="radio" checked={editingItem.style === 'box'} onChange={() => setEditingItem({...editingItem, style: 'box'})} className="text-[#C09D9B]" /> <span>群組白框</span></label><label className="flex items-center gap-2 cursor-pointer p-2"><input type="radio" checked={editingItem.style === 'card'} onChange={() => setEditingItem({...editingItem, style: 'card'})} className="text-[#C09D9B]" /> <span>獨立大卡片</span></label></div>
                <label className="flex items-center gap-2 cursor-pointer p-2"><input type="checkbox" checked={editingItem.isStaff || false} onChange={e => setEditingItem({...editingItem, isStaff: e.target.checked})} className="text-[#C09D9B]" /> <span className="font-bold">設為幕僚單位 (側邊橫向顯示)</span></label>
              </div>
            )}

            {backendTab === 'person' && personFormTab === 'public' && (
              <div className="flex flex-col gap-6 animate-fade-in">
                <div className="bg-blue-50/50 border border-blue-100 p-4 rounded-xl flex flex-col gap-4">
                  <h4 className="font-black text-blue-800 text-sm border-b border-blue-100 pb-2 flex items-center gap-2"><Shield size={16}/> 系統帳號與權限設定</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <InputField label="登入綁定信箱 *" req={true} type="email" val={editingItem.loginEmail || ''} set={v => setEditingItem({...editingItem, loginEmail: v})} />
                    <div><label className="block text-xs font-bold text-gray-600 mb-1">系統身分角色</label><select value={editingItem.systemRole || 'staff'} onChange={e => setEditingItem({...editingItem, systemRole: e.target.value})} className="w-full border border-blue-200 rounded-lg p-2 text-sm outline-none bg-white font-bold"><option value="staff">一般同仁</option><option value="admin" className="text-red-600 font-bold">HR 管理員</option></select></div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <InputField label="顯示暱稱 *" req={true} val={editingItem.name || ''} set={v => setEditingItem({...editingItem, name: v})} />
                  <div><label className="block text-xs font-bold text-gray-600 mb-1">隸屬主單位 *</label><select value={editingItem.deptId || ''} onChange={e => setEditingItem({...editingItem, deptId: e.target.value})} className="w-full border border-gray-300 rounded p-1.5 text-sm outline-none bg-white" required><option value="" disabled>請選擇...</option>{safeDepartments.map(dept => <option key={dept.id} value={dept.id}>{dept.name}</option>)}</select></div>
                  <div><label className="block text-xs font-bold text-gray-600 mb-1">主編制職稱</label><input list="title-options" type="text" value={editingItem.title || ''} onChange={e => setEditingItem({...editingItem, title: e.target.value})} className="w-full border border-gray-300 rounded p-1.5 text-sm outline-none" /><datalist id="title-options">{allTitles.map((t, idx) => <option key={idx} value={t} />)}</datalist></div>
                  <InputField label="崗位職級" val={editingItem.jobLevel || ''} set={v => setEditingItem({...editingItem, jobLevel: v})} />
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">兼任單位 (可複選)</label>
                  <div className="border border-gray-200 rounded-lg p-3 max-h-[160px] overflow-y-auto bg-gray-50 flex flex-col gap-3">
                    {safeDepartments.filter(d => d.id !== editingItem.deptId).map(dept => {
                      const c = (editingItem.concurrentDepts || []).find(x => x.deptId === dept.id); const isC = !!c;
                      return (
                        <div key={dept.id} className="flex flex-col gap-1 bg-white p-2 rounded border border-gray-100 shadow-sm">
                          <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-700 font-bold"><input type="checkbox" checked={isC} onChange={() => handleConcurrentToggle(dept.id)} className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500" />{dept.name}</label>
                          {isC && <input type="text" value={c.title || ''} onChange={(e) => handleConcurrentTitleChange(dept.id, e.target.value)} placeholder="兼任職稱" className="mt-1 text-sm border border-gray-300 rounded p-1.5 focus:ring-1 focus:ring-[#C09D9B] outline-none w-full" />}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {backendTab === 'person' && personFormTab === 'private' && (
              <div className="flex flex-col gap-6 animate-fade-in pb-10">
                <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                  <h4 className="font-black text-gray-800 mb-3 border-b border-gray-200 pb-2">(一) 個人訊息</h4>
                  <div className="grid grid-cols-3 gap-3">
                    <InputField label="真實姓名" val={editingItem.realName || ''} set={v => setEditingItem({...editingItem, realName: v})} />
                    <div><label className="block text-xs font-bold text-gray-600 mb-1">性別</label><select value={editingItem.gender || ''} onChange={e => setEditingItem({...editingItem, gender: e.target.value})} className="w-full border border-gray-300 rounded p-1.5 text-sm outline-none"><option value="">選擇</option><option value="男">男</option><option value="女">女</option></select></div>
                    <div><label className="block text-xs font-bold text-gray-600 mb-1">生日</label><input type="date" max="9999-12-31" value={formatDateForInput(editingItem.birthday)} onChange={e => setEditingItem({...editingItem, birthday: e.target.value})} className="w-full border border-gray-300 rounded p-1.5 text-sm outline-none" /></div>
                    <InputField label="手機號碼" val={editingItem.phone || ''} set={v => setEditingItem({...editingItem, phone: v})} />
                    <InputField label="Email" type="email" col={2} val={editingItem.email || ''} set={v => setEditingItem({...editingItem, email: v})} />
                    <InputField label="身分證號碼" col={2} val={editingItem.idNumber || ''} set={v => setEditingItem({...editingItem, idNumber: v})} />
                    <InputField label="護照號碼" val={editingItem.passportNumber || ''} set={v => setEditingItem({...editingItem, passportNumber: v})} />
                  </div>

                  <div className="h-px bg-gray-200 my-4"></div>
                  
                  <div className="grid grid-cols-3 gap-3">
                    <div><label className="block text-xs font-bold text-gray-600 mb-1">當前狀態</label><select value={editingItem.empStatus || '正職'} onChange={e => setEditingItem({...editingItem, empStatus: e.target.value})} className="w-full border border-gray-300 rounded p-1.5 text-sm outline-none"><option value="正職">正職</option><option value="試用期">試用期</option><option value="兼職">兼職</option><option value="實習">實習</option><option value="留職停薪">留職停薪</option><option value="離職">離職</option></select></div>
                    <div><label className="block text-xs font-bold text-gray-600 mb-1">工作地點</label><select value={editingItem.workLocation || '台灣'} onChange={e => setEditingItem({...editingItem, workLocation: e.target.value})} className="w-full border border-gray-300 rounded p-1.5 text-sm outline-none"><option value="台灣">台灣</option><option value="大陸">大陸</option><option value="馬來西亞">馬來西亞</option><option value="香港">香港</option><option value="其他">其他</option></select></div>
                    <div>
                      <label className="block text-xs font-bold text-[#C09D9B] mb-1">系統結算年資</label>
                      <div className="w-full border border-gray-200 bg-gray-100 text-[#C09D9B] font-black rounded p-1.5 text-sm text-center">
                        {calculateTenure(editingItem.joinDate, editingItem.militaryStart, editingItem.militaryEnd, editingItem.isOldSystem, editingItem.internshipPeriods)}
                      </div>
                    </div>
                    <div><label className="block text-xs font-bold text-gray-600 mb-1">入職時間</label><input type="date" max="9999-12-31" value={formatDateForInput(editingItem.joinDate)} onChange={e => setEditingItem({...editingItem, joinDate: e.target.value})} className="w-full border border-gray-300 rounded p-1.5 text-sm outline-none" /></div>
                    <div className="col-span-2 grid grid-cols-2 gap-2 bg-yellow-50/50 p-2 rounded border border-yellow-100">
                      <div><label className="block text-[10px] font-bold text-yellow-700 mb-1">兵役留停(起)</label><input type="date" max="9999-12-31" value={formatDateForInput(editingItem.militaryStart)} onChange={e => setEditingItem({...editingItem, militaryStart: e.target.value})} className="w-full border border-gray-300 rounded p-1 text-sm outline-none" /></div>
                      <div><label className="block text-[10px] font-bold text-yellow-700 mb-1">兵役留停(迄)</label><input type="date" max="9999-12-31" value={formatDateForInput(editingItem.militaryEnd)} onChange={e => setEditingItem({...editingItem, militaryEnd: e.target.value})} className="w-full border border-gray-300 rounded p-1 text-sm outline-none" /></div>
                    </div>
                    <div className="col-span-3 bg-white p-3 rounded border border-gray-200 mt-1">
                      <label className="flex items-center gap-2 cursor-pointer mb-2 w-max"><input type="checkbox" checked={editingItem.isOldSystem || false} onChange={e => setEditingItem({...editingItem, isOldSystem: e.target.checked})} className="w-4 h-4 text-[#C09D9B] rounded" /><span className="text-sm font-bold text-gray-700">適用舊制年資 (計算實習時數)</span></label>
                      {editingItem.isOldSystem && (
                        <div className="mt-3 flex flex-col gap-2 border-t border-dashed border-gray-200 pt-3">
                          <div className="flex justify-between items-center"><span className="text-xs font-bold text-gray-500">實習起訖紀錄</span><button type="button" onClick={addInternship} className="flex items-center gap-1 bg-gray-200 px-2 py-1 rounded text-xs font-bold"><Plus size={12}/> 新增實習</button></div>
                          {(editingItem.internshipPeriods || []).map((p, idx) => (
                            <div key={idx} className="flex items-center gap-2"><span className="text-xs font-bold text-gray-400 w-4">{idx+1}.</span><input type="date" max="9999-12-31" value={formatDateForInput(p.start)} onChange={(e) => updateInternship(idx, 'start', e.target.value)} className="flex-1 border border-gray-300 rounded p-1 text-sm outline-none" /><span className="text-gray-400 text-xs">至</span><input type="date" max="9999-12-31" value={formatDateForInput(p.end)} onChange={(e) => updateInternship(idx, 'end', e.target.value)} className="flex-1 border border-gray-300 rounded p-1 text-sm outline-none" /><button type="button" onClick={() => removeInternship(idx)} className="p-1.5 bg-red-100 text-red-600 rounded"><Minus size={14}/></button></div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="h-px bg-gray-200 my-4"></div>

                  <div className="grid grid-cols-2 gap-3">
                    <InputField label="畢業院校" val={editingItem.school || ''} set={v => setEditingItem({...editingItem, school: v})} />
                    <InputField label="系所" val={editingItem.major || ''} set={v => setEditingItem({...editingItem, major: v})} />
                    <InputField label="戶籍地址" col={2} val={editingItem.regAddress || ''} set={v => setEditingItem({...editingItem, regAddress: v})} />
                    <InputField label="通訊地址" col={2} val={editingItem.commAddress || ''} set={v => setEditingItem({...editingItem, commAddress: v})} />
                    <InputField label="緊急聯絡人" val={editingItem.emergencyContact || ''} set={v => setEditingItem({...editingItem, emergencyContact: v})} />
                    <InputField label="緊急聯絡電話" val={editingItem.emergencyPhone || ''} set={v => setEditingItem({...editingItem, emergencyPhone: v})} />
                  </div>

                  {editingItem.empStatus === '離職' && (
                    <div className="mt-4 bg-red-50 p-3 rounded border border-red-100 grid grid-cols-3 gap-3">
                      <div><label className="block text-xs font-bold text-red-600 mb-1">離職日期</label><input type="date" max="9999-12-31" value={formatDateForInput(editingItem.leaveDate)} onChange={e => setEditingItem({...editingItem, leaveDate: e.target.value})} className="w-full border border-gray-300 rounded p-1 text-sm outline-none" /></div>
                      <InputField label="離職類型" val={editingItem.leaveType || ''} set={v => setEditingItem({...editingItem, leaveType: v})} />
                      <InputField label="離職原因" col={3} val={editingItem.leaveReason || ''} set={v => setEditingItem({...editingItem, leaveReason: v})} />
                    </div>
                  )}
                </div>

                <div className="bg-green-50 p-4 rounded-xl border border-green-200">
                  <h4 className="font-black text-green-800 mb-3 border-b border-green-200 pb-2">(二) 財務與合約</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="col-span-2 grid grid-cols-2 gap-3">
                      <InputField label="銀行帳號" val={editingItem.bankAccount || ''} set={v => setEditingItem({...editingItem, bankAccount: v})} />
                      <InputField label="開戶行" val={editingItem.bankName || ''} set={v => setEditingItem({...editingItem, bankName: v})} />
                    </div>
                    <InputField label="支付寶帳號" val={editingItem.alipay || ''} set={v => setEditingItem({...editingItem, alipay: v})} />
                    <InputField label="社保公積金繳納地" val={editingItem.socialSecurityLoc || ''} set={v => setEditingItem({...editingItem, socialSecurityLoc: v})} />
                    <InputField label="合約主體" col={2} val={editingItem.contractEntity || ''} set={v => setEditingItem({...editingItem, contractEntity: v})} />
                    
                    <div className="col-span-2 grid grid-cols-2 gap-3 mt-2">
                      <InputField label="入職合約期間" val={editingItem.initContractPeriod || ''} set={v => setEditingItem({...editingItem, initContractPeriod: v})} />
                      <InputField label="外包合約期間" val={editingItem.outsourceContractPeriod || ''} set={v => setEditingItem({...editingItem, outsourceContractPeriod: v})} />
                    </div>

                    <div className="col-span-2 mt-2">
                      <div className="flex justify-between items-end mb-2">
                        <label className="block text-xs font-bold text-green-800">續簽紀錄</label>
                        <button type="button" onClick={addRenewContract} className="flex items-center gap-1 bg-green-600 text-white px-2 py-1 rounded text-xs"><Plus size={12}/> 新增</button>
                      </div>
                      <div className="flex flex-col gap-2">
                        {(editingItem.renewContracts || []).map((c, idx) => (
                          <div key={idx} className="flex items-center gap-2"><span className="text-xs font-bold text-gray-400 w-4">{idx+1}.</span><input type="text" value={c} onChange={(e) => updateRenewContract(idx, e.target.value)} className="flex-1 border border-gray-300 rounded p-1 text-sm outline-none" /><button type="button" onClick={() => removeRenewContract(idx)} className="p-1.5 bg-red-100 text-red-600 rounded"><Minus size={14}/></button></div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {backendTab === 'person' && personFormTab === 'leave' && (
              <div className="flex flex-col gap-4 animate-fade-in">
                <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100">
                  <h4 className="font-black text-blue-800 text-sm mb-1 flex items-center gap-2">🗓️ 假別配額管理</h4>
                  <p className="text-xs text-blue-600 mb-4">為此員工設定各假別的年度配額。灰色建議值僅供參考，請依實際需求填入。</p>
                  <div className="flex flex-col gap-3">
                    {Object.entries(leavePolicy).map(([typeName, policy]) => {
                      const quota = (editingItem.leaveQuota || {})[typeName] || {};
                      const isEnabled = quota.enabled !== false && quota.total !== undefined && quota.total !== null;
                      return (
                        <div key={typeName} className={`p-3 rounded-xl border transition ${isEnabled ? 'bg-white border-blue-200 shadow-sm' : 'bg-gray-50 border-gray-200'}`}>
                          <div className="flex items-center justify-between mb-2">
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input 
                                type="checkbox" 
                                checked={isEnabled}
                                onChange={e => {
                                  const newQuota = { ...(editingItem.leaveQuota || {}) };
                                  if (e.target.checked) {
                                    newQuota[typeName] = { ...(newQuota[typeName] || {}), enabled: true, total: newQuota[typeName]?.total || 0, used: newQuota[typeName]?.used || 0 };
                                  } else {
                                    newQuota[typeName] = { ...(newQuota[typeName] || {}), enabled: false };
                                  }
                                  setEditingItem({ ...editingItem, leaveQuota: newQuota });
                                }}
                                className="w-4 h-4 text-blue-500 rounded"
                              />
                              <span className={`font-bold text-sm ${isEnabled ? 'text-gray-800' : 'text-gray-400'}`}>{typeName}</span>
                              {policy.unpaid && <span className="text-[10px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded font-bold">無薪</span>}
                              {policy.fromOvertime && <span className="text-[10px] bg-purple-100 text-purple-600 px-1.5 py-0.5 rounded font-bold">加班產生</span>}
                            </label>
                            <span className="text-[10px] text-gray-400 italic">{policy.note}</span>
                          </div>
                          {isEnabled && (
                            <div className="grid grid-cols-3 gap-3 mt-2">
                              <div>
                                <label className="text-[10px] font-bold text-gray-500 block mb-0.5">年度配額 ({policy.unit === 'hours' ? '小時' : '天'})</label>
                                <input 
                                  type="number" 
                                  step={policy.minUnit || 0.5}
                                  min="0"
                                  value={quota.total ?? ''} 
                                  onChange={e => {
                                    const newQuota = { ...(editingItem.leaveQuota || {}) };
                                    newQuota[typeName] = { ...newQuota[typeName], total: parseFloat(e.target.value) || 0 };
                                    setEditingItem({ ...editingItem, leaveQuota: newQuota });
                                  }}
                                  className="w-full border border-gray-300 rounded p-1.5 text-sm outline-none font-bold text-center"
                                />
                              </div>
                              <div>
                                <label className="text-[10px] font-bold text-gray-500 block mb-0.5">已使用</label>
                                <div className="w-full border border-gray-200 bg-gray-100 rounded p-1.5 text-sm text-center font-bold text-gray-600">
                                  {quota.used || 0}
                                </div>
                              </div>
                              <div>
                                <label className="text-[10px] font-bold text-gray-500 block mb-0.5">剩餘</label>
                                <div className={`w-full border rounded p-1.5 text-sm text-center font-black ${((quota.total || 0) - (quota.used || 0)) <= 0 ? 'bg-red-50 text-red-600 border-red-200' : 'bg-green-50 text-green-700 border-green-200'}`}>
                                  {((quota.total || 0) - (quota.used || 0)).toFixed(1)}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {backendTab === 'person' && personFormTab === 'skills' && (
              <div className="flex flex-col gap-4 animate-fade-in bg-blue-50 p-4 rounded-xl border border-blue-100 h-full">
                <div className="grid grid-cols-2 gap-4">
                  <InputField label="魔力環等級" val={editingItem.magicLevel || ''} set={v => setEditingItem({...editingItem, magicLevel: v})} />
                  <InputField label="總魔力值 ⚡" type="number" val={editingItem.magicPoints || ''} set={v => setEditingItem({...editingItem, magicPoints: v})} />
                </div>
                <div className="mt-4">
                  <label className="block text-sm font-bold text-blue-800 mb-2 flex items-center gap-1">能力 TAG 徽章 <span className="text-xs font-normal text-blue-600 ml-2">(準備中 - 待串接 Lin 系統)</span></label>
                  <div className="bg-white/50 border border-blue-200 border-dashed rounded-lg p-4 min-h-[100px] flex items-center justify-center cursor-not-allowed">
                    <span className="text-blue-400 font-bold flex items-center gap-2"><Lock size={16}/> 系統整合中，敬請期待</span>
                  </div>
                </div>
              </div>
            )}

            <div className="mt-auto pt-4 border-t border-gray-100 flex justify-end gap-3 shrink-0 bg-white">
              <button type="button" onClick={closeBackendForm} className="px-5 py-2.5 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg font-bold transition">取消</button>
              <button type="submit" className="px-5 py-2.5 text-white bg-gray-800 hover:bg-black rounded-lg font-bold transition flex items-center gap-2 shadow-lg"><Check size={18}/> 儲存並更新</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
