import React, { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, ChevronDown, CalendarDays, Clock, AlertCircle } from 'lucide-react';
import { getTodayString, getTimeString } from '../../utils/dateHelpers';
import { calculateAttendanceStats } from '../../utils/attendance';

/**
 * 考勤月曆元件
 * 支援員工端 (Dashboard) 與管理端 (WarRoom) 雙模式
 * @param {Object} employee - 員工資料
 * @param {Object} attendanceLogs - 全員打卡紀錄 { [empId]: { [dateStr]: { in, out } } }
 * @param {Array} applications - 全系統申請單據
 * @param {boolean} isHRView - 是否為 HR 檢視模式
 * @param {Function} onDirectPunch - 點擊異常日快捷補卡回呼
 */
export default function AttendanceCalendar({ 
  employee, 
  attendanceLogs = {}, 
  applications = [], 
  isHRView = false, 
  onDirectPunch 
}) {
  const [currentDate, setCurrentDate] = useState(new Date());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const handlePrevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const handleNextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
  const handleToday = () => setCurrentDate(new Date());

  /**
   * 產生月曆資料：日期格、打卡紀錄、請假與補卡狀態、月度統計
   */
  const calendarDays = useMemo(() => {
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const todayStr = getTodayString();
    
    const paddingStart = firstDay;
    const paddingEnd = (7 - ((daysInMonth + paddingStart) % 7)) % 7;
    const totalCells = paddingStart + daysInMonth + paddingEnd;

    const days = [];
    const statsTracker = {
      presentDays: 0,
      lateCount: 0,
      earlyCount: 0,
      lateMins: 0,
      earlyMins: 0,
      missedPunches: 0,
      leaveCount: 0
    };

    // B1 修正：從 attendanceLogs[employee.id] 取得該員工的打卡紀錄
    const empLogs = attendanceLogs[employee?.id] || attendanceLogs || {};

    for (let i = 0; i < totalCells; i++) {
      const dayNum = i - paddingStart + 1;
      const isCurrentMonth = dayNum > 0 && dayNum <= daysInMonth;
      
      let dateStr = '';
      if (isCurrentMonth) {
        dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
      } else if (dayNum <= 0) {
        const d = new Date(year, month, dayNum);
        dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      } else {
        const d = new Date(year, month, dayNum);
        dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      }
      
      const realDateObj = new Date(dateStr.split('-').join('/'));
      const isWeekend = realDateObj.getDay() === 0 || realDateObj.getDay() === 6;
      const isFuture = dateStr > todayStr;
      
      // 取得打卡紀錄
      const log = empLogs[dateStr] || {};
      
      // 取得當日請假單 (approved 或 pending_hr 皆視為有效)
      const leaveApp = applications.find(a => 
        a.applicantId === employee?.id && 
        a.type === 'leave' && 
        (a.status === 'approved' || a.status === 'pending_hr') && 
        a.startDate <= dateStr && 
        a.endDate >= dateStr
      );

      // 取得當日補打卡審核中
      const pendingPunch = applications.find(a => 
        a.applicantId === employee?.id && 
        a.type === 'punch' && 
        (a.status === 'pending_manager' || a.status === 'pending_hr') && 
        a.date === dateStr
      );

      // 取得當日已核准的補打卡
      const approvedPunch = applications.find(a =>
        a.applicantId === employee?.id &&
        a.type === 'punch' &&
        a.status === 'approved' &&
        a.date === dateStr
      );

      // === B2 + B3: 組合狀態標籤陣列 ===
      const tags = [];
      let isWarning = false;
      let punchIn = log.in ? getTimeString(log.in) : null;
      let punchOut = log.out ? getTimeString(log.out) : null;

      if (isFuture) {
        // 未來日期不顯示狀態
      } else if (isWeekend && !log.in && !log.out && !leaveApp) {
        tags.push({ text: '休息日', color: 'text-gray-400' });
      } else {
        // B3: 請假判定 — 先計算請假是否覆蓋全天工時
        let isFullDayLeave = false;
        if (leaveApp) {
          const empStartH = parseInt((employee?.workStartTime || '09:30').split(':')[0]);
          const empStartM = parseInt((employee?.workStartTime || '09:30').split(':')[1]);
          const empEndH = parseInt((employee?.workEndTime || '18:30').split(':')[0]);
          const empEndM = parseInt((employee?.workEndTime || '18:30').split(':')[1]);
          const workMinutes = (empEndH * 60 + empEndM) - (empStartH * 60 + empStartM);

          // 計算假單在當天覆蓋的工時分鐘數
          const leaveStartH = leaveApp.startDate === dateStr ? parseInt(leaveApp.startHour || '00') : 0;
          const leaveStartM = leaveApp.startDate === dateStr ? parseInt((leaveApp.startHour || '00:00').split(':')[1] || '0') : 0;
          const leaveEndH = leaveApp.endDate === dateStr ? parseInt(leaveApp.endHour || '23') : 23;
          const leaveEndM = leaveApp.endDate === dateStr ? parseInt((leaveApp.endHour || '23:30').split(':')[1] || '0') : 59;
          
          const coveredStart = Math.max(leaveStartH * 60 + leaveStartM, empStartH * 60 + empStartM);
          const coveredEnd = Math.min(leaveEndH * 60 + leaveEndM, empEndH * 60 + empEndM);
          const coveredMins = Math.max(0, coveredEnd - coveredStart);

          // 如果假單覆蓋 >= 表定工時的 90%，視為全天假
          isFullDayLeave = coveredMins >= workMinutes * 0.9;

          tags.push({ text: `${leaveApp.leaveType}`, color: 'bg-blue-100 text-blue-700' });
          if (isCurrentMonth && dateStr <= todayStr) statsTracker.leaveCount++;
        }

        // 打卡紀錄分析
        if (log.in || log.out) {
          const dStats = calculateAttendanceStats(employee, log, dateStr);
          
          if (dStats.lateMins > 0) {
            tags.push({ text: `遲到 ${dStats.lateMins} 分`, color: 'bg-red-100 text-red-700' });
            isWarning = true;
            if (isCurrentMonth) { statsTracker.lateCount++; statsTracker.lateMins += dStats.lateMins; }
          }
          if (dStats.earlyMins > 0) {
            tags.push({ text: `早退 ${dStats.earlyMins} 分`, color: 'bg-orange-100 text-orange-700' });
            isWarning = true;
            if (isCurrentMonth) { statsTracker.earlyCount++; statsTracker.earlyMins += dStats.earlyMins; }
          }
          if (!log.out && dateStr !== todayStr && !leaveApp) {
            tags.push({ text: '缺下班卡', color: 'bg-orange-100 text-orange-700 border border-orange-200' });
            isWarning = true;
            if (isCurrentMonth) statsTracker.missedPunches++;
          }
          if (log.in && log.out && dStats.lateMins === 0 && dStats.earlyMins === 0) {
            tags.push({ text: '正常', color: 'bg-green-100 text-green-700' });
          }
          if (log.in && !log.out && dateStr === todayStr) {
            tags.push({ text: '上班中', color: 'bg-yellow-100 text-yellow-700' });
          }
          if (isCurrentMonth && !leaveApp) statsTracker.presentDays++;
        } else {
          // 無打卡紀錄
          if (pendingPunch) {
            tags.push({ text: '補卡審核中', color: 'bg-yellow-100 text-yellow-700' });
          } else if (approvedPunch) {
            // 補卡已核准但 attendanceLogs 尚未同步（極少見，靠補卡寫入邏輯覆蓋）
            tags.push({ text: '補卡已核准', color: 'bg-green-50 text-green-600' });
          } else if (!isFullDayLeave && !isWeekend) {
            // 非全天假且非假日 → 缺勤
            tags.push({ text: '缺勤 / 未打卡', color: 'bg-red-50 text-red-600 border border-red-200' });
            isWarning = true;
            if (isCurrentMonth) statsTracker.missedPunches++;
          }
        }
      }

      days.push({
        num: realDateObj.getDate(),
        dateStr,
        isCurrentMonth,
        isToday: dateStr === todayStr,
        isWeekend,
        isFuture,
        punchIn,
        punchOut,
        tags,
        isWarning
      });
    }

    return { days, stats: statsTracker };
  }, [year, month, employee, attendanceLogs, applications]);

  const { days, stats } = calendarDays;

  /** 點擊異常日格子 → 觸發快捷補卡 */
  const handleCellClick = (day) => {
    if (isHRView) return;
    if (day.isFuture) return;
    if (day.isWarning && onDirectPunch) {
      onDirectPunch(day.dateStr);
    }
  };

  return (
    <div className="flex flex-col gap-6 bg-white p-6 rounded-2xl shadow-sm border border-gray-100 h-full">
      {/* 控制列與月度統計 */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6 border-b border-gray-100 pb-6">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 bg-gray-50 rounded-xl p-1 border border-gray-200">
            <button onClick={handlePrevMonth} className="p-2 text-gray-500 hover:text-gray-800 hover:bg-white rounded-lg transition"><ChevronLeft size={20}/></button>
            <div className="font-black text-gray-800 min-w-[120px] text-center text-lg">{year} 年 {month + 1} 月</div>
            <button onClick={handleNextMonth} className="p-2 text-gray-500 hover:text-gray-800 hover:bg-white rounded-lg transition"><ChevronRight size={20}/></button>
          </div>
          <button onClick={handleToday} className="px-4 py-2 bg-white border border-gray-200 text-gray-600 font-bold rounded-xl text-sm hover:bg-gray-50 transition shadow-sm">返回本月</button>
        </div>

        {/* 月度摘要 */}
        <div className="flex flex-wrap gap-3 items-center">
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-green-50 text-green-700 rounded-lg text-sm">
            <span className="font-bold">出勤 {stats.presentDays} 天</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-sm">
            <span className="font-bold">請假 {stats.leaveCount} 天</span>
          </div>
          {stats.lateCount > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 text-red-700 rounded-lg text-sm">
              <span className="font-bold">遲到 {stats.lateCount} 次 ({stats.lateMins} 分)</span>
            </div>
          )}
          {stats.earlyCount > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-50 text-orange-700 rounded-lg text-sm">
              <span className="font-bold">早退 {stats.earlyCount} 次 ({stats.earlyMins} 分)</span>
            </div>
          )}
          {stats.missedPunches > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 text-red-700 rounded-lg text-sm border border-red-200">
              <AlertCircle size={14}/> <span className="font-bold">缺勤/異常 {stats.missedPunches} 次</span>
            </div>
          )}
        </div>
      </div>

      {/* 日曆本體 */}
      <div className="flex-1 min-h-0 flex flex-col">
        {/* 星期標頭 */}
        <div className="grid grid-cols-7 gap-px bg-gray-200 rounded-t-xl overflow-hidden shadow-sm shrink-0 border border-gray-200 border-b-0">
          {['日', '一', '二', '三', '四', '五', '六'].map((d, i) => (
            <div key={d} className={`bg-gray-50 py-3 text-center text-sm font-black ${i === 0 || i === 6 ? 'text-gray-400' : 'text-gray-600'}`}>
              {d}
            </div>
          ))}
        </div>

        {/* 日期格 */}
        <div className="grid grid-cols-7 gap-px bg-gray-200 border border-gray-200 rounded-b-xl overflow-hidden flex-1 shadow-inner">
          {days.map((day, idx) => {
            const isClickable = !isHRView && day.isWarning && !day.isFuture;
            
            return (
              <div 
                key={`${day.dateStr}-${idx}`} 
                onClick={() => handleCellClick(day)}
                className={`flex flex-col p-1.5 bg-white relative transition h-full min-h-[90px]
                  ${!day.isCurrentMonth ? 'opacity-40 bg-gray-50' : ''} 
                  ${day.isToday ? 'ring-2 ring-inset ring-[#C09D9B] bg-orange-50/30' : ''}
                  ${isClickable ? 'cursor-pointer hover:bg-red-50/50 group' : ''}
                `}
              >
                {/* 日期數字 */}
                <div className={`text-xs font-bold mb-0.5 ${day.isWeekend ? 'text-gray-400' : 'text-gray-700'}`}>
                  {day.num}
                </div>
                
                {!day.isFuture && (
                  <div className="flex flex-col gap-0.5 mt-auto flex-1 justify-end">
                    {/* 打卡時間 — 永遠顯示（有資料時） */}
                    {(day.punchIn || day.punchOut) && (
                      <div className="flex justify-between items-center text-[10px] font-mono text-gray-500 bg-gray-50 rounded px-1 py-0.5 border border-gray-100">
                        <span className={!day.punchIn ? 'text-red-400' : ''}>{day.punchIn || '--:--'}</span>
                        <ChevronDown size={8} className="text-gray-300 rotate-[-90deg]"/>
                        <span className={!day.punchOut ? 'text-red-400' : ''}>{day.punchOut || '--:--'}</span>
                      </div>
                    )}
                    
                    {/* 狀態標籤列 */}
                    {day.tags.map((tag, ti) => (
                      <div key={ti} className={`text-[9px] px-1 py-0.5 rounded font-bold text-center truncate leading-tight ${tag.color}`}>
                        {tag.text}
                      </div>
                    ))}

                    {/* 異常日 hover 快捷操作 */}
                    {isClickable && (
                      <div className="absolute inset-0 bg-red-500/10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition backdrop-blur-[1px]">
                        <span className="bg-white text-red-600 text-xs font-bold px-3 py-1.5 rounded-full shadow-lg border border-red-200">去補卡 👉</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
