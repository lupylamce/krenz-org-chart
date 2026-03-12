import React from 'react';
import { 
  XCircle, Settings, Briefcase, CalendarDays, 
  Clock, LogOut, CheckCircle2, AlertCircle, 
  Check, FileText, FileClock, X 
} from 'lucide-react';
import { getTodayString, getTimeString, formatDateForInput } from '../../utils/dateHelpers';
import { calculateAttendanceStats } from '../../utils/attendance';

export default function Dashboard({
  user,
  currentEmp,
  isHRAdmin,
  setIsRescueMode,
  setCurrentView,
  setShowBackend,
  setBackendTab,
  attendanceLogs,
  safeDepartments,
  applications,
  handlePunch,
  appFormType,
  setAppFormType,
  appFormData,
  setAppFormData,
  handleSubmitApplication,
  LEAVE_TYPES
}) {
  if (!currentEmp) return (
    <div className="flex flex-col items-center justify-center h-full p-8 text-center">
      <div className="w-20 h-20 bg-red-100 text-red-500 rounded-full flex items-center justify-center mb-4">
        <XCircle size={40} />
      </div>
      <h2 className="text-2xl font-black text-gray-800 mb-2">未綁定員工卡片</h2>
      <p className="text-gray-500 mb-6 max-w-md">您的信箱 ({user?.email}) 目前不存在於系統名冊中，無法使用打卡功能。請聯繫 HR。</p>
      {isHRAdmin ? (
        <button onClick={() => { setCurrentView('orgChart'); setShowBackend(true); setBackendTab('person'); }} className="px-6 py-3 bg-[#C09D9B] text-white font-bold rounded-lg flex items-center justify-center gap-2">
          <Settings size={20}/> 進入花名冊綁定信箱
        </button>
      ) : (
        <button onClick={() => setIsRescueMode(true)} className="px-6 py-3 bg-gray-800 text-white font-bold rounded-lg flex items-center justify-center gap-2">
          <Settings size={20}/> 強制進入花名冊 (管理員救援通道)
        </button>
      )}
    </div>
  );

  const td = getTodayString();
  const todayRecords = attendanceLogs[currentEmp.id]?.[td] || { in: null, out: null };
  const deptName = safeDepartments.find(d => d.id === currentEmp.deptId)?.name || '未知部門';
  const myApps = applications.filter(app => app.applicantId === currentEmp.id);
  const stats = calculateAttendanceStats(currentEmp, todayRecords, td);

  const nowMs = Date.now();
  const activeLeave = myApps.find(app => {
    if (app.type !== 'leave' || (app.status !== 'approved' && app.status !== 'pending_hr')) return false;
    const sTime = new Date(`${app.startDate.split('-').join('/')} ${app.startHour || '00'}:00:00`).getTime();
    const eTime = new Date(`${app.endDate.split('-').join('/')} ${app.endHour || '23'}:00:00`).getTime();
    return nowMs >= sTime && nowMs <= eTime;
  });

  const past7Days = Array.from({ length: 7 }, (_, i) => { 
    const d = new Date(); d.setDate(d.getDate() - (i + 1)); 
    return formatDateForInput(d); 
  });

  return (
    <div className="p-6 md:p-10 max-w-5xl mx-auto w-full h-full bg-gray-50 overflow-y-auto">
      <h1 className="text-3xl font-black text-gray-800 mb-2">早安，{currentEmp.name}！</h1>
      <p className="text-gray-500 font-bold mb-8 flex items-center gap-2"><Briefcase size={18} /> {deptName} - {currentEmp.title}</p>
      
      {currentEmp.enablePunch === false ? (
        <div className="bg-white p-10 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center justify-center text-center relative overflow-hidden mb-6">
          <div className="absolute top-0 w-full h-2 bg-gray-200"></div>
          <div className="w-20 h-20 bg-gray-50 text-gray-400 rounded-full flex items-center justify-center mb-4 border border-gray-200"><CalendarDays size={36} /></div>
          <h2 className="text-2xl font-black text-gray-700 mb-2">考勤紀錄由外部系統管理</h2>
          <p className="text-gray-500 max-w-md">您的考勤資料目前透過 Apollo EX 或其他實體設備進行管理，無需於本內網執行打卡操作。</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div className="flex flex-col gap-6">
            <div className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center justify-center relative overflow-hidden">
              <div className="absolute top-0 w-full h-2 bg-gradient-to-r from-[#C09D9B] to-[#e0c4c2]"></div>
              <h2 className="text-lg font-bold text-gray-600 mb-6 w-full text-left flex items-center gap-2"><Clock className="text-[#C09D9B]" /> 今日出勤打卡 ({td})</h2>
              
              <div className="flex flex-col items-center justify-center w-full py-4">
                {activeLeave ? (
                  <div className="flex flex-col items-center justify-center p-6 text-center bg-blue-50 border border-blue-200 rounded-xl w-full">
                    <CalendarDays size={40} className="text-blue-400 mb-2" />
                    <h3 className="font-bold text-blue-800 text-lg">您目前處於請假期間</h3>
                    <div className="text-sm text-blue-600 mt-2 bg-white px-3 py-1.5 rounded shadow-sm text-left">
                      <div>假別：<span className="font-bold">{activeLeave.leaveType}</span></div>
                      <div>時間：{activeLeave.startDate} {activeLeave.startHour}:00</div>
                      <div>至 {activeLeave.endDate} {activeLeave.endHour}:00</div>
                    </div>
                    <p className="text-xs text-gray-500 mt-4">👉 暫停打卡。</p>
                  </div>
                ) : !todayRecords.in ? (
                  <button onClick={() => handlePunch('in')} className="w-48 h-48 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white font-black text-3xl shadow-xl hover:scale-105 transition-all flex flex-col items-center justify-center gap-2"><Clock size={40}/> 上班打卡</button>
                ) : !todayRecords.out ? (
                  <>
                    <button onClick={() => handlePunch('out')} className="w-48 h-48 rounded-full bg-orange-500 hover:bg-orange-600 text-white font-black text-3xl shadow-xl hover:scale-105 transition-all flex flex-col items-center justify-center gap-2 mb-4"><LogOut size={40}/> 下班打卡</button>
                    <div className="text-emerald-600 font-bold bg-emerald-50 px-4 py-2 rounded-full flex items-center gap-2 animate-pulse mb-2"><CheckCircle2 size={18} />上班時間：{getTimeString(todayRecords.in)}</div>
                    <div className="text-gray-500 text-sm font-bold">預計下班：{stats.requiredOutTimeStr}</div>
                    {stats.lateMins > 0 && <div className="mt-3 text-red-600 font-bold bg-red-50 border border-red-100 px-4 py-2 rounded-lg flex items-center gap-2"><AlertCircle size={16} />遲到 {stats.lateMins} 分鐘</div>}
                    <button onClick={() => handlePunch('undo_in')} className="mt-4 text-xs text-gray-400 hover:text-red-500 underline decoration-dashed">🚨 誤觸上班？點此撤銷</button>
                  </>
                ) : (
                  <>
                    <div className="w-48 h-48 rounded-full bg-gray-200 text-gray-400 font-black text-2xl shadow-inner flex flex-col items-center justify-center gap-2 border-4 border-gray-100 mb-6"><Check size={40} /> 今日已完成</div>
                    <div className="w-full max-w-xs bg-gray-50 border border-gray-200 p-4 rounded-xl text-sm font-bold text-gray-600 mb-2 flex flex-col gap-2">
                      <div className="flex justify-between border-b border-gray-200 pb-2"><span>上班時間：</span><span className="text-gray-800">{getTimeString(todayRecords.in)}</span></div>
                      <div className="flex justify-between pt-1"><span>下班時間：</span><span className="text-gray-800">{getTimeString(todayRecords.out)}</span></div>
                    </div>
                    {(stats.lateMins > 0 || stats.earlyMins > 0) && (
                      <div className="w-full max-w-xs text-red-600 font-bold bg-red-50 border border-red-100 px-3 py-2 rounded-lg flex flex-col gap-1 text-sm text-center">
                        {stats.lateMins > 0 && <span>遲到：{stats.lateMins} 分鐘 </span>}
                        {stats.earlyMins > 0 && <span>早退：{stats.earlyMins} 分鐘</span>}
                      </div>
                    )}
                    <button onClick={() => handlePunch('undo_out')} className="mt-4 text-xs text-gray-400 hover:text-red-500 underline decoration-dashed">🚨 誤觸下班？點此撤銷</button>
                  </>
                )}
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col">
              <h2 className="text-lg font-bold text-gray-600 mb-4 flex items-center gap-2"><CalendarDays className="text-[#C09D9B]" /> 近期考勤紀錄 (過去 7 天)</h2>
              <div className="flex flex-col gap-2">
                {past7Days.map(d => {
                  const r = attendanceLogs[currentEmp.id]?.[d] || {};
                  const ds = calculateAttendanceStats(currentEmp, r, d);
                  const hl = applications.find(a => a.applicantId === currentEmp.id && a.type === 'leave' && (a.status === 'approved' || a.status === 'pending_hr') && a.startDate <= d && a.endDate >= d);
                  
                  let fs = ds.status, fc = ds.sColor; 
                  if (hl) { fs = `休假 (${hl.leaveType})`; fc = 'bg-blue-100 text-blue-800 font-bold'; }

                  return (
                    <div key={d} className="flex items-center justify-between p-3 bg-gray-50 border border-gray-100 rounded-xl hover:bg-gray-100 transition">
                      <div className="flex flex-col">
                        <span className="font-bold text-gray-700 text-sm">{d}</span>
                        <span className="text-xs text-gray-500 mt-0.5">{r.in ? getTimeString(r.in) : '--:--'} ~ {r.out ? getTimeString(r.out) : '--:--'}</span>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <span className={`px-2 py-1 rounded text-[10px] ${fc}`}>{fs}</span>
                        {!hl && (ds.lateMins > 0 || ds.earlyMins > 0) && (
                          <span className="text-[10px] text-red-500 font-bold">
                            {ds.lateMins > 0 && `遲到${ds.lateMins}分 `}{ds.earlyMins > 0 && `早退${ds.earlyMins}分`}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-6">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col h-max">
              <h2 className="text-lg font-bold text-gray-600 mb-4 flex items-center gap-2"><FileText className="text-blue-500" /> 申請中心</h2>
              <div className="grid grid-cols-2 gap-4 flex-1">
                <button onClick={() => { setAppFormType('leave'); setAppFormData({ leaveType: '事假', startHour: '09', endHour: '18' }); }} className="bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-xl flex flex-col items-center justify-center gap-2 transition font-bold p-4"><CalendarDays size={32} /> 請假申請</button>
                <button onClick={() => { setAppFormType('punch'); setAppFormData({ punchType: 'in' }); }} className="bg-orange-50 hover:bg-orange-100 text-orange-700 border border-orange-200 rounded-xl flex flex-col items-center justify-center gap-2 transition font-bold p-4"><FileClock size={32} /> 補打卡單</button>
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col flex-1">
              <h2 className="text-lg font-bold text-gray-600 mb-2">我的歷史申請</h2>
              <p className="text-[10px] text-gray-400 mb-4 bg-gray-50 p-2 rounded border border-gray-100">💡 提示：主管審核通過後假單即算成立，HR 覆核為歸檔程序。</p>
              <div className="flex-1 overflow-y-auto max-h-[400px] flex flex-col gap-2 pr-1">
                {myApps.length > 0 ? myApps.map(a => (
                  <div key={a.docId} className="flex items-center justify-between p-3 bg-gray-50 border border-gray-100 rounded-lg text-sm">
                    <div className="flex flex-col">
                      <span className="font-bold text-gray-800">{a.type === 'leave' ? `[請假] ${a.leaveType}` : `[補打卡] ${a.punchType === 'in' ? '上班' : '下班'}`}</span>
                      <div className="text-xs text-gray-500 font-mono mt-1">{a.type === 'leave' ? `${a.startDate} ${a.startHour || '00'}:00 ~ ${a.endDate} ${a.endHour || '23'}:00` : `${a.date} ${a.time}`}</div>
                    </div>
                    <span className={`px-2 py-1 rounded text-[10px] font-bold shrink-0 ml-2 ${a.status === 'approved' ? 'bg-green-100 text-green-700' : a.status === 'rejected' ? 'bg-red-100 text-red-700' : a.status === 'pending_hr' ? 'bg-blue-100 text-blue-700' : 'bg-yellow-100 text-yellow-700'}`}>
                      {a.status === 'approved' ? '✅ 已建檔 (HR)' : a.status === 'rejected' ? '❌ 已駁回' : a.status === 'pending_manager' ? '🟡 待主管' : '🟢 已成立(待HR)'}
                    </span>
                  </div>
                )) : <div className="text-center text-gray-400 text-sm py-4 border border-dashed border-gray-200 rounded-lg">尚無申請紀錄</div>}
              </div>
            </div>
          </div>
        </div>
      )}

      {appFormType && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden flex flex-col">
            <div className="bg-gray-50 p-4 border-b border-gray-200 flex justify-between items-center">
              <h3 className="font-black text-gray-800 flex items-center gap-2">
                {appFormType === 'leave' ? <CalendarDays className="text-blue-500" /> : <FileClock className="text-orange-500" />} {appFormType === 'leave' ? '新增請假單' : '新增補打卡單'}
              </h3>
              <button type="button" onClick={() => setAppFormType(null)} className="text-gray-400 hover:text-gray-800"><X size={20}/></button>
            </div>
            <form onSubmit={handleSubmitApplication} className="p-6 flex flex-col gap-4">
              {appFormType === 'leave' ? (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-bold text-gray-600 block mb-1">開始日期與時間</label>
                      <input type="date" required value={appFormData.startDate || ''} onChange={e => setAppFormData({ ...appFormData, startDate: e.target.value })} className="w-full border border-gray-300 rounded-t p-2 text-sm outline-none" />
                      <select value={appFormData.startHour || '09'} onChange={e => setAppFormData({ ...appFormData, startHour: e.target.value })} className="w-full border-x border-b border-gray-300 rounded-b p-1 text-xs bg-gray-50 text-gray-600 font-bold outline-none">
                        {Array.from({ length: 24 }).map((_, i) => { const h = String(i).padStart(2, '0'); return <option key={`sh_${h}`} value={h}>{h}:00</option>; })}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-bold text-gray-600 block mb-1">結束日期與時間</label>
                      <input type="date" required value={appFormData.endDate || ''} onChange={e => setAppFormData({ ...appFormData, endDate: e.target.value })} className="w-full border border-gray-300 rounded-t p-2 text-sm outline-none" />
                      <select value={appFormData.endHour || '18'} onChange={e => setAppFormData({ ...appFormData, endHour: e.target.value })} className="w-full border-x border-b border-gray-300 rounded-b p-1 text-xs bg-gray-50 text-gray-600 font-bold outline-none">
                        {Array.from({ length: 24 }).map((_, i) => { const h = String(i).padStart(2, '0'); return <option key={`eh_${h}`} value={h}>{h}:00</option>; })}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-600 block mb-1">請假類別</label>
                    <select required value={appFormData.leaveType || ''} onChange={e => setAppFormData({ ...appFormData, leaveType: e.target.value })} className="w-full border border-gray-300 rounded p-2 text-sm bg-white outline-none">
                      <option value="">請選擇假別...</option>{LEAVE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label className="text-xs font-bold text-gray-600 block mb-1">補卡日期</label>
                    <input type="date" required max={getTodayString()} value={appFormData.date || ''} onChange={e => setAppFormData({ ...appFormData, date: e.target.value })} className="w-full border border-gray-300 rounded p-2 text-sm outline-none" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-bold text-gray-600 block mb-1">補卡類型</label>
                      <select required value={appFormData.punchType || 'in'} onChange={e => setAppFormData({ ...appFormData, punchType: e.target.value })} className="w-full border border-gray-300 rounded p-2 text-sm bg-white outline-none">
                        <option value="in">補上班卡</option><option value="out">補下班卡</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-bold text-gray-600 block mb-1">實際時間</label>
                      <input type="time" required value={appFormData.time || ''} onChange={e => setAppFormData({ ...appFormData, time: e.target.value })} className="w-full border border-gray-300 rounded p-2 text-sm outline-none" />
                    </div>
                  </div>
                </>
              )}
              <div>
                <label className="text-xs font-bold text-gray-600 block mb-1">事由 / 備註</label>
                <textarea required value={appFormData.reason || ''} onChange={e => setAppFormData({ ...appFormData, reason: e.target.value })} className="w-full border border-gray-300 rounded p-2 text-sm h-24 outline-none" placeholder="請填寫詳細事由..."></textarea>
              </div>
              <div className="flex justify-end gap-3 mt-2">
                <button type="button" onClick={() => setAppFormType(null)} className="px-5 py-2 bg-gray-100 text-gray-600 rounded-lg font-bold hover:bg-gray-200 transition">取消</button>
                <button type="submit" className="px-5 py-2 bg-blue-600 text-white rounded-lg font-bold shadow-md hover:bg-blue-700 transition">送出申請</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
