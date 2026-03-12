import React, { useState, useRef, useEffect } from 'react';
import { 
  Users, Camera, ZoomIn, ZoomOut, GripVertical, 
  Component, Plus, Briefcase, Minus, X
} from 'lucide-react';
import '../../styles/tree.css';

export default function OrgMap({
  user,
  safeDepartments,
  safeEmployees,
  updateCloudData,
  privateData,
  isEditMode,
  setIsEditMode,
  setShowBackend,
  setBackendTab,
  setEditingItem,
  setPersonFormTab,
  setIsFormOpen
}) {
  const [draggedItem, setDraggedItem] = useState(null);
  const [dropTargetId, setDropTargetId] = useState(null);
  const [scale, setScale] = useState(0.85);
  const [canvasPos, setCanvasPos] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [pinchDist, setPinchDist] = useState(null);
  const [contextMenu, setContextMenu] = useState(null);
  const containerRef = useRef(null);
  const avatarFileInputRefs = useRef({});

  const zoomIn = () => setScale(p => Math.min(p + 0.1, 1.5));
  const zoomOut = () => setScale(p => Math.max(p - 0.1, 0.4));
  const resetZoom = () => { setScale(0.85); setCanvasPos({ x: 0, y: 0 }); };

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

  const handleDragStart = (e, t, id) => { 
    if (!isEditMode) return; 
    setContextMenu(null); 
    e.stopPropagation(); 
    e.dataTransfer.setData('t', JSON.stringify({ t, id })); 
    setDraggedItem({ t, id }); 
    setTimeout(() => { e.target.style.opacity = '0.4'; }, 0); 
  };
  const handleDragEnd = e => { 
    if (!isEditMode) return; 
    e.stopPropagation(); 
    e.target.style.opacity = '1'; 
    setDraggedItem(null); 
    setDropTargetId(null); 
  };
  const handleDragOver = (e, id) => { 
    if (!isEditMode) return; 
    e.preventDefault(); 
    if (draggedItem?.id !== id) setDropTargetId(id); 
  };
  const handleDragLeave = e => { 
    if (!isEditMode) return; 
    e.preventDefault(); 
    setDropTargetId(null); 
  };
  
  const handleDrop = (e, tgt) => {
    if (!isEditMode) return; 
    e.preventDefault(); 
    e.stopPropagation(); 
    setDropTargetId(null);
    try {
      const d = JSON.parse(e.dataTransfer.getData('t')); 
      if (!d || d.id === tgt) return;
      if (d.t === 'emp') {
        updateCloudData(safeDepartments, safeEmployees.map(x => x.id === d.id ? { ...x, deptId: tgt } : x), privateData);
      } else if (d.t === 'dept') {
        if (isDeptDescendant(d.id, tgt)) {
          alert('不能移動到下屬單位中。');
          return;
        }
        updateCloudData(safeDepartments.map(x => x.id === d.id ? { ...x, parentId: tgt } : x), safeEmployees, privateData);
      }
    } catch (err) {}
  };

  const handleContainerDragOver = e => {
    if (!isEditMode || !draggedItem || !containerRef.current) return; 
    e.preventDefault();
    const r = containerRef.current.getBoundingClientRect(); 
    const ed = 100, sp = 20; 
    let dx = 0, dy = 0;
    if (e.clientY < r.top + ed) dy = sp * (1 - (e.clientY - r.top) / ed); 
    else if (e.clientY > r.bottom - ed) dy = -sp * (1 - (r.bottom - e.clientY) / ed);
    if (e.clientX < r.left + ed) dx = sp * (1 - (e.clientX - r.left) / ed); 
    else if (e.clientX > r.right - ed) dx = -sp * (1 - (r.right - e.clientX) / ed);
    if (dx !== 0 || dy !== 0) setCanvasPos(p => ({ x: p.x + dx, y: p.y + dy }));
  };

  const handlePanStart = e => { 
    if (contextMenu) setContextMenu(null); 
    if (e.target.closest('.org-node') && isEditMode) return; 
    if (e.touches?.length === 2) { 
      setPinchDist(Math.hypot(e.touches[1].clientX - e.touches[0].clientX, e.touches[1].clientY - e.touches[0].clientY)); 
      return; 
    } 
    setIsPanning(true); 
    const c = e.touches ? e.touches[0] : e; 
    setPanStart({ x: c.clientX - canvasPos.x, y: c.clientY - canvasPos.y }); 
  };

  const handlePanMove = e => { 
    if (e.touches?.length === 2 && pinchDist !== null) { 
      const cD = Math.hypot(e.touches[1].clientX - e.touches[0].clientX, e.touches[1].clientY - e.touches[0].clientY); 
      setScale(p => Math.min(Math.max(p + (cD - pinchDist) * 0.005, 0.4), 1.5)); 
      setPinchDist(cD); 
      return; 
    } 
    if (!isPanning) return; 
    const c = e.touches ? e.touches[0] : e; 
    setCanvasPos({ x: c.clientX - panStart.x, y: c.clientY - panStart.y }); 
  };

  const handlePanEnd = () => { 
    setIsPanning(false); 
    setPinchDist(null); 
  };

  useEffect(() => {
    const c = containerRef.current; 
    if (!c) return;
    const w = e => { 
      if (contextMenu) return; 
      e.preventDefault(); 
      setScale(p => Math.min(Math.max(p - e.deltaY * 0.0015, 0.3), 2.0)); 
    };
    c.addEventListener('wheel', w, { passive: false }); 
    return () => c.removeEventListener('wheel', w);
  }, [contextMenu]);

  const handleCanvasContextMenu = e => { 
    if (!isEditMode || e.target.closest('.org-node')) return; 
    e.preventDefault(); 
    const c = e.touches ? e.touches[0] : e; 
    setContextMenu({ x: c.clientX, y: c.clientY }); 
  };

  const getEmptyPersonData = () => ({
    id: `emp_${Date.now()}`, name: '', title: '', deptId: safeDepartments[0]?.id || '', jobLevel: '', concurrentDepts: [], loginEmail: '', systemRole: 'staff',
    enablePunch: true, workStartTime: '09:30', workEndTime: '18:30', flexMinutes: 30,
    realName: '', gender: '', birthday: '', phone: '', email: '', idNumber: '', passportNumber: '', empStatus: '正職',
    joinDate: '', militaryStart: '', militaryEnd: '', workLocation: '台灣', school: '', major: '', isOldSystem: false, internshipPeriods: [],
    regAddress: '', commAddress: '', emergencyContact: '', emergencyPhone: '', leaveDate: '', leaveReason: '', leaveType: '',
    bankAccount: '', bankName: '', alipay: '', contractEntity: '', socialSecurityLoc: '', initContractPeriod: '', outsourceContractPeriod: '', renewContracts: [],
    magicLevel: '', magicPoints: ''
  });

  const handleQuickAdd = (t, ex = {}) => { 
    setContextMenu(null); 
    setShowBackend(true); 
    setBackendTab(t); 
    setEditingItem(t === 'dept' ? { id: `dept_${Date.now()}`, name: '', parentId: null, style: ex.style || 'box', isStaff: false, managerId: '' } : getEmptyPersonData()); 
    setPersonFormTab('public'); 
    setIsFormOpen(true); 
  };

  const handleAvatarUpload = (e, id) => {
    const f = e.target.files[0]; 
    if (!f) return; 
    const r = new FileReader(); 
    r.onload = ev => { 
      const img = new Image(); 
      img.onload = () => { 
        const cvs = document.createElement('canvas'), ctx = cvs.getContext('2d'); 
        let w = img.width, h = img.height; 
        if (w > 150 || h > 150) { 
          if (w > h) { h *= 150 / w; w = 150; } 
          else { w *= 150 / h; h = 150; } 
        } 
        cvs.width = w; cvs.height = h; 
        ctx.fillStyle = '#FFF'; 
        ctx.fillRect(0, 0, w, h); 
        ctx.drawImage(img, 0, 0, w, h); 
        updateCloudData(safeDepartments, safeEmployees.map(x => x.id === id ? { ...x, avatarUrl: cvs.toDataURL('image/jpeg', 0.8) } : x), privateData); 
      }; 
      img.src = ev.target.result; 
    }; 
    r.readAsDataURL(f); 
    e.target.value = null;
  };

  const renderConcurrentBadges = e => {
    if (!e?.concurrentDepts?.length) return null;
    return (
      <div className="flex flex-wrap justify-center gap-1 mt-2 w-full">
        {e.concurrentDepts.map(c => { 
          const d = safeDepartments.find(x => x.id === c.deptId); 
          return d ? <span key={c.deptId} className="bg-purple-100 text-purple-700 text-[10px] font-bold px-1.5 py-0.5 rounded truncate max-w-[120px]">兼: {d.name}</span> : null; 
        })}
      </div>
    );
  };

  const renderEmployeeProfile = e => {
    const cD = isEditMode && !e.isConcurrent;
    return (
      <div key={e.id + (e.isConcurrent ? 'c' : '')} className="flex flex-col items-center w-full group/profile relative">
        <input type="file" accept="image/*" className="hidden" ref={el => avatarFileInputRefs.current[e.id] = el} onChange={ev => handleAvatarUpload(ev, e.id)} disabled={!isEditMode} />
        <div className={`relative w-16 h-16 mb-2 rounded-full shadow-sm transition-all ${isEditMode ? 'cursor-pointer hover:ring-2 hover:ring-[#C09D9B]' : ''}`} onClick={ev => { ev.stopPropagation(); if (isEditMode) avatarFileInputRefs.current[e.id].click(); }}>
          {e.avatarUrl ? <img src={e.avatarUrl} className="w-full h-full rounded-full object-cover" alt=""/> : <div className="w-full h-full rounded-full bg-[#747474] text-white flex items-center justify-center font-bold text-2xl">{(e.name || ' ').charAt(0)}</div>}
          {isEditMode && <div className="absolute inset-0 bg-black/30 rounded-full flex items-center justify-center opacity-0 group-hover/profile:opacity-100 transition-opacity"><Camera size={18} className="text-white" /></div>}
        </div>
        <h3 className="text-gray-800 font-black text-lg truncate w-full text-center">{e.name}</h3>
        <p className="text-gray-500 text-sm w-full mt-1 text-center flex items-center justify-center gap-1">
          <span className="truncate">{e.displayTitle || e.title}{e.isConcurrent && <span className="text-purple-600 font-bold">(兼)</span>}</span>
          {!e.isConcurrent && e.jobLevel && <span className="bg-gray-200 text-gray-600 text-[10px] font-bold px-1 rounded">{e.jobLevel}</span>}
        </p>
        {!e.isConcurrent && renderConcurrentBadges(e)}
        {cD && <div draggable onDragStart={ev => handleDragStart(ev, 'emp', e.id)} onDragEnd={handleDragEnd} className="absolute top-0 right-0 p-1 text-gray-300 hover:text-gray-600 cursor-grab active:cursor-grabbing opacity-0 group-hover/profile:opacity-100"><GripVertical size={16} /></div>}
      </div>
    );
  };

  const renderMiniCard = e => {
    const cD = isEditMode && !e.isConcurrent;
    return (
      <div key={e.id + (e.isConcurrent ? 'c' : '')} draggable={cD} onDragStart={ev => cD && handleDragStart(ev, 'emp', e.id)} onDragEnd={handleDragEnd} className={`relative flex flex-col bg-gray-50 border border-gray-200 rounded-lg p-2 transition-all group/mini w-[180px] ${draggedItem?.id === e.id && !e.isConcurrent ? 'opacity-50 border-dashed' : ''} ${cD ? 'cursor-grab active:cursor-grabbing hover:border-[#C09D9B] hover:shadow-md' : ''}`}>
        <div className="flex items-center gap-3 w-full">
          <input type="file" accept="image/*" className="hidden" ref={el => avatarFileInputRefs.current[e.id] = el} onChange={ev => handleAvatarUpload(ev, e.id)} disabled={!isEditMode} />
          <div className={`relative w-10 h-10 rounded-full shrink-0 overflow-hidden border border-gray-200 ${isEditMode ? 'cursor-pointer' : ''}`} onClick={ev => { ev.stopPropagation(); if (isEditMode) avatarFileInputRefs.current[e.id].click(); }}>
            {e.avatarUrl ? <img src={e.avatarUrl} className="w-full h-full object-cover" alt=""/> : <div className="w-full h-full bg-[#747474] text-white flex items-center justify-center font-bold text-sm">{(e.name || ' ').charAt(0)}</div>}
            {isEditMode && <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover/mini:opacity-100 transition-opacity"><Camera size={14} className="text-white" /></div>}
          </div>
          <div className="flex-1 min-w-0 text-left">
            <div className="text-sm font-black text-gray-800 truncate">{e.name}</div>
            <div className="text-xs text-gray-500 flex items-center gap-1 overflow-hidden">
              <span className="truncate">{e.displayTitle || e.title}{e.isConcurrent && <span className="text-purple-600 font-bold">(兼)</span>}</span>
              {!e.isConcurrent && e.jobLevel && <span className="bg-gray-200 text-gray-600 text-[9px] font-bold px-1 rounded shrink-0">{e.jobLevel}</span>}
            </div>
          </div>
          {cD && <div className="text-gray-300 pr-1 opacity-0 group-hover/mini:opacity-100 transition-opacity"><GripVertical size={14} /></div>}
        </div>
        {!e.isConcurrent && renderConcurrentBadges(e)}
      </div>
    );
  };

  const renderDeptNode = d => {
    if (!d) return null;
    const pE = safeEmployees.filter(e => e.deptId === d.id).map(e => ({ ...e, isConcurrent: false }));
    const cE = safeEmployees.filter(e => e.concurrentDepts?.some(c => c.deptId === d.id) && e.deptId !== d.id).map(e => ({ ...e, isConcurrent: true, displayTitle: e.concurrentDepts.find(c => c.deptId === d.id)?.title || e.title }));
    const aE = [...pE, ...cE];
    const cl = `org-node relative z-10 inline-flex flex-col ${d.style === 'box' ? 'bg-white border-2 rounded-xl p-4 min-w-[240px] w-max' : 'items-center bg-white border-2 rounded-xl p-5 w-[180px] whitespace-normal'} transition-all duration-200 group ${dropTargetId === d.id ? 'border-[#C09D9B] ring-4 ring-pink-100 scale-105' : 'border-gray-200 shadow-sm'} ${draggedItem?.id === d.id ? 'border-dashed opacity-50' : ''} ${isEditMode && d.id !== 'dept_board' ? 'cursor-grab active:cursor-grabbing hover:border-[#C09D9B] hover:shadow-md' : ''}`;
    
    return (
      <div className={cl} draggable={isEditMode && d.id !== 'dept_board'} onDragStart={e => handleDragStart(e, 'dept', d.id)} onDragEnd={handleDragEnd} onDragOver={e => handleDragOver(e, d.id)} onDragLeave={handleDragLeave} onDrop={e => handleDrop(e, d.id)}>
        {d.style === 'box' ? (
          <>
            <div className="flex items-center gap-2 font-black text-base text-[#747474] border-b-2 border-gray-100 pb-3 mb-3 text-left">
              <Briefcase size={18} className="text-[#C09D9B]" /> {d.name}
            </div>
            <div className={`grid grid-cols-${Math.max(1, Math.min(aE.length, 3))} gap-3 min-h-[40px] place-items-start`}>
              {aE.length > 0 ? aE.map(e => renderMiniCard(e)) : <div className="text-xs text-gray-400 py-3 border border-dashed border-gray-200 rounded-lg w-full flex items-center justify-center col-span-full">尚無編制</div>}
            </div>
          </>
        ) : (
          <>
            <div className="bg-[#f0ecec] text-[#747474] text-xs font-bold px-2 py-1 rounded-md mb-4 w-full truncate text-center shadow-sm border border-gray-200">{d.name}</div>
            {aE.length > 0 ? (
              <div className="w-full flex flex-col gap-4">
                {aE.map(e => renderEmployeeProfile(e))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-4 w-full">
                <div className="w-16 h-16 rounded-full border-2 border-dashed border-gray-300 flex items-center justify-center mb-2 bg-gray-50"><Users className="text-gray-300" size={24} /></div>
                <span className="text-gray-400 text-sm font-bold">虛位</span>
              </div>
            )}
          </>
        )}
      </div>
    );
  };

  const renderTree = (nodeId) => {
    const d = safeDepartments.find(d => d.id === nodeId);
    if (!d) return null;
    const rawC = safeDepartments.filter(x => x.parentId === nodeId);
    const mC = rawC.filter(x => x.isStaff);
    const rC = rawC.filter(x => !x.isStaff);

    return (
      <li key={d.id}>
        <div className="inline-flex flex-col items-center">
          {renderDeptNode(d)}
          {mC.length > 0 && (
             <div className="grid grid-cols-[1fr_auto_1fr] items-stretch w-full">
                <div className="flex-1 min-w-0"></div>
                <div className={`w-[2px] bg-[#C09D9B] relative shrink-0 ${rC.length > 0 ? 'min-h-[48px]' : 'min-h-[24px]'}`}>
                   <div className="absolute top-1/2 left-0 w-8 border-t-2 border-dashed border-[#C09D9B] -translate-y-1/2"></div>
                </div>
                <div className="flex-1 flex justify-start items-center min-w-0">
                   <div className="ml-8 flex flex-col gap-4 border-l-2 border-dashed border-[#C09D9B] pl-6 py-4 relative my-[-20px] w-max">
                     <div className="absolute -left-3 top-0 bottom-0 flex flex-col justify-center text-[#C09D9B] font-bold text-[10px]" style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>幕僚單位</div>
                     {mC.map(x => (
                       <div key={x.id} className="relative before:absolute before:content-[''] before:-left-6 before:w-6 before:border-t-2 before:border-dashed before:border-[#C09D9B] before:top-1/2 before:-translate-y-1/2">
                         {renderDeptNode(x)}
                       </div>
                     ))}
                   </div>
                </div>
             </div>
          )}
        </div>
        {rC.length > 0 && (
          <ul>{rC.map(c => renderTree(c.id))}</ul>
        )}
      </li>
    );
  };

  return (
    <div className="org-tree-container" 
      ref={containerRef} 
      onMouseDown={handlePanStart} 
      onMouseMove={handlePanMove} 
      onMouseUp={handlePanEnd} 
      onMouseLeave={handlePanEnd} 
      onTouchStart={handlePanStart} 
      onTouchMove={handlePanMove} 
      onTouchEnd={handlePanEnd} 
      onDragOver={handleContainerDragOver} 
      onContextMenu={handleCanvasContextMenu}
    >
      <div className="absolute bottom-8 right-8 z-50 flex flex-col gap-3">
        <div className="flex flex-col bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
          <button onClick={zoomIn} className="p-3 hover:bg-gray-50 text-gray-700 border-b border-gray-100 transition"><ZoomIn size={24} /></button>
          <button onClick={resetZoom} className="p-3 hover:bg-gray-50 text-gray-700 font-bold text-sm border-b border-gray-100 transition">{Math.round(scale * 100)}%</button>
          <button onClick={zoomOut} className="p-3 hover:bg-gray-50 text-gray-700 transition"><ZoomOut size={24} /></button>
        </div>
      </div>
      
      <div className="org-tree-panner" style={{ transform: `translate(${canvasPos.x}px, ${canvasPos.y}px) scale(${scale})`, transformOrigin: '0 0' }}>
        <div className="org-tree">
          <ul>
            {renderTree('dept_board')}
          </ul>
        </div>
      </div>

      {contextMenu && (
        <div className="fixed bg-white rounded-xl shadow-2xl border border-gray-100 w-56 z-[100] overflow-hidden animate-fade-in" style={{ left: contextMenu.x, top: contextMenu.y }}>
          <div className="bg-gray-50 px-3 py-2 border-b border-gray-100 text-xs font-bold text-gray-500 flex justify-between items-center">
            快速建檔快捷鍵 ⚡ <button onClick={() => setContextMenu(null)} className="text-gray-400 hover:text-red-500"><X size={14}/></button>
          </div>
          <div className="flex flex-col p-1">
            <button onClick={() => handleQuickAdd('person')} className="flex items-center gap-3 px-3 py-2.5 hover:bg-blue-50 hover:text-blue-700 text-gray-700 text-sm font-bold rounded-lg transition text-left"><Users size={16} /> 新增人員資料</button>
            <div className="h-px bg-gray-100 my-1 mx-2"></div>
            <button onClick={() => handleQuickAdd('dept', { style: 'card' })} className="flex items-center gap-3 px-3 py-2.5 hover:bg-emerald-50 hover:text-emerald-700 text-gray-700 text-sm font-bold rounded-lg transition text-left"><Component size={16} /> 新增獨立部門 (大卡片)</button>
            <button onClick={() => handleQuickAdd('dept', { style: 'box' })} className="flex items-center gap-3 px-3 py-2.5 hover:bg-emerald-50 hover:text-emerald-700 text-gray-700 text-sm font-bold rounded-lg transition text-left"><Briefcase size={16} /> 新增群組部門 (白框收納)</button>
          </div>
        </div>
      )}
    </div>
  );
}
