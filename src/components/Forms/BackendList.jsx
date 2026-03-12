import React, { useState } from 'react';
import { Users, Briefcase, Search, Edit, Plus, X } from 'lucide-react';

export default function BackendList({
  safeDepartments,
  safeEmployees,
  setEditingItem,
  setIsFormOpen,
  backendTab,
  setBackendTab,
  setShowBackend
}) {
  const [searchTerm, setSearchTerm] = useState('');

  const getEmptyPersonData = () => ({
    id: `emp_${Date.now()}`, name: '', title: '', deptId: safeDepartments[0]?.id || '', jobLevel: '', concurrentDepts: [], loginEmail: '', systemRole: 'staff',
    enablePunch: true, workStartTime: '09:30', workEndTime: '18:30', flexMinutes: 30,
    realName: '', gender: '', birthday: '', phone: '', email: '', idNumber: '', passportNumber: '', empStatus: '正職',
    joinDate: '', militaryStart: '', militaryEnd: '', workLocation: '台灣', school: '', major: '', isOldSystem: false, internshipPeriods: [],
    regAddress: '', commAddress: '', emergencyContact: '', emergencyPhone: '', leaveDate: '', leaveReason: '', leaveType: '',
    bankAccount: '', bankName: '', alipay: '', contractEntity: '', socialSecurityLoc: '', initContractPeriod: '', outsourceContractPeriod: '', renewContracts: [],
    magicLevel: '', magicPoints: ''
  });

  const handleEditPerson = (emp) => {
    setBackendTab('person');
    setEditingItem({ ...emp });
    setIsFormOpen(true);
  };

  const handleEditDept = (dept) => {
    setBackendTab('dept');
    setEditingItem({ ...dept });
    setIsFormOpen(true);
  };

  const filteredEmployees = safeEmployees.filter(e => 
    (e.name || '').includes(searchTerm) || 
    (e.title || '').includes(searchTerm) || 
    (e.loginEmail || '').includes(searchTerm)
  );

  const filteredDepts = safeDepartments.filter(d => 
    (d.name || '').includes(searchTerm)
  );

  return (
    <div className="absolute inset-0 bg-white z-[60] flex flex-col overflow-hidden animate-fade-in shadow-2xl rounded-l-3xl">
      <div className="p-6 border-b border-gray-200 flex justify-between items-center shrink-0 shadow-sm z-10 bg-white">
        <h2 className="text-2xl font-black text-gray-800">資料庫後臺</h2>
        <button onClick={() => setShowBackend(false)} className="w-10 h-10 flex items-center justify-center bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-full transition"><X size={24}/></button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 bg-gray-50 flex flex-col gap-6">
        <div className="flex justify-between items-center">
          <div className="flex gap-2 p-1 bg-gray-200 rounded-xl w-max">
            <button onClick={() => setBackendTab('person')} className={`px-6 py-2 rounded-lg font-bold text-sm transition ${backendTab === 'person' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>人員花名冊</button>
            <button onClick={() => setBackendTab('dept')} className={`px-6 py-2 rounded-lg font-bold text-sm transition ${backendTab === 'dept' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>部門組織表</button>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="搜尋名稱..." className="pl-10 pr-4 py-2 border border-gray-300 rounded-xl text-sm outline-none w-64 focus:ring-2 focus:ring-[#C09D9B]" />
            </div>
            {backendTab === 'person' ? (
              <button onClick={() => { setEditingItem(getEmptyPersonData()); setIsFormOpen(true); }} className="flex items-center gap-2 bg-[#C09D9B] text-white px-4 py-2 rounded-xl text-sm font-bold shadow hover:bg-pink-400 transition"><Plus size={16}/> 新增人員</button>
            ) : (
              <button onClick={() => { setEditingItem({ id: `dept_${Date.now()}`, name: '', parentId: null, style: 'box', isStaff: false, managerId: '' }); setIsFormOpen(true); }} className="flex items-center gap-2 bg-[#C09D9B] text-white px-4 py-2 rounded-xl text-sm font-bold shadow hover:bg-pink-400 transition"><Plus size={16}/> 新增部門</button>
            )}
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden flex-1 flex flex-col">
          {backendTab === 'person' && (
            <table className="w-full text-left border-collapse text-sm">
              <thead className="bg-gray-50 text-gray-600 font-bold sticky top-0 shadow-sm">
                <tr>
                  <th className="p-4 border-b">名稱</th>
                  <th className="p-4 border-b">職稱</th>
                  <th className="p-4 border-b">歸屬部門</th>
                  <th className="p-4 border-b">信箱帳號</th>
                  <th className="p-4 border-b">權限</th>
                  <th className="p-4 border-b w-24 text-center">操作</th>
                </tr>
              </thead>
              <tbody>
                {filteredEmployees.length > 0 ? filteredEmployees.map(emp => {
                  const d = safeDepartments.find(x => x.id === emp.deptId);
                  return (
                    <tr key={emp.id} className="hover:bg-blue-50/30 border-b border-gray-100 transition">
                      <td className="p-4 font-black flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gray-200 overflow-hidden flex items-center justify-center shadow-sm shrink-0">
                          {emp.avatarUrl ? <img src={emp.avatarUrl} className="w-full h-full object-cover" alt="" /> : <span className="text-gray-400 font-bold">{(emp.name || ' ').charAt(0)}</span>}
                        </div>
                        {emp.name}
                      </td>
                      <td className="p-4 text-gray-600">{emp.title}</td>
                      <td className="p-4 text-gray-600"><span className="bg-gray-100 px-2 py-1 rounded text-xs font-bold text-gray-500">{d ? d.name : '無'}</span></td>
                      <td className="p-4 text-gray-500">{emp.loginEmail || '-'}</td>
                      <td className="p-4"><span className={`px-2 py-1 rounded text-xs font-bold ${emp.systemRole === 'admin' ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-600'}`}>{emp.systemRole === 'admin' ? '管理員' : '一般'}</span></td>
                      <td className="p-4 text-center"><button onClick={() => handleEditPerson(emp)} className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition"><Edit size={16}/></button></td>
                    </tr>
                  )
                }) : <tr><td colSpan="6" className="p-8 text-center text-gray-400 font-bold">沒有找到資料</td></tr>}
              </tbody>
            </table>
          )}
          {backendTab === 'dept' && (
            <table className="w-full text-left border-collapse text-sm">
              <thead className="bg-gray-50 text-gray-600 font-bold sticky top-0 shadow-sm">
                <tr>
                  <th className="p-4 border-b">部門名稱</th>
                  <th className="p-4 border-b">上層單位</th>
                  <th className="p-4 border-b">編制人數</th>
                  <th className="p-4 border-b">主管</th>
                  <th className="p-4 border-b">卡片樣式</th>
                  <th className="p-4 border-b w-24 text-center">操作</th>
                </tr>
              </thead>
              <tbody>
                {filteredDepts.length > 0 ? filteredDepts.map(dept => {
                  const m = dept.managerId ? safeEmployees.find(e => e.id === dept.managerId) : null;
                  const p = dept.parentId ? safeDepartments.find(d => d.id === dept.parentId) : null;
                  const ec = safeEmployees.filter(e => e.deptId === dept.id).length;
                  return (
                    <tr key={dept.id} className="hover:bg-blue-50/30 border-b border-gray-100 transition">
                      <td className="p-4 font-black text-gray-800">{dept.name} {dept.isStaff && <span className="ml-2 bg-purple-100 text-purple-600 text-[10px] px-1.5 py-0.5 rounded font-bold">幕僚</span>}</td>
                      <td className="p-4 text-gray-600">{p ? p.name : '-'}</td>
                      <td className="p-4 text-gray-600"><span className="bg-gray-100 px-2 py-1 rounded text-xs font-bold text-gray-500">{ec} 人</span></td>
                      <td className="p-4 text-gray-600">{m ? m.name : <span className="text-gray-400">-</span>}</td>
                      <td className="p-4 text-gray-500">{dept.style === 'box' ? '群組白框' : '獨立卡片'}</td>
                      <td className="p-4 text-center"><button onClick={() => handleEditDept(dept)} className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition"><Edit size={16}/></button></td>
                    </tr>
                  )
                }) : <tr><td colSpan="6" className="p-8 text-center text-gray-400 font-bold">沒有找到資料</td></tr>}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
