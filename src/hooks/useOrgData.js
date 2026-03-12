import { useState, useEffect } from 'react';
import { doc, onSnapshot, collection, setDoc } from 'firebase/firestore';
import { db, appId } from '../services/firebase';

const initialDepts = [{ id: 'dept_board', name: '董事會', parentId: null, style: 'card', isStaff: false, managerId: '' }];
const initialEmps = [{ id: 'emp_k', name: 'K大', title: '董事長', jobLevel: 'M6', deptId: 'dept_board', avatarUrl: '', concurrentDepts: [], loginEmail: '', systemRole: 'admin', enablePunch: true, workStartTime: '09:30', workEndTime: '18:30', flexMinutes: 30 }];

export function useOrgData({ user, isAuthChecking, isHRAdmin, isVisitor, setErrorMsg }) {
  const [departments, setDepartments] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [privateData, setPrivateData] = useState({});
  const [attendanceLogs, setAttendanceLogs] = useState({});
  const [applications, setApplications] = useState([]);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    if (isAuthChecking) return;
    const orgDocRef = doc(db, 'artifacts', appId, 'public', 'data', 'orgData', 'org_v2');
    
    const unsubOrg = onSnapshot(orgDocRef, d => {
      if (d.exists()) {
        const v = d.data();
        setDepartments(Array.isArray(v.departments) ? v.departments : []);
        setEmployees(Array.isArray(v.employees) ? v.employees.map(e => ({
          ...e,
          concurrentDepts: Array.isArray(e.concurrentDepts) ? e.concurrentDepts.filter(c => c && c.deptId) : []
        })) : []);
      } else if (user && isHRAdmin) {
        setDoc(orgDocRef, JSON.parse(JSON.stringify({ departments: initialDepts, employees: initialEmps }))).catch(console.error);
      }
    }, e => { 
      console.error(e); 
      if (!user && isVisitor) setErrorMsg('訪客權限不足，請聯繫 HR。'); 
    });

    let unsubAtt = () => {}; 
    let unsubApp = () => {};
    
    if (user) {
      unsubAtt = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'attendance'), s => {
        const l = {}; 
        s.forEach(docSnap => { l[docSnap.id] = docSnap.data().records || {}; }); 
        setAttendanceLogs(l);
      }, e => console.error(e));

      unsubApp = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'applications'), s => {
        const a = []; 
        s.forEach(docSnap => a.push({ docId: docSnap.id, ...docSnap.data() }));
        a.sort((x, y) => y.createdAt - x.createdAt); 
        setApplications(a);
      }, e => console.error(e));
    }

    return () => { unsubOrg(); unsubAtt(); unsubApp(); };
  }, [user, isAuthChecking, isHRAdmin, isVisitor, setErrorMsg]);

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
  }, [user, isHRAdmin, setErrorMsg]);

  const updateCloudData = async (nD, nE, nP = privateData) => {
    if (!user || !isHRAdmin) {
        setErrorMsg('權限不足。');
        return;
    }
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

  return {
    departments,
    employees,
    privateData,
    attendanceLogs,
    applications,
    isSyncing,
    updateCloudData
  };
}
