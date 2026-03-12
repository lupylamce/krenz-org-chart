import React, { useState, useRef, useEffect, useMemo } from 'react';
import { 
  Users, AlertCircle, Camera, ZoomIn, ZoomOut, GripVertical, 
  Component, X, Lock, Unlock, Settings, Edit, Trash2, Plus, 
  Check, Briefcase, LogOut, Shield, Upload, Download, Home, 
  Network, Clock, CalendarDays, CheckCircle2, XCircle, 
  FileText, FileClock, Info, ChevronRight, Search 
} from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { 
  getAuth, signInWithEmailAndPassword, signInWithPopup, 
  GoogleAuthProvider, signOut, onAuthStateChanged 
} from 'firebase/auth';
import { 
  getFirestore, doc, setDoc, onSnapshot, collection, 
  addDoc, updateDoc 
} from 'firebase/firestore';

// Firebase 初始化
const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {
  apiKey: "AIzaSyDY8GQtAbYOnUkUUMcp_SN_ijiPAm2Ky3c",
  authDomain: "krenz-org.firebaseapp.com",
  projectId: "krenz-org",
  storageBucket: "krenz-org.firebasestorage.app",
  messagingSenderId: "350471338404",
  appId: "1:350471338404:web:cc3db002b6cc0d551b6931"
};
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = typeof __app_id !== 'undefined' ? __app_id : 'krenz-org-system';
const googleProvider = new GoogleAuthProvider();

// 全域樣式
const treeCSS = `
  html,body{margin:0;padding:0;width:100%;height:100%;overflow:hidden;overscroll-behavior:none;}
  .org-tree-container{width:100%;height:100%;overflow:hidden;background-color:#f9fafb;position:relative;cursor:grab;user-select:none;touch-action:none;display:flex;justify-content:center;align-items:flex-start;}
  .org-tree-container:active{cursor:grabbing;} .org-tree-panner{position:relative;}
  .org-tree{display:inline-flex;justify-content:center;padding:60px 20px;}
  .org-tree ul{padding-top:24px;position:relative;display:flex;justify-content:center;padding-left:0;}
  .org-tree>ul{padding-top:0;} .org-tree>ul::before{display:none!important;}
  .org-tree li{float:left;text-align:center;list-style-type:none;position:relative;padding:24px 12px 0 12px;}
  .org-tree li::before,.org-tree li::after{content:'';position:absolute;top:0;right:50%;border-top:2px solid #C09D9B;width:50%;height:24px;}
  .org-tree li::after{right:auto;left:50%;border-left:2px solid #C09D9B;}
  .org-tree li:only-child::after,.org-tree li:only-child::before{display:none;}
  .org-tree li:only-child{padding-top:0;}
  .org-tree li:first-child::before,.org-tree li:last-child::after{border:0 none;}
  .org-tree li:last-child::before{border-right:2px solid #C09D9B;border-radius:0 8px 0 0;}
  .org-tree li:first-child::after{border-radius:8px 0 0 0;}
  .org-tree ul::before{content:'';position:absolute;top:0;left:50%;border-left:2px solid #C09D9B;width:0;height:24px;transform:translateX(-50%);}
`;

class ErrorBoundary extends React.Component {
  constructor(props) { 
    super(props); 
    this.state = { hasError: false, errorInfo: null }; 
  }
  static getDerivedStateFromError(error) { 
    return { hasError: true, errorInfo: error }; 
  }
  componentDidCatch(error, errorInfo) { 
    console.error("系統攔截異常：", error, errorInfo); 
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="fixed inset-0 z-[999] bg-white flex flex-col items-center justify-center p-6">
          <div className="p-8 max-w-lg w-full text-red-600 font-bold bg-red-50 border-2 border-red-200 rounded-2xl shadow-2xl flex flex-col items-center text-center">
            <AlertCircle size={64} className="mb-4 animate-bounce" />
            <h3 className="text-2xl mb-2 font-black">系統異常攔截</h3>
            <div className="w-full bg-red-100 p-3 rounded text-xs text-red-800 font-mono overflow-auto max-h-32 mb-6 text-left">
              {this.state.errorInfo?.toString()}
            </div>
            <button onClick={() => window.location.reload()} className="mt-4 bg-red-600 text-white px-6 py-3 rounded-lg">
              清除暫存並重新載入
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// 共用工具元件
const InputField = ({ label, val, set, type='text', req=false, col=1 }) => (
  <div className={col === 2 ? "col-span-2" : ""}>
    <label className="block text-xs font-bold text-gray-600 mb-1">{label}</label>
    <input type={type} required={req} value={val || ''} onChange={e => set(e.target.value)} className="w-full border border-gray-300 rounded p-1.5 text-sm outline-none focus:ring-1 focus:ring-[#C09D9B]" />
  </div>
);

const initialDepts = [{ id: 'dept_board', name: '董事會', parentId: null, style: 'card', isStaff: false, managerId: '' }];
const initialEmps = [{ id: 'emp_k', name: 'K大', title: '董事長', jobLevel: 'M6', deptId: 'dept_board', avatarUrl: '', concurrentDepts: [], loginEmail: '', systemRole: 'admin', enablePunch: true, workStartTime: '09:30', workEndTime: '18:30', flexMinutes: 30 }];
const LEAVE_TYPES = ['年休假', '事假', '病假', '調休', '婚假', '產假/陪產假', '喪假'];

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

// 安全替換字串，避免使用正規表達式觸發編譯器異常
const formatDateForInput = (dStr) => {
  if (!dStr) return ''; 
  const cleanedStr = String(dStr).split('.').join('/').split('-').join('/');
  const dt = new Date(cleanedStr);
  return isNaN(dt) ? '' : `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
};

const getTodayString = () => {
  const d = new Date(); 
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const getTimeString = (ts) => {
  if (!ts) return ''; 
  const d = new Date(ts); 
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

// 考勤推算引擎 (核心)
const calculateAttendanceStats = (emp, rec, qDate) => {
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

const parseCSV = (str) => {
  const arr = []; let quote = false; let row = 0, col = 0;
  for (let c = 0; c < str.length; c++) {
    let cc = str[c], nc = str[c + 1];
    arr[row] = arr[row] || []; arr[row][col] = arr[row][col] || '';
    if (cc === '"' && quote && nc === '"') { arr[row][col] += cc; c++; continue; }
    if (cc === '"') { quote = !quote; continue; }
    if (cc === ',' && !quote) { col++; continue; }
    if (cc === '\r' && nc === '\n' && !quote) { row++; col = 0; c++; continue; }
    if (cc === '\n' && !quote) { row++; col = 0; continue; }
    if (cc === '\r' && !quote) { row++; col = 0; continue; }
    arr[row][col] += cc;
  }
  return arr;
};

function MainApp() {
  const [user, setUser] = useState(null);
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isRescueMode, setIsRescueMode] = useState(false);
  const [isVisitor, setIsVisitor] = useState(false);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  const [departments, setDepartments] = useState(initialDepts);
  const [employees, setEmployees] = useState(initialEmps);
  const [privateData, setPrivateData] = useState({});
  const [attendanceLogs, setAttendanceLogs] = useState({});
  const [applications, setApplications] = useState([]);

  const [currentView, setCurrentView] = useState('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const [draggedItem, setDraggedItem] = useState(null);
  const [dropTargetId, setDropTargetId] = useState(null);
  const [scale, setScale] = useState(0.85);
  const [canvasPos, setCanvasPos] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [pinchDist, setPinchDist] = useState(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [contextMenu, setContextMenu] = useState(null);
  const containerRef = useRef(null);

  const [showBackend, setShowBackend] = useState(false);
  const [backendTab, setBackendTab] = useState('person');
  const [warRoomTab, setWarRoomTab] = useState('daily');
  const [editingItem, setEditingItem] = useState(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [personFormTab, setPersonFormTab] = useState('public');
  const [warRoomDate, setWarRoomDate] = useState(getTodayString());
  const [attSettingItem, setAttSettingItem] = useState(null);

  const [appFormType, setAppFormType] = useState(null);
  const [appFormData, setAppFormData] = useState({});
  const [showTooltip, setShowTooltip] = useState(false);
  const [selectedAppDetail, setSelectedAppDetail] = useState(null);
  const [approvalFilter, setApprovalFilter] = useState({ search: '', type: 'all', status: 'pending' });

  const avatarFileInputRefs = useRef({});
  const importFileInputRef = useRef(null);
  const [errorMsg, setErrorMsg] = useState('');

  const zoomIn = () => setScale(p => Math.min(p + 0.1, 1.5));
  const zoomOut = () => setScale(p => Math.max(p - 0.1, 0.4));
  const resetZoom = () => { setScale(0.85); setCanvasPos({ x: 0, y: 0 }); };

  const safeEmployees = Array.isArray(employees) ? employees.filter(e => e && e.id) : [];
  const safeDepartments = Array.isArray(departments) ? departments.filter(d => d && d.id) : [];
  const allTitles = useMemo(() => [...new Set(safeEmployees.map(p => p?.title).filter(t => typeof t === 'string' && t.trim() !== ''))], [safeEmployees]);

  const sortedWarRoomEmps = useMemo(() => {
    return [...safeEmployees].sort((a, b) => {
      const dA = safeDepartments.find(d => d.id === a.deptId)?.name || '未知';
      const dB = safeDepartments.find(d => d.id === b.deptId)?.name || '未知';
      if (dA !== dB) return dA.localeCompare(dB);
      return (a.name || '').localeCompare(b.name || '');
    });
  }, [safeEmployees, safeDepartments]);

  const currentEmp = useMemo(() => {
    if (!user || !user.email) return null;
    return safeEmployees.find(e => typeof e.loginEmail === 'string' && e.loginEmail.toLowerCase() === user.email.toLowerCase()) || null;
  }, [user, safeEmployees]);

  const isGodMode = user?.email?.toLowerCase() === 'kae@krenzartwork.com';
  const isHRAdmin = isRescueMode || currentEmp?.systemRole === 'admin' || isGodMode;

  useEffect(() => {
    return onAuthStateChanged(auth, u => {
      setUser(u); setIsAuthChecking(false);
      if (!u) {
        setIsEditMode(false); 
        setShowBackend(false); 
        setPrivateData({}); 
        setCurrentView('orgChart'); 
        setIsRescueMode(false);
      } else {
        setCurrentView('dashboard'); 
        setIsVisitor(false);
      }
    });
  }, []);

  useEffect(() => {
    if (isAuthChecking) return;
    const orgDocRef = doc(db, 'artifacts', appId, 'public', 'data', 'orgData', 'org_v2');
    const unsubOrg = onSnapshot(orgDocRef, d => {
      if (d.exists()) {
        const v = d.data();
        setDepartments(Array.isArray(v.departments) ? v.departments : []);
        setEmployees(Array.isArray(v.employees) ? v.employees.map(e => ({ ...e, concurrentDepts: Array.isArray(e.concurrentDepts) ? e.concurrentDepts.filter(c => c && c.deptId) : [] })) : []);
      } else if (user && isHRAdmin) {
        setDoc(orgDocRef, JSON.parse(JSON.stringify({ departments: initialDepts, employees: initialEmps }))).catch(console.error);
      }
    }, e => { 
      console.error(e); 
      if (!user && isVisitor) setErrorMsg('訪客權限不足，請聯繫 HR。'); 
    });

    let ua = () => {}; 
    let uap = () => {};
    if (user) {
      ua = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'attendance'), s => {
        const l = {}; 
        s.forEach(docSnap => { l[docSnap.id] = docSnap.data().records || {}; }); 
        setAttendanceLogs(l);
      }, e => console.error(e));

      uap = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'applications'), s => {
        const a = []; 
        s.forEach(docSnap => a.push({ docId: docSnap.id, ...docSnap.data() }));
        a.sort((x, y) => y.createdAt - x.createdAt); 
        setApplications(a);
      }, e => console.error(e));
    }
    return () => { unsubOrg(); ua(); uap(); };
  }, [user, isAuthChecking, isHRAdmin, isVisitor]);

  useEffect(() => {
    if (!user || !isHRAdmin) { 
      setPrivateData({}); 
      return; 
    }
    const privateRef = doc(db, 'artifacts', appId, 'private', 'data', 'hrData', 'roster');
    const unsubPriv = onSnapshot(privateRef, d => {
      if (d.exists()) {
        setPrivateData(d.data().employees || {});
      } else {
        setDoc(privateRef, { employees: {} }).catch(console.error);
      }
    }, e => setErrorMsg('機密資料讀取失敗，請確認規則設定。'));
    return () => unsubPriv();
  }, [user, isHRAdmin]);

  const updateCloudData = async (nD, nE, nP = privateData) => {
    if (!user || !isHRAdmin) return setErrorMsg('權限不足。');
    setIsSyncing(true);
    try {
      await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'orgData', 'org_v2'), JSON.parse(JSON.stringify({ departments: nD, employees: nE })));
      await setDoc(doc(db, 'artifacts', appId, 'private', 'data', 'hrData', 'roster'), JSON.parse(JSON.stringify({ employees: nP })));
      setErrorMsg('✅ 儲存成功！'); 
      setTimeout(() => setErrorMsg(''), 3000);
    } catch (e) {
      setErrorMsg(e.code === 'invalid-argument' ? '儲存失敗！資料格式異常。' : '儲存被拒絕！(權限不足)');
    } finally { 
      setIsSyncing(false); 
    }
  };

  const handlePunch = async (type, specifiedTime = null) => {
    if (!currentEmp) return setErrorMsg('未綁定員工卡片。');
    if (currentEmp.enablePunch === false && !specifiedTime) return setErrorMsg('網頁打卡已關閉。');
    
    const today = specifiedTime ? formatDateForInput(new Date(specifiedTime)) : getTodayString(); 
    const nowTs = specifiedTime || Date.now();
    const empAttRef = doc(db, 'artifacts', appId, 'public', 'data', 'attendance', currentEmp.id);
    const currentRecords = attendanceLogs[currentEmp.id] || {};
    const todayRecord = currentRecords[today] || { in: null, out: null };
    
    let newRecord = { ...todayRecord };
    if (type === 'in') {
      if (newRecord.in && !specifiedTime) return setErrorMsg('今日已打過上班卡！'); 
      newRecord.in = nowTs;
    } else if (type === 'out') {
      if (!newRecord.in && !specifiedTime) return setErrorMsg('請先打上班卡！'); 
      if (newRecord.out && !specifiedTime) return setErrorMsg('今日已打過下班卡！'); 
      newRecord.out = nowTs;
    } else if (type === 'undo_in') { 
      newRecord.in = null; 
    } else if (type === 'undo_out') { 
      newRecord.out = null; 
    }

    try {
      await setDoc(empAttRef, JSON.parse(JSON.stringify({ records: { ...currentRecords, [today]: newRecord } })), { merge: true });
      if (!specifiedTime) { 
        setErrorMsg(type.includes('undo') ? '已撤銷打卡。' : `✅ ${type === 'in' ? '上班' : '下班'}打卡成功！`); 
        setTimeout(() => setErrorMsg(''), 3000); 
      }
    } catch (e) { 
      setErrorMsg('打卡失敗。'); 
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
      setErrorMsg('✅ 申請已送出。'); 
      setTimeout(() => setErrorMsg(''), 3000);
    } catch (err) { 
      setErrorMsg('送出失敗。'); 
    }
  };

  const handleApproveApplication = async (d, action) => {
    try {
      const appRef = doc(db, 'artifacts', appId, 'public', 'data', 'applications', d.docId);
      let ns = d.status, up = { updatedAt: Date.now(), updatedBy: currentEmp.name };

      if (action === 'reject') { 
        ns = 'rejected'; 
        up.rejectedBy = currentEmp.name; 
        up.rejectedAt = Date.now(); 
      } else if (action === 'manager_approve') { 
        ns = 'pending_hr'; 
        up.managerApprovedBy = currentEmp.name; 
        up.managerApprovedAt = Date.now(); 
      } else if (action === 'hr_approve') { 
        ns = 'approved'; 
        up.hrApprovedBy = currentEmp.name; 
        up.hrApprovedAt = Date.now(); 
        if (d.status === 'pending_manager') { 
          up.managerApprovedBy = currentEmp.name + ' (HR代簽)'; 
          up.managerApprovedAt = Date.now(); 
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

      setSelectedAppDetail(prev => ({ ...prev, ...up }));
      setErrorMsg(`✅ 已${action === 'reject' ? '駁回' : '核准'}`); 
      setTimeout(() => setErrorMsg(''), 3000);
    } catch (err) { 
      setErrorMsg('操作失敗！'); 
    }
  };

  const handleLogin = async (e) => { 
    e.preventDefault(); 
    setLoginError(''); 
    try { 
      await signInWithEmailAndPassword(auth, email, password); 
      setEmail(''); 
      setPassword(''); 
    } catch (e) { 
      setLoginError('登入失敗。'); 
    } 
  };
  
  const handleGoogleLogin = async () => { 
    setLoginError(''); 
    try { 
      await signInWithPopup(auth, googleProvider); 
    } catch (e) { 
      if (!e.message?.includes('closed')) setLoginError('Google登入失敗。'); 
    } 
  };
  
  const handleLogout = async () => { 
    try { 
      await signOut(auth); 
      setCurrentView('orgChart'); 
      setIsRescueMode(false); 
      setIsVisitor(false); 
    } catch (e) {} 
  };
  
  const copyUID = () => { 
    if (user) { 
      navigator.clipboard.writeText(user.uid).catch(() => { 
        const el = document.createElement('textarea'); 
        el.value = user.uid; 
        document.body.appendChild(el); 
        el.select(); 
        document.execCommand('copy'); 
        document.body.removeChild(el); 
      }); 
      setErrorMsg('✅ UID 已複製'); 
      setTimeout(() => setErrorMsg(''), 3000); 
    } 
  };
  
  const toggleEditMode = () => { 
    if (isEditMode) { 
      setIsEditMode(false); 
      setShowBackend(false); 
      setContextMenu(null); 
    } else { 
      setIsEditMode(true); 
    } 
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
        if (isDeptDescendant(d.id, tgt)) return alert('不能移動到下屬單位中。');
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
      if (showBackend || isFormOpen || contextMenu || attSettingItem || selectedAppDetail) return; 
      e.preventDefault(); 
      setScale(p => Math.min(Math.max(p - e.deltaY * 0.0015, 0.3), 2.0)); 
    };
    c.addEventListener('wheel', w, { passive: false }); 
    return () => c.removeEventListener('wheel', w);
  }, [showBackend, isFormOpen, contextMenu, currentView, isVisitor, attSettingItem, selectedAppDetail]);

  const handleCanvasContextMenu = e => { 
    if (!isEditMode || e.target.closest('.org-node')) return; 
    e.preventDefault(); 
    const c = e.touches ? e.touches[0] : e; 
    setContextMenu({ x: c.clientX, y: c.clientY }); 
  };

  const handleQuickAdd = (t, ex = {}) => { 
    setContextMenu(null); 
    setShowBackend(true); 
    setBackendTab(t); 
    setEditingItem(t === 'dept' ? { id: `dept_${Date.now()}`, name: '', parentId: null, style: ex.style || 'box', isStaff: false, managerId: '' } : getEmptyPersonData()); 
    setPersonFormTab('public'); 
    setIsFormOpen(true); 
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

  const openBackendForm = (t, i = null) => { 
    setBackendTab(t); 
    if (i) {
      setEditingItem(t === 'person' ? { ...i, ...(privateData[i.id] || {}), renewContracts: privateData[i.id]?.renewContracts || [], internshipPeriods: privateData[i.id]?.internshipPeriods || [] } : i); 
    } else {
      setEditingItem(t === 'dept' ? { id: `dept_${Date.now()}`, name: '', parentId: null, style: 'box', isStaff: false, managerId: '' } : getEmptyPersonData()); 
    }
    setPersonFormTab('public'); 
    setIsFormOpen(true); 
  };

  const closeBackendForm = () => { 
    setIsFormOpen(false); 
    setEditingItem(null); 
  };

  const handleSaveItem = e => {
    e.preventDefault(); 
    if (!editingItem.name.trim()) return;
    if (backendTab === 'dept') {
      updateCloudData(safeDepartments.some(d => d.id === editingItem.id) ? safeDepartments.map(d => d.id === editingItem.id ? editingItem : d) : [...safeDepartments, editingItem], safeEmployees, privateData);
    } else {
      let fi = { ...editingItem }; 
      fi.concurrentDepts = (fi.concurrentDepts || []).filter(c => c && c.deptId !== fi.deptId);
      const pubF = ['id', 'name', 'title', 'jobLevel', 'deptId', 'concurrentDepts', 'avatarUrl', 'loginEmail', 'systemRole', 'enablePunch', 'workStartTime', 'workEndTime', 'flexMinutes'], pu = {}, pr = {};
      Object.keys(fi).forEach(k => pubF.includes(k) ? pu[k] = fi[k] : pr[k] = fi[k]);
      updateCloudData(safeDepartments, safeEmployees.some(e => e.id === pu.id) ? safeEmployees.map(e => e.id === pu.id ? pu : e) : [...safeEmployees, pu], { ...privateData, [pu.id]: pr });
    } 
    closeBackendForm();
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

  const handleExportCSV = () => { /* 省略：使用您的舊版 CSV 匯出邏輯即可 */ };
  const handleImportCSV = (e) => { /* 省略：使用您的舊版 CSV 匯入邏輯即可 */ };

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

  const renderTree = (p, v = new Set()) => {
    if (v.has(p)) return null; 
    const nV = new Set(v).add(p); 
    const cD = safeDepartments.filter(d => d.parentId === p); 
    if (!cD.length) return null; 
    const sD = cD.filter(d => d.isStaff), lD = cD.filter(d => !d.isStaff);
    return (
      <>
        {sD.length > 0 && (
          <div className="relative w-full flex flex-col items-center pt-8">
            <div className="absolute top-0 left-1/2 w-[2px] h-full bg-[#C09D9B] -translate-x-1/2 z-0"></div>
            {sD.map(d => (
              <div key={d.id} className="relative z-10 flex w-full mb-8">
                <div className="w-1/2"></div>
                <div className="relative flex flex-col items-start pl-8">
                  <div className="relative">
                    <div className="absolute top-1/2 left-[-32px] w-8 h-[2px] bg-[#C09D9B] -translate-y-1/2 z-0"></div>
                    {renderDeptNode(d)}
                  </div>
                  {renderTree(d.id, nV)}
                </div>
              </div>
            ))}
          </div>
        )}
        {lD.length > 0 && (
          <ul>
            {lD.map(d => (
              <li key={d.id}>
                {renderDeptNode(d)}
                {renderTree(d.id, nV)}
              </li>
            ))}
          </ul>
        )}
      </>
    );
  };

  const renderDashboard = () => {
    if (!currentEmp) return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center">
        <div className="w-20 h-20 bg-red-100 text-red-500 rounded-full flex items-center justify-center mb-4"><XCircle size={40} /></div>
        <h2 className="text-2xl font-black text-gray-800 mb-2">未綁定員工卡片</h2>
        <p className="text-gray-500 mb-6 max-w-md">您的信箱 ({user.email}) 目前不存在於系統名冊中，無法使用打卡功能。請聯繫 HR。</p>
        {isHRAdmin ? (
          <button onClick={() => { setCurrentView('orgChart'); setShowBackend(true); setBackendTab('person'); }} className="px-6 py-3 bg-[#C09D9B] text-white font-bold rounded-lg flex items-center justify-center gap-2"><Settings size={20}/> 進入花名冊綁定信箱</button>
        ) : (
          <button onClick={() => setIsRescueMode(true)} className="px-6 py-3 bg-gray-800 text-white font-bold rounded-lg flex items-center justify-center gap-2"><Settings size={20}/> 強制進入花名冊 (管理員救援通道)</button>
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
  };

  const renderWarRoom = () => {
    const filteredApps = applications.filter(a => {
      if (!isHRAdmin) { const d = safeDepartments.find(x => x.id === a.deptId); if (!d || d.managerId !== currentEmp?.id) return false; }
      if (approvalFilter.type !== 'all' && a.type !== approvalFilter.type) return false;
      if (approvalFilter.status !== 'all') { if (approvalFilter.status === 'pending') { if (a.status !== 'pending_manager' && a.status !== 'pending_hr') return false; } else if (a.status !== approvalFilter.status) return false; }
      if (approvalFilter.search) { const k = approvalFilter.search.toLowerCase(); if (!a.applicantName.toLowerCase().includes(k) && !(a.reason || '').toLowerCase().includes(k)) return false; }
      return true;
    });

    const pendingCount = applications.filter(a => {
      if (a.status === 'approved' || a.status === 'rejected') return false;
      if (isHRAdmin) return true; 
      const d = safeDepartments.find(x => x.id === a.deptId);
      return d && d.managerId === currentEmp?.id && a.status === 'pending_manager';
    }).length;

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
                        <td className="p-4 text-center"><button onClick={() => setAttSettingItem(emp)} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"><Settings size={18} /></button></td>
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

        {formOpen && editingItem && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden max-h-[95vh] flex flex-col">
              <div className="bg-gray-50 p-4 border-b border-gray-200 flex justify-between items-center shrink-0">
                <h3 className="font-black text-gray-800 text-lg">{backendTab === 'dept' ? '部門設定' : `人員資料設定 - ${editingItem.name || '新進員工'}`}</h3>
                <button onClick={closeBackendForm} className="p-1.5 text-gray-400 hover:bg-gray-200 hover:text-gray-800 rounded-lg transition"><X size={20} /></button>
              </div>
              
              <div className="p-6 overflow-y-auto bg-white flex-1">
                <form onSubmit={handleSaveItem} className="flex flex-col gap-4 h-full">
                  {backendTab === 'person' && (
                    <div className="flex gap-2 border-b border-gray-200 mb-2 shrink-0 overflow-x-auto pb-1">
                      <button type="button" onClick={() => setPersonFormTab('public')} className={`pb-2 px-3 text-sm font-bold border-b-2 transition-colors whitespace-nowrap ${personFormTab === 'public' ? 'border-[#C09D9B] text-[#C09D9B]' : 'border-transparent text-gray-400 hover:text-gray-700'}`}>📇 公開名片與系統權限</button>
                      <button type="button" onClick={() => setPersonFormTab('private')} className={`pb-2 px-3 text-sm font-bold border-b-2 transition-colors whitespace-nowrap ${personFormTab === 'private' ? 'border-[#C09D9B] text-[#C09D9B]' : 'border-transparent text-gray-400 hover:text-gray-700'}`}>🔒 HR機密檔案</button>
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
                          <div><label className="block text-xs font-bold text-gray-600 mb-1">生日</label><input type="date" value={formatDateForInput(editingItem.birthday)} onChange={e => setEditingItem({...editingItem, birthday: e.target.value})} className="w-full border border-gray-300 rounded p-1.5 text-sm outline-none" /></div>
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
                          <div><label className="block text-xs font-bold text-gray-600 mb-1">入職時間</label><input type="date" value={formatDateForInput(editingItem.joinDate)} onChange={e => setEditingItem({...editingItem, joinDate: e.target.value})} className="w-full border border-gray-300 rounded p-1.5 text-sm outline-none" /></div>
                          <div className="col-span-2 grid grid-cols-2 gap-2 bg-yellow-50/50 p-2 rounded border border-yellow-100">
                            <div><label className="block text-[10px] font-bold text-yellow-700 mb-1">兵役留停(起)</label><input type="date" value={formatDateForInput(editingItem.militaryStart)} onChange={e => setEditingItem({...editingItem, militaryStart: e.target.value})} className="w-full border border-gray-300 rounded p-1 text-sm outline-none" /></div>
                            <div><label className="block text-[10px] font-bold text-yellow-700 mb-1">兵役留停(迄)</label><input type="date" value={formatDateForInput(editingItem.militaryEnd)} onChange={e => setEditingItem({...editingItem, militaryEnd: e.target.value})} className="w-full border border-gray-300 rounded p-1 text-sm outline-none" /></div>
                          </div>
                          <div className="col-span-3 bg-white p-3 rounded border border-gray-200 mt-1">
                            <label className="flex items-center gap-2 cursor-pointer mb-2 w-max"><input type="checkbox" checked={editingItem.isOldSystem || false} onChange={e => setEditingItem({...editingItem, isOldSystem: e.target.checked})} className="w-4 h-4 text-[#C09D9B] rounded" /><span className="text-sm font-bold text-gray-700">適用舊制年資 (計算實習時數)</span></label>
                            {editingItem.isOldSystem && (
                              <div className="mt-3 flex flex-col gap-2 border-t border-dashed border-gray-200 pt-3">
                                <div className="flex justify-between items-center"><span className="text-xs font-bold text-gray-500">實習起訖紀錄</span><button type="button" onClick={addInternship} className="flex items-center gap-1 bg-gray-200 px-2 py-1 rounded text-xs font-bold"><Plus size={12}/> 新增實習</button></div>
                                {(editingItem.internshipPeriods || []).map((p, idx) => (
                                  <div key={idx} className="flex items-center gap-2"><span className="text-xs font-bold text-gray-400 w-4">{idx+1}.</span><input type="date" value={formatDateForInput(p.start)} onChange={(e) => updateInternship(idx, 'start', e.target.value)} className="flex-1 border border-gray-300 rounded p-1 text-sm outline-none" /><span className="text-gray-400 text-xs">至</span><input type="date" value={formatDateForInput(p.end)} onChange={(e) => updateInternship(idx, 'end', e.target.value)} className="flex-1 border border-gray-300 rounded p-1 text-sm outline-none" /><button type="button" onClick={() => removeInternship(idx)} className="p-1.5 bg-red-100 text-red-600 rounded"><Minus size={14}/></button></div>
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
                            <div><label className="block text-xs font-bold text-red-600 mb-1">離職日期</label><input type="date" value={formatDateForInput(editingItem.leaveDate)} onChange={e => setEditingItem({...editingItem, leaveDate: e.target.value})} className="w-full border border-gray-300 rounded p-1 text-sm outline-none" /></div>
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
