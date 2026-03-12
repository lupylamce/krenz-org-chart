import React, { useState, useMemo } from 'react';
import { 
  Users, Edit, LogOut, Home, 
  Network, Copy, Shield, X
} from 'lucide-react';
import { doc, setDoc, collection, addDoc, updateDoc } from 'firebase/firestore';
import { db, appId } from './services/firebase';

import ErrorBoundary from './components/common/ErrorBoundary';
import Dashboard from './components/Dashboard/Dashboard';
import WarRoom from './components/WarRoom/WarRoom';
import OrgMap from './components/OrgTree/OrgMap';
import BackendModal from './components/Forms/BackendModal';

import { useAuth } from './hooks/useAuth';
import { useOrgData } from './hooks/useOrgData';
import { getTodayString, formatDateForInput } from './utils/dateHelpers';

const LEAVE_TYPES = ['撟港???, '鈭?', '??', '隤蹂?', '憍?', '?Ｗ?/?芰??, '?芸?'];

function MainApp() {
  const { user, isAuthChecking, loginError, handleLogin, handleGoogleLogin, handleLogout } = useAuth();
  
  const [isRescueMode, setIsRescueMode] = useState(false);
  const [isVisitor, setIsVisitor] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const currentEmpByEmail = useMemo(() => {
    // This will be calculated after employees are loaded
    return null;
  }, []);

  const [errorMsg, setErrorMsg] = useState('');
  const [currentView, setCurrentView] = useState('orgChart');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const [showBackend, setShowBackend] = useState(false);
  const [backendTab, setBackendTab] = useState('person');
  const [editingItem, setEditingItem] = useState(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [personFormTab, setPersonFormTab] = useState('public');
  const [isEditMode, setIsEditMode] = useState(false);

  const [appFormType, setAppFormType] = useState(null);
  const [appFormData, setAppFormData] = useState({});

  const isGodMode = user?.email?.toLowerCase() === 'kae@krenzartwork.com';
  
  const { 
    departments: safeDepartments, 
    employees: safeEmployees, 
    privateData, 
    attendanceLogs, 
    applications, 
    isSyncing, 
    updateCloudData 
  } = useOrgData({ 
    user, 
    isAuthChecking, 
    isHRAdmin: isRescueMode || isGodMode || false, // Will patch this below
    isVisitor, 
    setErrorMsg 
  });

  const currentEmp = useMemo(() => {
    if (!user || !user.email) return null;
    return safeEmployees.find(e => typeof e.loginEmail === 'string' && e.loginEmail.toLowerCase() === user.email.toLowerCase()) || null;
  }, [user, safeEmployees]);

  const isHRAdmin = isRescueMode || currentEmp?.systemRole === 'admin' || isGodMode;

  const sortedWarRoomEmps = useMemo(() => {
    return [...safeEmployees].sort((a, b) => {
      const dA = safeDepartments.find(d => d.id === a.deptId)?.name || '?芰';
      const dB = safeDepartments.find(d => d.id === b.deptId)?.name || '?芰';
      if (dA !== dB) return dA.localeCompare(dB);
      return (a.name || '').localeCompare(b.name || '');
    });
  }, [safeEmployees, safeDepartments]);

  const toggleEditMode = () => { 
    if (isEditMode) { 
      setIsEditMode(false); setShowBackend(false); 
    } else { 
      setIsEditMode(true); 
    } 
  };

  const copyUID = () => { 
    if (user) { 
      navigator.clipboard.writeText(user.uid).catch(() => {}); 
      setErrorMsg('??UID 撌脰?鋆?); setTimeout(() => setErrorMsg(''), 3000); 
    } 
  };

  const closeBackendForm = () => { 
    setIsFormOpen(false); setEditingItem(null); 
  };

  const handleSaveItem = e => {
    e.preventDefault(); 
    if (!editingItem.name.trim()) return;
    if (backendTab === 'dept') {
      updateCloudData(
        safeDepartments.some(d => d.id === editingItem.id) ? safeDepartments.map(d => d.id === editingItem.id ? editingItem : d) : [...safeDepartments, editingItem], 
        safeEmployees, 
        privateData
      );
    } else {
      let fi = { ...editingItem }; 
      fi.concurrentDepts = (fi.concurrentDepts || []).filter(c => c && c.deptId !== fi.deptId);
      const pubF = ['id', 'name', 'title', 'jobLevel', 'deptId', 'concurrentDepts', 'avatarUrl', 'loginEmail', 'systemRole', 'enablePunch', 'workStartTime', 'workEndTime', 'flexMinutes'];
      const pu = {}, pr = {};
      Object.keys(fi).forEach(k => pubF.includes(k) ? pu[k] = fi[k] : pr[k] = fi[k]);
      updateCloudData(
        safeDepartments, 
        safeEmployees.some(e => e.id === pu.id) ? safeEmployees.map(e => e.id === pu.id ? pu : e) : [...safeEmployees, pu], 
        { ...privateData, [pu.id]: pr }
      );
    } 
    closeBackendForm();
  };

  const handlePunch = async (type, specifiedTime = null) => {
    if (!currentEmp) return setErrorMsg('?芰?摰撌亙??);
    if (currentEmp.enablePunch === false && !specifiedTime) return setErrorMsg('蝬脤??撌脤???);
    
    const today = specifiedTime ? formatDateForInput(new Date(specifiedTime)) : getTodayString(); 
    const nowTs = specifiedTime || Date.now();
    const empAttRef = doc(db, 'artifacts', appId, 'public', 'data', 'attendance', currentEmp.id);
    const currentRecords = attendanceLogs[currentEmp.id] || {};
    const todayRecord = currentRecords[today] || { in: null, out: null };
    
    let newRecord = { ...todayRecord };
    if (type === 'in') {
      if (newRecord.in && !specifiedTime) return setErrorMsg('隞撌脫????剖嚗?); 
      newRecord.in = nowTs;
    } else if (type === 'out') {
      if (!newRecord.in && !specifiedTime) return setErrorMsg('隢????剖嚗?); 
      if (newRecord.out && !specifiedTime) return setErrorMsg('隞撌脫????剖嚗?); 
      newRecord.out = nowTs;
    } else if (type === 'undo_in') { 
      newRecord.in = null; 
    } else if (type === 'undo_out') { 
      newRecord.out = null; 
    }

    try {
      await setDoc(empAttRef, JSON.parse(JSON.stringify({ records: { ...currentRecords, [today]: newRecord } })), { merge: true });
      if (!specifiedTime) { 
        setErrorMsg(type.includes('undo') ? '撌脫?瑟??～? : `??${type === 'in' ? '銝' : '銝'}???嚗); 
        setTimeout(() => setErrorMsg(''), 3000); 
      }
    } catch (e) { 
      setErrorMsg('?憭望???); 
    }
  };

  const handleSubmitApplication = async (e) => {
    e.preventDefault(); 
    if (!currentEmp) return;
    try {
      const payload = JSON.parse(JSON.stringify({
        ...appFormData, 
        startHour: appFormData.startHour || '09', 
        endHour: appFormData.endHour || '18', 
        type: appFormType, 
        applicantId: currentEmp.id, 
        applicantName: currentEmp.name, 
        deptId: currentEmp.deptId, 
        status: 'pending_manager', 
        createdAt: Date.now()
      }));
      await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'applications'), payload);
      setAppFormType(null); 
      setAppFormData({});
      setErrorMsg('???唾?撌脤??); 
      setTimeout(() => setErrorMsg(''), 3000);
    } catch (err) { 
      setErrorMsg('?憭望???); 
    }
  };

  const handleApproveApplication = async (d, action) => {
    try {
      const appRef = doc(db, 'artifacts', appId, 'public', 'data', 'applications', d.docId);
      let ns = d.status, up = { updatedAt: Date.now(), updatedBy: currentEmp.name };

      if (action === 'reject') { 
        ns = 'rejected'; up.rejectedBy = currentEmp.name; up.rejectedAt = Date.now(); 
      } else if (action === 'manager_approve') { 
        ns = 'pending_hr'; up.managerApprovedBy = currentEmp.name; up.managerApprovedAt = Date.now(); 
      } else if (action === 'hr_approve') { 
        ns = 'approved'; up.hrApprovedBy = currentEmp.name; up.hrApprovedAt = Date.now(); 
        if (d.status === 'pending_manager') { 
          up.managerApprovedBy = currentEmp.name + ' (HR隞?偷)'; up.managerApprovedAt = Date.now(); 
        }
      }

      up.status = ns;
      await updateDoc(appRef, JSON.parse(JSON.stringify(up)));
      
      if (ns === 'approved' && d.type === 'punch') {
        const targetDateStr = d.date;
        const specificTimeMs = new Date(`${targetDateStr.split('-').join('/')} ${d.time}`).getTime();
        const tr = attendanceLogs[d.applicantId] || {};
        const dr = tr[targetDateStr] || { in: null, out: null };
        const isUp = d.punchType === 'in';
        await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'attendance', d.applicantId), JSON.parse(JSON.stringify({ records: { ...tr, [targetDateStr]: { ...dr, [isUp ? 'in' : 'out']: specificTimeMs } } })), { merge: true });
      }

      setErrorMsg(`??撌?{action === 'reject' ? '擏?' : '?詨?'}`); 
      setTimeout(() => setErrorMsg(''), 3000);
    } catch (err) { 
      setErrorMsg('??憭望?嚗?); 
    }
  };

  if (isAuthChecking) return <div className="h-screen w-full flex items-center justify-center bg-gray-50"><div className="w-12 h-12 border-4 border-[#C09D9B] border-t-transparent rounded-full animate-spin"></div></div>;

  if (!user && !isVisitor) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-gray-50 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] p-4">
        <div className="bg-white p-10 rounded-3xl shadow-2xl w-full max-w-md border border-gray-100 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-[#C09D9B] to-[#e0c4c2]"></div>
          <div className="flex justify-center mb-6"><div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center border border-gray-100 shadow-sm"><Users className="text-[#C09D9B]" size={36} /></div></div>
          <h2 className="text-3xl font-black text-center text-gray-800 mb-2">Krenz ?折蝟餌絞</h2>
          <p className="text-center text-gray-500 text-sm font-bold mb-8">蝯??嗆??蝞∠?撟喳</p>
          {loginError && <div className="mb-6 p-4 bg-red-50 border border-red-100 text-red-600 font-bold rounded-xl text-sm flex items-center gap-2"><X size={16}/> {loginError}</div>}
          <form onSubmit={(e) => { e.preventDefault(); handleLogin(email, password); }} className="flex flex-col gap-4 mb-6">
            <div><label className="block text-xs font-bold text-gray-600 mb-1">隡平靽∠拳</label><input type="email" value={email} onChange={e => setEmail(e.target.value)} required className="w-full px-4 py-3 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-[#C09D9B] text-sm bg-gray-50 focus:bg-white transition placeholder-gray-400" placeholder="yourname@krenzartwork.com" /></div>
            <div><label className="block text-xs font-bold text-gray-600 mb-1">撖Ⅳ</label><input type="password" value={password} onChange={e => setPassword(e.target.value)} required className="w-full px-4 py-3 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-[#C09D9B] text-sm bg-gray-50 focus:bg-white transition" placeholder="?ＴＴＴＴＴＴＴ? /></div>
            <button type="submit" className="w-full py-3 bg-gray-800 hover:bg-black text-white rounded-xl font-black transition shadow-md mt-2">靽∠拳撣唾??餃</button>
          </form>
          <div className="relative flex items-center justify-center my-6"><div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200"></div></div><span className="relative bg-white px-4 text-xs font-bold text-gray-400">?蝙?典翰???/span></div>
          <button onClick={handleGoogleLogin} type="button" className="w-full py-3 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-xl font-black transition flex items-center justify-center gap-3"><svg width="18" height="18" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>Google 撣唾??餃</button>
          <button onClick={() => setIsVisitor(true)} className="w-full py-3 mt-3 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl font-black transition flex items-center justify-center gap-3"><Users size={18} />閮芸恥??亦汗 (???祇??嗆?)</button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full bg-white overflow-hidden font-sans relative">
      <div className={`${isSidebarOpen ? 'w-64' : 'w-20'} bg-gray-900 shrink-0 flex flex-col transition-all duration-300 relative z-20`}>
        <div className="p-4 flex items-center gap-3 border-b border-gray-800 shrink-0 h-20 overflow-hidden text-white">
          <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center shrink-0 border border-white/5"><Users className="text-[#C09D9B]" size={20} /></div>
          {isSidebarOpen && (
            <div className="flex flex-col min-w-0">
              <span className="font-black text-white text-lg truncate tracking-widest">{isGodMode ? 'GOD MODE' : 'Krenz'}</span>
              <span className="text-[10px] text-gray-400 font-bold truncate tracking-widest uppercase">Admin System</span>
            </div>
          )}
        </div>
        
        {user && isSidebarOpen && currentEmp && (
          <div className="px-5 py-6 border-b border-gray-800 bg-black/20 shrink-0">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-[#C09D9B] shrink-0 bg-gray-800">
                {currentEmp.avatarUrl ? <img src={currentEmp.avatarUrl} className="w-full h-full object-cover" alt="" /> : <div className="w-full h-full flex items-center justify-center bg-gray-800 text-gray-300 font-black text-xl">{(currentEmp.name || ' ').charAt(0)}</div>}
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-white font-black text-lg truncate pr-2">{currentEmp.name}</span>
                <span className="text-[#C09D9B] text-xs font-bold truncate">{currentEmp.title}</span>
              </div>
            </div>
            {isHRAdmin && <div className="w-max bg-red-500/20 text-red-300 text-[10px] px-2 py-1 rounded font-black border border-red-500/30">?? ?瑕? HR 蝞∠?甈?</div>}
          </div>
        )}

        <div className="flex-1 py-6 flex flex-col gap-2 overflow-y-auto px-3">
          {user && (
            <button onClick={() => setCurrentView('dashboard')} className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl transition font-bold group ${currentView==='dashboard'?'bg-[#C09D9B] text-white shadow-md':'text-gray-400 hover:bg-gray-800 hover:text-white'}`}>
              <Home size={20} className={currentView==='dashboard'?'':'group-hover:text-[#C09D9B]'} />{isSidebarOpen && <span className="truncate">?犖擐? Dashboard</span>}
            </button>
          )}
          <button onClick={() => setCurrentView('orgChart')} className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl transition font-bold group ${currentView==='orgChart'?'bg-[#C09D9B] text-white shadow-md':'text-gray-400 hover:bg-gray-800 hover:text-white'}`}>
            <Network size={20} className={currentView==='orgChart'?'':'group-hover:text-[#C09D9B]'} />{isSidebarOpen && <span className="truncate">蝯??嗆???Org Chart</span>}
          </button>
          {user && isHRAdmin && (
            <button onClick={() => setCurrentView('warRoom')} className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl transition font-bold group ${currentView==='warRoom'?'bg-[#C09D9B] text-white shadow-md':'text-gray-400 hover:bg-gray-800 hover:text-white'}`}>
              <Users size={20} className={currentView==='warRoom'?'':'group-hover:text-[#C09D9B]'} />{isSidebarOpen && <span className="truncate">??偷??War Room</span>}
            </button>
          )}

          {isHRAdmin && currentView === 'orgChart' && isSidebarOpen && (
             <div className="mt-8 pt-6 border-t border-gray-800 flex flex-col gap-3">
               <div className="px-3 text-xs font-black tracking-widest text-gray-500 mb-1 uppercase">Admin Tools</div>
               <button onClick={toggleEditMode} className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl transition font-bold ${isEditMode ? 'bg-red-500 hover:bg-red-600 text-white shadow-md' : 'bg-gray-800 hover:bg-gray-700 text-gray-300 border border-gray-700'}`}>
                 <Edit size={18} /> {isEditMode ? '??蝺刻摩璅∪?' : '?脣?嗆?蝺刻摩璅∪?'}
               </button>
               {isEditMode && (
                 <button onClick={() => { setShowBackend(true); setBackendTab('person'); }} className="w-full flex items-center gap-3 px-3 py-3 rounded-xl transition font-bold bg-[#C09D9B] hover:bg-pink-400 text-white shadow-md">
                   <Shield size={18} /> ?脣鞈?摨怠???                 </button>
               )}
             </div>
          )}
        </div>

        <div className="p-4 border-t border-gray-800 shrink-0 flex flex-col gap-3">
          {user && isSidebarOpen && (
            <button onClick={copyUID} className="flex items-center gap-2 text-xs text-gray-500 hover:text-gray-300 font-mono bg-black/30 p-2 rounded transition w-full truncate border border-gray-800 border-dashed justify-between">
              <span className="truncate flex-1 text-left">{user.uid}</span><Copy size={12} className="shrink-0"/>
            </button>
          )}
          {user ? (
            <button onClick={handleLogout} className="w-full flex items-center justify-center gap-2 p-3 text-gray-400 hover:text-white hover:bg-red-500/20 rounded-xl transition font-bold border border-transparent hover:border-red-500/30">
              <LogOut size={18} /> {isSidebarOpen && "?餃蝟餌絞"}
            </button>
          ) : (
            <button onClick={() => window.location.reload()} className="w-full flex items-center justify-center gap-2 p-3 text-[#C09D9B] hover:text-white hover:bg-[#C09D9B] rounded-xl transition font-bold border border-[#C09D9B]">
              餈??餃??            </button>
          )}
        </div>
      </div>

      <div className="flex-1 relative flex flex-col h-screen overflow-hidden bg-gray-50 z-10 w-0">
        {currentView === 'dashboard' && user && currentEmp && (
          <Dashboard
            user={user}
            currentEmp={currentEmp}
            isHRAdmin={isHRAdmin}
            setIsRescueMode={setIsRescueMode}
            setShowBackend={setShowBackend}
            setBackendTab={setBackendTab}
            setCurrentView={setCurrentView}
            attendanceLogs={attendanceLogs}
            safeDepartments={safeDepartments}
            applications={applications}
            handlePunch={handlePunch}
            setAppFormType={setAppFormType}
            setAppFormData={setAppFormData}
            appFormType={appFormType}
            appFormData={appFormData}
            handleSubmitApplication={handleSubmitApplication}
            LEAVE_TYPES={LEAVE_TYPES}
          />
        )}

        {currentView === 'orgChart' && (
          <OrgMap
            user={user}
            safeDepartments={safeDepartments}
            safeEmployees={safeEmployees}
            updateCloudData={updateCloudData}
            privateData={privateData}
            isEditMode={isEditMode}
            setIsEditMode={setIsEditMode}
            setShowBackend={setShowBackend}
            setBackendTab={setBackendTab}
            setEditingItem={setEditingItem}
            setPersonFormTab={setPersonFormTab}
            setIsFormOpen={setIsFormOpen}
          />
        )}

        {currentView === 'warRoom' && user && isHRAdmin && (
          <WarRoom
            isHRAdmin={isHRAdmin}
            currentEmp={currentEmp}
            safeDepartments={safeDepartments}
            applications={applications}
            attendanceLogs={attendanceLogs}
            sortedWarRoomEmps={sortedWarRoomEmps}
            handleApproveApplication={handleApproveApplication}
          />
        )}

        <BackendModal
          formOpen={isFormOpen}
          closeBackendForm={closeBackendForm}
          editingItem={editingItem}
          setEditingItem={setEditingItem}
          backendTab={backendTab}
          personFormTab={personFormTab}
          setPersonFormTab={setPersonFormTab}
          safeDepartments={safeDepartments}
          safeEmployees={safeEmployees}
          handleSaveItem={handleSaveItem}
        />

        {errorMsg && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 px-6 py-3 bg-gray-800 text-white font-bold rounded-full shadow-2xl z-[999] animate-fade-in flex items-center gap-2 border border-gray-700">
            {errorMsg}
          </div>
        )}
        
        {isSyncing && (
          <div className="fixed top-4 right-4 bg-white/90 backdrop-blur px-4 py-2 rounded-full shadow-lg border border-gray-200 text-xs font-bold text-gray-600 flex items-center gap-2 z-[999]">
            <div className="w-4 h-4 rounded-full border-2 border-[#C09D9B] border-t-transparent animate-spin"></div>鞈??郊銝?          </div>
        )}
      </div>
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <MainApp />
    </ErrorBoundary>
  );
}
