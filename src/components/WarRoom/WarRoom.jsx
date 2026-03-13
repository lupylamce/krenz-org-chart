import React, { useState } from 'react';
import { 
  CalendarDays, Settings, FileText, Search, 
  ChevronRight, CheckCircle2, XCircle, FileClock, X 
} from 'lucide-react';
import { getTodayString, getTimeString } from '../../utils/dateHelpers';
import { calculateAttendanceStats } from '../../utils/attendance';
import InputField from '../common/InputField';
import AttendanceCalendar from '../Dashboard/AttendanceCalendar';

export default function WarRoom({
  isHRAdmin,
  currentEmp,
  safeDepartments,
  applications,
  attendanceLogs,
  sortedWarRoomEmps,
  handleApproveApplication
}) {
  const [warRoomTab, setWarRoomTab] = useState('daily');
  const [warRoomDate, setWarRoomDate] = useState(getTodayString());
  const [approvalFilter, setApprovalFilter] = useState({ search: '', type: 'all', status: 'pending' });
  const [selectedAppDetail, setSelectedAppDetail] = useState(null);
  const [attSettingItem, setAttSettingItem] = useState(null);
  const [selectedEmpCalendar, setSelectedEmpCalendar] = useState(null);

  const filteredApps = applications.filter(a => {
    if (!isHRAdmin) { 
      const d = safeDepartments.find(x => x.id === a.deptId); 
      if (!d || d.managerId !== currentEmp?.id) return false; 
    }
    if (approvalFilter.type !== 'all' && a.type !== approvalFilter.type) return false;
    if (approvalFilter.status !== 'all') { 
      if (approvalFilter.status === 'pending') { 
        if (a.status !== 'pending_manager' && a.status !== 'pending_hr') return false; 
      } else if (a.status !== approvalFilter.status) return false; 
    }
    if (approvalFilter.search) { 
      const k = approvalFilter.search.toLowerCase(); 
      if (!a.applicantName.toLowerCase().includes(k) && !(a.reason || '').toLowerCase().includes(k)) return false; 
    }
    return true;
  });

  const pendingCount = applications.filter(a => {
    if (a.status === 'approved' || a.status === 'rejected') return false;
    if (isHRAdmin) return true; 
    const d = safeDepartments.find(x => x.id === a.deptId);
    return d && d.managerId === currentEmp?.id && a.status === 'pending_manager';
  }).length;

  const handleSaveAttSetting = (e) => {
    e.preventDefault();
    // In old code this updated cloud data. We pass a handler or handle here.
    // For simplicity, this needs `updateCloudData`, which we will pass as prop.
  };

  return (
    <div className="h-full flex flex-col bg-gray-50 relative">
      <div className="bg-white border-b border-gray-200 flex shrink-0">
        <button onClick={() => setWarRoomTab('daily')} className={`px-6 py-4 font-bold text-sm transition border-b-4 ${warRoomTab === 'daily' ? 'border-[#C09D9B] text-[#C09D9B] bg-pink-50/30' : 'border-transparent text-gray-500 hover:bg-gray-50'}`}>📊 每日戰情</button>
        <button onClick={() => setWarRoomTab('approvals')} className={`px-6 py-4 font-bold text-sm transition border-b-4 flex items-center gap-2 ${warRoomTab === 'approvals' ? 'border-[#C09D9B] text-[#C09D9B] bg-pink-50/30' : 'border-transparent text-gray-500 hover:bg-gray-50'}`}>📝 簽核中心 {pendingCount > 0 && <span className="bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">{pendingCount}</span>}</button>
      </div>

      {warRoomTab === 'daily' && (
        <div className="flex-1 flex flex-col overflow-hidden bg-white">
          <div className="p-4 md:p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50 shrink-0">
            <div><h3 className="text-xl font-black text-gray-800 flex items-center gap-2"><CalendarDays className="text-blue-500" /> 每日戰情室</h3><p className="text-gray-500 text-xs mt-1">結合請假紀錄與打卡狀況之最終考勤判定</p></div>
            <div className="flex items-center gap-3 bg-white p-2 rounded-lg shadow-sm border border-gray-200"><span className="font-bold text-sm text-gray-600 ml-2">查詢日期：</span><input type="date" value={warRoomDate} onChange={e => setWarRoomDate(e.target.value)} className="border-none outline-none font-bold text-gray-800 cursor-pointer" /></div>
          </div>
          <div className="flex-1 overflow-auto p-4 md:p-6">
            <table className="w-full text-left border-collapse bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <thead className="bg-gray-800 text-white text-sm whitespace-nowrap">
                <tr><th className="p-4 font-bold">部門</th><th className="p-4 font-bold">姓名</th><th className="p-4 font-bold text-center">網頁打卡</th><th className="p-4 font-bold text-center">表定區間(+緩衝)</th><th className="p-4 font-bold text-center">實際上班</th><th className="p-4 font-bold text-center">實際下班</th><th className="p-4 font-bold text-center">系統判定</th><th className="p-4 font-bold text-center">操作</th></tr>
              </thead>
              <tbody className="text-sm">
                {sortedWarRoomEmps.map(emp => {
                  const deptName = safeDepartments.find(d => d.id === emp.deptId)?.name || '未知';
                  const record = attendanceLogs[emp.id]?.[warRoomDate] || {};
                  const stats = calculateAttendanceStats(emp, record, warRoomDate);
                  const approvedLeave = applications.find(a => a.applicantId === emp.id && a.type === 'leave' && (a.status === 'approved' || a.status === 'pending_hr') && a.startDate <= warRoomDate && a.endDate >= warRoomDate);

                  let finalStatus = stats.status;
                  let finalColor = stats.sColor;

                  if (emp.enablePunch === false) {
                    finalStatus = '外部考勤'; finalColor = 'bg-blue-50 text-blue-600 border border-blue-200';
                  } else if (approvedLeave) {
                    finalStatus = `🔵 休假 (${approvedLeave.leaveType})`; finalColor = 'bg-blue-100 text-blue-800 font-bold';
                  }

                  return (
                    <tr key={emp.id} className="border-b border-gray-100 hover:bg-gray-50 transition">
                      <td className="p-4 text-gray-500 font-bold">{deptName}</td>
                      <td className="p-4 text-gray-800 font-black">{emp.name}</td>
                      <td className="p-4 text-center">{emp.enablePunch === false ? <span className="text-gray-400 text-xs">停用</span> : <span className="text-emerald-600 font-bold text-xs">啟用</span>}</td>
                      <td className="p-4 text-center text-xs text-gray-400 font-mono"><div>{emp.workStartTime || '09:30'}~{emp.workEndTime || '18:30'}</div><div>(+{emp.flexMinutes || 0}m)</div></td>
                      <td className="p-4 text-center font-bold text-gray-800">{getTimeString(record.in) || '-'}{stats.lateMins > 0 && !approvedLeave && emp.enablePunch !== false && <div className="mt-1 text-[10px] text-red-600 bg-red-50 border border-red-100 rounded px-1 w-max mx-auto">遲到 {stats.lateMins} 分</div>}</td>
                      <td className="p-4 text-center font-bold text-gray-800">{getTimeString(record.out) || '-'}{stats.earlyMins > 0 && !approvedLeave && emp.enablePunch !== false && <div className="mt-1 text-[10px] text-orange-600 bg-orange-50 border border-orange-100 rounded px-1 w-max mx-auto">早退 {stats.earlyMins} 分</div>}</td>
                      <td className="p-4 text-center"><span className={`px-3 py-1 rounded-full text-[10px] ${finalColor}`}>{finalStatus}</span></td>
                      <td className="p-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button onClick={() => setSelectedEmpCalendar(emp)} className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition" title="觀看考勤月曆"><CalendarDays size={18} /></button>
                          <button onClick={() => setAttSettingItem(emp)} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition" title="考勤設定"><Settings size={18} /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {warRoomTab === 'approvals' && (
        <div className="flex-1 flex flex-col overflow-hidden bg-white relative">
          <div className="p-4 md:p-6 border-b border-gray-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-gray-50 shrink-0">
            <div><h3 className="text-xl font-black text-gray-800 flex items-center gap-2"><FileText className="text-[#C09D9B]" /> 簽核中心</h3><p className="text-gray-500 text-xs mt-1">點擊單據列展開詳情與審核操作</p></div>
            <div className="flex items-center gap-2 w-full md:w-auto">
              <div className="relative flex-1 md:w-48"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" /><input type="text" placeholder="搜尋姓名或事由..." value={approvalFilter.search} onChange={e => setApprovalFilter({ ...approvalFilter, search: e.target.value })} className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-[#C09D9B]" /></div>
              <select value={approvalFilter.type} onChange={e => setApprovalFilter({ ...approvalFilter, type: e.target.value })} className="py-2 px-3 text-sm border border-gray-300 rounded-lg outline-none bg-white font-bold text-gray-600"><option value="all">所有單據</option><option value="leave">請假單</option><option value="punch">補打卡單</option></select>
              <select value={approvalFilter.status} onChange={e => setApprovalFilter({ ...approvalFilter, status: e.target.value })} className="py-2 px-3 text-sm border border-gray-300 rounded-lg outline-none bg-white font-bold text-gray-600"><option value="all">所有狀態</option><option value="pending">待處理</option><option value="approved">已建檔</option><option value="rejected">已駁回</option></select>
            </div>
          </div>
          
          <div className="flex-1 overflow-auto p-4 md:p-6">
            <table className="w-full text-left border-collapse bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <thead className="bg-gray-100 text-gray-600 text-sm"><tr><th className="p-3 font-bold">申請人</th><th className="p-3 font-bold">單據類型</th><th className="p-3 font-bold">申請細節</th><th className="p-3 font-bold">事由摘要</th><th className="p-3 font-bold text-center">當前狀態</th><th className="p-3"></th></tr></thead>
              <tbody className="text-sm">
                {filteredApps.length > 0 ? filteredApps.map(app => {
                  const deptName = safeDepartments.find(d => d.id === app.deptId)?.name || '';
                  return (
                    <tr key={app.docId} onClick={() => setSelectedAppDetail(app)} className="border-b border-gray-100 hover:bg-blue-50 transition cursor-pointer group">
                      <td className="p-3"><div className="font-black text-gray-800">{app.applicantName}</div><div className="text-xs text-gray-500">{deptName}</div></td>
                      <td className="p-3 font-bold text-gray-600">{app.type === 'leave' ? '請假單' : '補打卡單'}</td>
                      <td className="p-3 text-xs text-gray-600 font-mono">
                        {app.type === 'leave' ? (
                          <div className="flex flex-col gap-0.5"><span className="text-blue-600 font-bold font-sans">[{app.leaveType}]</span><span>{app.startDate} {app.startHour || '00'}:00</span><span>{app.endDate} {app.endHour || '23'}:00</span></div>
                        ) : (
                          <div className="flex flex-col gap-0.5"><span className="text-orange-600 font-bold font-sans">[{app.punchType === 'in' ? '上班' : '下班'}]</span><span>{app.date}</span><span>{app.time}</span></div>
                        )}
                      </td>
                      <td className="p-3 text-xs text-gray-500 max-w-[200px] truncate" title={app.reason}>{app.reason}</td>
                      <td className="p-3 text-center">
                        <span className={`px-2 py-1 rounded text-[10px] font-bold ${app.status === 'approved' ? 'bg-green-100 text-green-700' : app.status === 'rejected' ? 'bg-red-100 text-red-700' : app.status === 'pending_hr' ? 'bg-blue-100 text-blue-700' : 'bg-yellow-100 text-yellow-700'}`}>
                          {app.status === 'approved' ? '已建檔' : app.status === 'rejected' ? '已駁回' : app.status === 'pending_manager' ? '待主管簽核' : '待 HR 覆核'}
                        </span>
                      </td>
                      <td className="p-3 text-right text-gray-300 group-hover:text-blue-500"><ChevronRight size={20} /></td>
                    </tr>
                  );
                }) : <tr><td colSpan="6" className="text-center py-8 text-gray-400 font-bold">沒有符合條件的申請單</td></tr>}
              </tbody>
            </table>
          </div>

          {selectedAppDetail && (
            <div className="absolute inset-0 bg-white/95 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
              <div className="bg-white border border-gray-200 rounded-2xl shadow-2xl w-full max-w-lg flex flex-col overflow-hidden max-h-[90vh]">
                <div className="bg-gray-50 p-4 border-b border-gray-200 flex justify-between items-center shrink-0">
                  <h3 className="font-black text-gray-800 text-lg flex items-center gap-2">
                    {selectedAppDetail.type === 'leave' ? <CalendarDays className="text-blue-500" /> : <FileClock className="text-orange-500" />} 申請單詳情
                  </h3>
                  <button onClick={() => setSelectedAppDetail(null)} className="p-1.5 hover:bg-gray-200 rounded-lg text-gray-500 transition"><X size={20} /></button>
                </div>
                
                <div className="p-6 flex flex-col gap-4 overflow-y-auto">
                  <div className="flex items-center gap-4 bg-gray-50 p-4 rounded-xl border border-gray-100">
                    <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center text-gray-600 font-black text-xl shrink-0">{selectedAppDetail.applicantName.charAt(0)}</div>
                    <div>
                      <h4 className="font-black text-gray-800 text-lg">{selectedAppDetail.applicantName}</h4>
                      <p className="text-sm text-gray-500">{safeDepartments.find(d => d.id === selectedAppDetail.deptId)?.name || '未知部門'}</p>
                    </div>
                    <div className="ml-auto text-right">
                      <span className={`px-3 py-1.5 rounded-lg text-xs font-black tracking-wide block mb-1 ${selectedAppDetail.status === 'approved' ? 'bg-green-100 text-green-700 border border-green-200' : selectedAppDetail.status === 'rejected' ? 'bg-red-100 text-red-700 border border-red-200' : selectedAppDetail.status === 'pending_hr' ? 'bg-blue-100 text-blue-700 border border-blue-200' : 'bg-yellow-100 text-yellow-700 border border-yellow-200'}`}>
                        {selectedAppDetail.status === 'approved' ? '已建檔 (HR)' : selectedAppDetail.status === 'rejected' ? '已駁回' : selectedAppDetail.status === 'pending_manager' ? '待主管簽核' : '待 HR 覆核'}
                      </span>
                      {selectedAppDetail.type === 'leave' && (selectedAppDetail.status === 'approved' || selectedAppDetail.status === 'pending_hr') && <span className="text-[10px] text-blue-600 font-bold">💡 假單已生效</span>}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="flex flex-col gap-1"><span className="text-gray-400 font-bold text-xs">單據類型</span><span className="font-bold text-gray-800">{selectedAppDetail.type === 'leave' ? '請假單' : '補打卡單'}</span></div>
                    <div className="flex flex-col gap-1"><span className="text-gray-400 font-bold text-xs">{selectedAppDetail.type === 'leave' ? '請假類別' : '補卡類別'}</span><span className={`font-bold ${selectedAppDetail.type === 'leave' ? 'text-blue-600' : 'text-orange-600'}`}>{selectedAppDetail.type === 'leave' ? selectedAppDetail.leaveType : selectedAppDetail.punchType === 'in' ? '補上班卡' : '補下班卡'}</span></div>
                    <div className="col-span-2 flex flex-col gap-1 border-t border-gray-100 pt-4"><span className="text-gray-400 font-bold text-xs">申請時間範圍</span><span className="font-mono text-gray-800 font-bold">{selectedAppDetail.type === 'leave' ? `${selectedAppDetail.startDate} ${selectedAppDetail.startHour || '00'}:00  至  ${selectedAppDetail.endDate} ${selectedAppDetail.endHour || '23'}:00` : `${selectedAppDetail.date} ${selectedAppDetail.time}`}</span></div>
                    <div className="col-span-2 flex flex-col gap-1 mt-2"><span className="text-gray-400 font-bold text-xs">事由 / 備註</span><div className="bg-gray-50 border border-gray-200 p-3 rounded-lg text-gray-700 leading-relaxed whitespace-pre-wrap min-h-[80px]">{selectedAppDetail.reason}</div></div>
                  </div>

                  <div className="col-span-2 flex flex-col gap-2 mt-2 pt-4 border-t border-gray-100">
                    <span className="text-gray-400 font-bold text-xs">審核歷程</span>
                    <ul className="flex flex-col gap-3 text-xs">
                      <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-gray-300" /><span className="text-gray-500 font-mono">送出申請：{new Date(selectedAppDetail.createdAt).toLocaleString()}</span></li>
                      {selectedAppDetail.managerApprovedBy && <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-blue-500" /><span className="text-gray-700 font-bold">主管核准 ({selectedAppDetail.managerApprovedBy}) <span className="font-normal font-mono text-gray-500 ml-1">{new Date(selectedAppDetail.managerApprovedAt).toLocaleString()}</span></span></li>}
                      {selectedAppDetail.hrApprovedBy && <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-emerald-500" /><span className="text-gray-700 font-bold">HR 歸檔 ({selectedAppDetail.hrApprovedBy}) <span className="font-normal font-mono text-gray-500 ml-1">{new Date(selectedAppDetail.hrApprovedAt).toLocaleString()}</span></span></li>}
                      {selectedAppDetail.rejectedBy && <li className="flex items-center gap-2"><XCircle size={14} className="text-red-500" /><span className="text-red-600 font-bold">已駁回 ({selectedAppDetail.rejectedBy}) <span className="font-normal font-mono text-gray-500 ml-1">{new Date(selectedAppDetail.rejectedAt).toLocaleString()}</span></span></li>}
                    </ul>
                  </div>

                  {selectedAppDetail.status.includes('pending') && (
                    <div className="mt-4 pt-4 border-t border-gray-100 flex flex-col gap-3">
                      <p className="text-xs text-gray-400 font-bold text-center mb-1">審核操作區</p>
                      <div className="flex gap-3">
                        <button onClick={() => handleApproveApplication(selectedAppDetail, 'reject')} className="flex-1 py-3 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded-xl font-black transition text-sm">駁回申請</button>
                        {safeDepartments.find(d => d.id === selectedAppDetail.deptId)?.managerId === currentEmp?.id && selectedAppDetail.status === 'pending_manager' && <button onClick={() => handleApproveApplication(selectedAppDetail, 'manager_approve')} className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-black shadow-md transition text-sm">主管核准送出</button>}
                        {isHRAdmin && selectedAppDetail.status === 'pending_hr' && <button onClick={() => handleApproveApplication(selectedAppDetail, 'hr_approve')} className="flex-1 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-black shadow-md transition text-sm">HR 覆核歸檔</button>}
                        {isHRAdmin && selectedAppDetail.status === 'pending_manager' && <button onClick={() => handleApproveApplication(selectedAppDetail, 'hr_approve')} className="flex-1 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-black shadow-md transition text-sm" title="無視主管流程，強制通過">天神覆核 (強制通過)</button>}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {attSettingItem && (
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden flex flex-col">
            <div className="bg-gray-50 p-4 border-b border-gray-200 flex justify-between items-center">
              <h3 className="font-black text-gray-800 flex items-center gap-2"><Settings size={18} className="text-blue-600" /> 考勤設定 - {attSettingItem.name}</h3>
              <button onClick={() => setAttSettingItem(null)} className="text-gray-400 hover:text-gray-800"><X size={20} /></button>
            </div>
            <form onSubmit={handleSaveAttSetting} className="p-6 flex flex-col gap-5 bg-white">
              <label className={`flex items-start gap-3 p-4 border rounded-xl cursor-pointer transition ${attSettingItem.enablePunch !== false ? 'border-emerald-200 bg-emerald-50/30' : 'border-gray-200 bg-gray-50'}`}>
                <input type="checkbox" checked={attSettingItem.enablePunch !== false} onChange={e => setAttSettingItem({ ...attSettingItem, enablePunch: e.target.checked })} className="mt-1 w-5 h-5 text-emerald-500 rounded focus:ring-emerald-500" />
                <div className="flex flex-col">
                  <span className={`font-bold ${attSettingItem.enablePunch !== false ? 'text-emerald-800' : 'text-gray-600'}`}>開放網頁打卡功能</span>
                  <span className="text-xs text-gray-500 mt-1">若員工使用 Apollo EX 或打卡機，請取消勾選。取消後該員工的儀表板將隱藏打卡介面。</span>
                </div>
              </label>
              <div className={`flex flex-col gap-4 transition-all duration-300 ${attSettingItem.enablePunch === false ? 'opacity-30 pointer-events-none grayscale' : ''}`}>
                <div className="grid grid-cols-2 gap-4">
                  <InputField label="表定上班時間" type="time" val={attSettingItem.workStartTime || '09:30'} set={v => setAttSettingItem({ ...attSettingItem, workStartTime: v })} />
                  <InputField label="表定下班時間" type="time" val={attSettingItem.workEndTime || '18:30'} set={v => setAttSettingItem({ ...attSettingItem, workEndTime: v })} />
                </div>
                <InputField label="容許彈性緩衝 (分鐘)" type="number" val={attSettingItem.flexMinutes || 0} set={v => setAttSettingItem({ ...attSettingItem, flexMinutes: v })} />
              </div>
              <div className="mt-2 pt-4 border-t border-gray-100 flex justify-end gap-3">
                <button type="button" onClick={() => setAttSettingItem(null)} className="px-5 py-2 text-gray-600 bg-gray-100 rounded-lg font-bold hover:bg-gray-200 transition">取消</button>
                <button type="submit" className="px-5 py-2 text-white bg-blue-600 hover:bg-blue-700 rounded-lg font-bold shadow-md transition">儲存設定</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {selectedEmpCalendar && (
        <div className="absolute inset-0 bg-white/95 backdrop-blur-sm z-[100] flex flex-col p-6 animate-fade-in shadow-2xl">
          <div className="flex justify-between items-center mb-6 shrink-0 bg-white p-4 rounded-xl shadow-sm border border-gray-100">
            <h3 className="font-black text-gray-800 text-xl flex items-center gap-2">
              <CalendarDays className="text-[#C09D9B]" size={28} /> {selectedEmpCalendar.name} 的考勤月曆
            </h3>
            <button onClick={() => setSelectedEmpCalendar(null)} className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-lg transition shadow-sm flex items-center gap-2">
              <X size={18} /> 關閉月曆
            </button>
          </div>
          <div className="flex-1 overflow-hidden">
            <AttendanceCalendar 
              employee={selectedEmpCalendar}
              attendanceLogs={attendanceLogs}
              applications={applications}
              isHRView={true}
            />
          </div>
        </div>
      )}
    </div>
  );
}
