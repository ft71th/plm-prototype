import { useState, useCallback } from 'react';
import type { PLMNode, ItemType } from '../types';

type IdType = ItemType | 'customer' | 'implementation';

interface Counters {
  sysIdCounter: number;
  subIdCounter: number;
  funIdCounter: number;
  tcIdCounter: number;
  ucIdCounter: number;
  actIdCounter: number;
  cusIdCounter: number;
  pltIdCounter: number;
  prjIdCounter: number;
  impIdCounter: number;
  parIdCounter: number;
  hwIdCounter: number;
}

export default function useIdCounters() {
  const [nodeId, setNodeId] = useState(11);
  const [cusIdCounter, setCusIdCounter] = useState(2);
  const [pltIdCounter, setPltIdCounter] = useState(1);
  const [prjIdCounter, setPrjIdCounter] = useState(3);
  const [impIdCounter, setImpIdCounter] = useState(2);
  const [sysIdCounter, setSysIdCounter] = useState(2);
  const [subIdCounter, setSubIdCounter] = useState(3);
  const [funIdCounter, setFunIdCounter] = useState(4);
  const [tcIdCounter, setTcIdCounter] = useState(1);
  const [parIdCounter, setParIdCounter] = useState(1);
  const [hwIdCounter, setHwIdCounter] = useState(1);
  const [ucIdCounter, setUcIdCounter] = useState(1);
  const [actIdCounter, setActIdCounter] = useState(1);

  const generateItemId = useCallback((itemType: string): string => {
    const pad = (n: number) => String(n).padStart(3, '0');
    switch (itemType) {
      case 'system': { const id = `SYS-${pad(sysIdCounter)}`; setSysIdCounter(c => c + 1); return id; }
      case 'subsystem': { const id = `SUB-${pad(subIdCounter)}`; setSubIdCounter(c => c + 1); return id; }
      case 'function': { const id = `FUN-${pad(funIdCounter)}`; setFunIdCounter(c => c + 1); return id; }
      case 'testcase': { const id = `TC-${pad(tcIdCounter)}`; setTcIdCounter(c => c + 1); return id; }
      case 'usecase': { const id = `UC-${pad(ucIdCounter)}`; setUcIdCounter(c => c + 1); return id; }
      case 'actor': { const id = `ACT-${pad(actIdCounter)}`; setActIdCounter(c => c + 1); return id; }
      case 'customer': { const id = `CUS-${pad(cusIdCounter)}`; setCusIdCounter(c => c + 1); return id; }
      case 'platform': { const id = `PLT-${pad(pltIdCounter)}`; setPltIdCounter(c => c + 1); return id; }
      case 'implementation': { const id = `IMP-${pad(impIdCounter)}`; setImpIdCounter(c => c + 1); return id; }
      case 'parameter': { const id = `PAR-${pad(parIdCounter)}`; setParIdCounter(c => c + 1); return id; }
      case 'hardware': { const id = `HW-${pad(hwIdCounter)}`; setHwIdCounter(c => c + 1); return id; }
      default: { const id = `PRJ-${pad(prjIdCounter)}`; setPrjIdCounter(c => c + 1); return id; }
    }
  }, [sysIdCounter, subIdCounter, funIdCounter, tcIdCounter, ucIdCounter, actIdCounter,
      cusIdCounter, pltIdCounter, prjIdCounter, impIdCounter, parIdCounter, hwIdCounter]);

  const setCountersFromNodes = useCallback((projectNodes: PLMNode[]) => {
    if (!projectNodes || projectNodes.length === 0) {
      setNodeId(1);
      setCusIdCounter(1); setPltIdCounter(1); setPrjIdCounter(1); setImpIdCounter(1);
      setSysIdCounter(1); setSubIdCounter(1); setFunIdCounter(1); setParIdCounter(1);
      setHwIdCounter(1); setTcIdCounter(1); setUcIdCounter(1); setActIdCounter(1);
      return;
    }

    const maxNodeId = Math.max(...projectNodes.map((n: any) => parseInt(n.id) || 0), 0);
    setNodeId(maxNodeId + 1);

    let maxCus = 0, maxPlt = 0, maxPrj = 0, maxImp = 0;
    let maxSys = 0, maxSub = 0, maxFun = 0, maxPar = 0, maxHw = 0;
    let maxTc = 0, maxUc = 0, maxAct = 0;

    projectNodes.forEach((n: any) => {
      const reqId = n.data?.reqId || '';
      const num = parseInt(reqId.split('-')[1]) || 0;
      if (reqId.startsWith('CUS')) maxCus = Math.max(maxCus, num);
      if (reqId.startsWith('PLT')) maxPlt = Math.max(maxPlt, num);
      if (reqId.startsWith('PRJ')) maxPrj = Math.max(maxPrj, num);
      if (reqId.startsWith('IMP')) maxImp = Math.max(maxImp, num);
      if (reqId.startsWith('SYS')) maxSys = Math.max(maxSys, num);
      if (reqId.startsWith('SUB')) maxSub = Math.max(maxSub, num);
      if (reqId.startsWith('FUN')) maxFun = Math.max(maxFun, num);
      if (reqId.startsWith('PAR')) maxPar = Math.max(maxPar, num);
      if (reqId.startsWith('HW')) maxHw = Math.max(maxHw, num);
      if (reqId.startsWith('TC')) maxTc = Math.max(maxTc, num);
      if (reqId.startsWith('UC')) maxUc = Math.max(maxUc, num);
      if (reqId.startsWith('ACT')) maxAct = Math.max(maxAct, num);
    });

    setCusIdCounter(maxCus + 1); setPltIdCounter(maxPlt + 1);
    setPrjIdCounter(maxPrj + 1); setImpIdCounter(maxImp + 1);
    setSysIdCounter(maxSys + 1); setSubIdCounter(maxSub + 1);
    setFunIdCounter(maxFun + 1); setParIdCounter(maxPar + 1);
    setHwIdCounter(maxHw + 1);  setTcIdCounter(maxTc + 1);
    setUcIdCounter(maxUc + 1);  setActIdCounter(maxAct + 1);
  }, []);

  const incrementCounter = useCallback((itemType: string) => {
    switch (itemType) {
      case 'system': setSysIdCounter(c => c + 1); break;
      case 'subsystem': setSubIdCounter(c => c + 1); break;
      case 'function': setFunIdCounter(c => c + 1); break;
      case 'hardware': setHwIdCounter(c => c + 1); break;
      case 'parameter': setParIdCounter(c => c + 1); break;
      case 'testcase': setTcIdCounter(c => c + 1); break;
      case 'usecase': setUcIdCounter(c => c + 1); break;
      case 'actor': setActIdCounter(c => c + 1); break;
      case 'customer': setCusIdCounter(c => c + 1); break;
      case 'platform': setPltIdCounter(c => c + 1); break;
      case 'implementation': setImpIdCounter(c => c + 1); break;
      default: setPrjIdCounter(c => c + 1); break;
    }
  }, []);

  return {
    nodeId, setNodeId,
    generateItemId, setCountersFromNodes, incrementCounter,
    counters: {
      sysIdCounter, subIdCounter, funIdCounter, tcIdCounter,
      ucIdCounter, actIdCounter, cusIdCounter, pltIdCounter,
      prjIdCounter, impIdCounter, parIdCounter, hwIdCounter,
    } as Counters,
  };
}
