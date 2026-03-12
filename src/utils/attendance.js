import { getTodayString } from './dateHelpers';

export const calculateAttendanceStats = (emp, rec, qDate) => {
  const sTime = String(emp.workStartTime || '09:30');
  const eTime = String(emp.workEndTime || '18:30');
  const fMins = parseInt(emp.flexMinutes) || 0;

  const [sH, sM] = sTime.split(':').map(Number);
  const [eH, eM] = eTime.split(':').map(Number);
  const baseStartMin = sH * 60 + sM;
  const baseEndMin = eH * 60 + eM;
  const lateLimitMin = baseStartMin + fMins;

  let lateMins = 0, earlyMins = 0, requiredOutMin = baseEndMin;

  if (rec?.in) {
    const d = new Date(rec.in);
    const actualInMin = d.getHours() * 60 + d.getMinutes();
    lateMins = Math.max(0, actualInMin - lateLimitMin);
    
    if (actualInMin < baseStartMin) requiredOutMin = baseEndMin;
    else if (actualInMin <= lateLimitMin) requiredOutMin = baseEndMin + (actualInMin - baseStartMin);
    else requiredOutMin = baseEndMin + fMins;
  }

  if (rec?.out) {
    const d = new Date(rec.out);
    const actualOutMin = d.getHours() * 60 + d.getMinutes();
    earlyMins = Math.max(0, requiredOutMin - actualOutMin);
  }

  const reqOutStr = `${String(Math.floor(requiredOutMin / 60) % 24).padStart(2, '0')}:${String(requiredOutMin % 60).padStart(2, '0')}`;
  let stat = '⚪ 未打卡', clr = 'bg-gray-100 text-gray-500';
  
  if (emp.enablePunch === false) {
    stat = '外部考勤'; 
    clr = 'bg-blue-50 text-blue-600 border border-blue-200';
  } else if (rec?.in) {
    if (!rec?.out) {
      stat = qDate === getTodayString() ? '🟡 上班中' : '🟠 缺下班卡';
      clr = qDate === getTodayString() ? 'bg-yellow-100 text-yellow-700' : 'bg-orange-100 text-orange-700 font-bold';
    } else {
      if (lateMins > 0 || earlyMins > 0) { 
        stat = '🔴 考勤異常'; 
        clr = 'bg-red-100 text-red-700 font-bold'; 
      } else { 
        stat = '🟢 正常'; 
        clr = 'bg-green-100 text-green-700 font-bold'; 
      }
    }
  }

  return { lateMins, earlyMins, requiredOutTimeStr: reqOutStr, status: stat, sColor: clr };
};
