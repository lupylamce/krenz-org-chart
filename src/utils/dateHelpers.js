export const formatDateForInput = (dStr) => {
  if (!dStr) return ''; 
  const cleanedStr = String(dStr).split('.').join('/').split('-').join('/');
  const dt = new Date(cleanedStr);
  return isNaN(dt) ? '' : `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
};

export const getTodayString = () => {
  const d = new Date(); 
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export const getTimeString = (ts) => {
  if (!ts) return ''; 
  const d = new Date(ts); 
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

export const calculateTenure = (joinDate, milStart, milEnd, isOldSystem, internshipPeriods) => {
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
