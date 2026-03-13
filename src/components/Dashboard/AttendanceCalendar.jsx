import React, { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, CalendarDays, Clock, AlertCircle } from 'lucide-react';
import { getTodayString, getTimeString } from '../../utils/dateHelpers';
import { calculateAttendanceStats } from '../../utils/attendance';

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

  // Generate calendar grid
  const calendarDays = useMemo(() => {
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const todayStr = getTodayString();
    
    // Previous month padding
    const paddingStart = firstDay;
    const paddingEnd = (7 - ((daysInMonth + paddingStart) % 7)) % 7;
    const totalCells = paddingStart + daysInMonth + paddingEnd;

    const days = [];
    let statsTracker = {
      presentDays: 0,
      lateCount: 0,
      earlyCount: 0,
      lateMins: 0,
      earlyMins: 0,
      missedPunches: 0,
      leaveCount: 0
    };

    for (let i = 0; i < totalCells; i++) {
      const dayNum = i - paddingStart + 1;
      const isCurrentMonth = dayNum > 0 && dayNum <= daysInMonth;
      
      let dateStr = '';
      if (isCurrentMonth) {
        dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
      } else if (dayNum <= 0) {
        // Previous month
        const prevMonthDate = new Date(year, month, dayNum);
        dateStr = `${prevMonthDate.getFullYear()}-${String(prevMonthDate.getMonth() + 1).padStart(2, '0')}-${String(prevMonthDate.getDate()).padStart(2, '0')}`;
      } else {
        // Next month
        const nextMonthDate = new Date(year, month, dayNum);
        dateStr = `${nextMonthDate.getFullYear()}-${String(nextMonthDate.getMonth() + 1).padStart(2, '0')}-${String(nextMonthDate.getDate()).padStart(2, '0')}`;
      }
      
      const realDateObj = new Date(dateStr);
      const isWeekend = realDateObj.getDay() === 0 || realDateObj.getDay() === 6;
      const isFuture = dateStr > todayStr;
      
      // Get data for this day
      const log = attendanceLogs[dateStr] || {};
      const app = applications.find(a => 
        a.applicantId === employee.id && 
        a.type === 'leave' && 
        (a.status === 'approved' || a.status === 'pending_hr') && 
        a.startDate <= dateStr && 
        a.endDate >= dateStr
      );

      const hasPendingPunch = applications.find(a => 
        a.applicantId === employee.id && 
        a.type === 'punch' && 
        a.status === 'pending_manager' && 
        a.date === dateStr
      );

      let statDisplay = { text: '', color: '', isWarning: false, details: '' };
      
      if (app) {
        statDisplay = { text: `休假 (${app.leaveType})`, color: 'bg-blue-100 text-blue-700', isWarning: false };
        if (isCurrentMonth && dateStr <= todayStr) statsTracker.leaveCount++;
      } else if (hasPendingPunch) {
        statDisplay = { text: '補卡審核中', color: 'bg-yellow-100 text-yellow-700', isWarning: false };
      } else if (isFuture) {
        statDisplay = { text: '', color: '' };
      } else if (!log.in && !log.out) {
        if (!isWeekend) {
          statDisplay = { text: '缺勤 / 未打卡', color: 'bg-red-50 text-red-600 border border-red-200', isWarning: true };
          if (isCurrentMonth) statsTracker.missedPunches++;
        } else {
          statDisplay = { text: '休假日', color: 'text-gray-400' };
        }
      } else {
        const dStats = calculateAttendanceStats(employee, log, dateStr);
        if (dStats.status.includes('異常') || dStats.status.includes('缺下班卡')) {
          statDisplay = { text: dStats.status.replace(/[🟢🔴🟡🟠⚪]/g, '').trim(), color: dStats.sColor, isWarning: true };
          if (isCurrentMonth) {
            if (dStats.lateMins > 0) { statsTracker.lateCount++; statsTracker.lateMins += dStats.lateMins; }
            if (dStats.earlyMins > 0) { statsTracker.earlyCount++; statsTracker.earlyMins += dStats.earlyMins; }
            if (!log.out && dateStr !== todayStr) statsTracker.missedPunches++;
          }
        } else {
          statDisplay = { text: dStats.status.replace(/[🟢🔴🟡🟠⚪]/g, '').trim(), color: dStats.sColor, isWarning: false };
        }
        if (isCurrentMonth) statsTracker.presentDays++;
      }

      days.push({
        num: realDateObj.getDate(),
        dateStr,
        isCurrentMonth,
        isToday: dateStr === todayStr,
        isWeekend,
        isFuture,
        log,
        app,
        statDisplay
      });
    }

    return { days, stats: statsTracker };
  }, [year, month, employee, attendanceLogs, applications]);

  const { days, stats } = calendarDays;

  const handleCellClick = (day) => {
    if (isHRView) return; // HR mode doesn't allow punching for the user
    if (day.isFuture) return;
    if (day.statDisplay?.isWarning && onDirectPunch) {
      onDirectPunch(day.dateStr);
    }
  };

  return (
    <div className="flex flex-col gap-6 bg-white p-6 rounded-2xl shadow-sm border border-gray-100 h-full">
      {/* Header Controls & Stats Summary */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6 border-b border-gray-100 pb-6">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 bg-gray-50 rounded-xl p-1 border border-gray-200">
            <button onClick={handlePrevMonth} className="p-2 text-gray-500 hover:text-gray-800 hover:bg-white rounded-lg transition"><ChevronLeft size={20}/></button>
            <div className="font-black text-gray-800 min-w-[120px] text-center text-lg">{year} 年 {month + 1} 月</div>
            <button onClick={handleNextMonth} className="p-2 text-gray-500 hover:text-gray-800 hover:bg-white rounded-lg transition"><ChevronRight size={20}/></button>
          </div>
          <button onClick={handleToday} className="px-4 py-2 bg-white border border-gray-200 text-gray-600 font-bold rounded-xl text-sm hover:bg-gray-50 transition shadow-sm">返回本月</button>
        </div>

        {/* Monthly Summary */}
        <div className="flex flex-wrap gap-4 items-center gap-y-2">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 text-green-700 rounded-lg text-sm">
            <span className="font-bold">出勤 {stats.presentDays} 天</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-sm">
            <span className="font-bold">請假 {stats.leaveCount} 天</span>
          </div>
          {(stats.lateCount > 0 || stats.earlyCount > 0) && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-orange-50 text-orange-700 rounded-lg text-sm">
              <span className="font-bold">遲到/早退共 {stats.lateCount + stats.earlyCount} 次</span>
            </div>
          )}
          {stats.missedPunches > 0 && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-red-50 text-red-700 rounded-lg text-sm border border-red-200">
              <AlertCircle size={16}/> <span className="font-bold">異常/缺勤 {stats.missedPunches} 次</span>
            </div>
          )}
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="flex-1 min-h-0 flex flex-col">
        {/* Days of week */}
        <div className="grid grid-cols-7 gap-px bg-gray-200 rounded-t-xl overflow-hidden shadow-sm shrink-0 border border-gray-200 border-b-0">
          {['日', '一', '二', '三', '四', '五', '六'].map((d, i) => (
            <div key={d} className={`bg-gray-50 py-3 text-center text-sm font-black ${i === 0 || i === 6 ? 'text-gray-400' : 'text-gray-600'}`}>
              {d}
            </div>
          ))}
        </div>

        {/* Grid cells */}
        <div className="grid grid-cols-7 gap-px bg-gray-200 border border-gray-200 rounded-b-xl overflow-hidden flex-1 shadow-inner">
          {days.map((day, idx) => {
            const isClickable = !isHRView && day.statDisplay?.isWarning && !day.isFuture;
            
            return (
              <div 
                key={`${day.dateStr}-${idx}`} 
                onClick={() => handleCellClick(day)}
                className={`flex flex-col p-2 bg-white relative transition h-full min-h-[100px]
                  ${!day.isCurrentMonth ? 'opacity-40 bg-gray-50' : ''} 
                  ${day.isToday ? 'ring-2 ring-inset ring-[#C09D9B] bg-orange-50/30' : ''}
                  ${isClickable ? 'cursor-pointer hover:bg-red-50/50 group' : ''}
                `}
              >
                <div className={`text-sm font-bold mb-1 ${day.isWeekend ? 'text-gray-400' : 'text-gray-700'}`}>
                  {day.num}
                </div>
                
                {!day.isFuture && (
                  <div className="flex flex-col gap-1 mt-auto flex-1 justify-end">
                    {/* Time punches */}
                    {(day.log?.in || day.log?.out) && (
                      <div className="flex justify-between items-center text-xs font-mono text-gray-500 bg-gray-50 rounded px-1 py-0.5 border border-gray-100">
                        <span>{day.log?.in ? getTimeString(day.log.in) : '--:--'}</span>
                        <ChevronRight size={10} className="text-gray-300"/>
                        <span>{day.log?.out ? getTimeString(day.log.out) : '--:--'}</span>
                      </div>
                    )}
                    
                    {/* Status Badge */}
                    {day.statDisplay?.text && (
                      <div className={`text-[10px] px-1.5 py-0.5 rounded font-bold text-center truncate ${day.statDisplay.color}`}>
                        {day.statDisplay.text}
                      </div>
                    )}

                    {/* Click CTA for warning days */}
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
