import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import {
  PermitRequest,
  PermitStatus,
  PermitApprovalAction,
  PermitStageApproval,
  PermitType,
} from '@/types/permit';
import {
  readIndexedJSON,
  readLocalJSON,
  writeIndexedJSON,
  writeLocalJSON,
} from '@/lib/browserStorage';
import { useRequests } from '@/contexts/RequestContext';

const STORAGE_KEY = 'farabi_permits';

// Workflow per permit type — sequential pipeline
export const PERMIT_WORKFLOW: Record<PermitType, PermitStatus[]> = {
  // Mobile: Dept Manager → Security Chief → EHSS Manager (final)
  mobile_phone: ['pending_dept_manager', 'pending_security_chief', 'pending_ehss_manager', 'approved'],
  // Laptop: Dept Manager → IT → Security Chief (final)
  laptop: ['pending_dept_manager', 'pending_it_review', 'pending_security_chief', 'approved'],
  // Photography: Dept Manager → Security Chief (final, then EHSS signs the conditions block on print)
  photography: ['pending_dept_manager', 'pending_security_chief', 'approved'],
};

export function nextPermitStatus(type: PermitType, current: PermitStatus): PermitStatus {
  const flow = PERMIT_WORKFLOW[type];
  const idx = flow.indexOf(current);
  if (idx === -1 || idx >= flow.length - 1) return 'approved';
  return flow[idx + 1];
}

interface PermitsContextType {
  permits: PermitRequest[];
  addPermit: (
    data: Omit<
      PermitRequest,
      'id' | 'requestNumber' | 'status' | 'createdAt' | 'updatedAt' | 'approvalHistory' | 'stageApprovals'
    >
  ) => PermitRequest;
  approvePermit: (id: string, userId: string, approval: PermitStageApproval, notes?: string) => void;
  rejectPermit: (id: string, userId: string, reason: string) => void;
  holdPermit: (id: string, userId: string, reason: string) => void;
  deletePermit: (id: string, userId: string) => void;
  getPermitById: (id: string) => PermitRequest | undefined;
  getNextPermitNumber: () => string;
}

const PermitsContext = createContext<PermitsContextType | undefined>(undefined);

export function PermitsProvider({ children }: { children: React.ReactNode }) {
  const { addAuditEntry } = useRequests();
  const [permits, setPermits] = useState<PermitRequest[]>(() =>
    readLocalJSON<PermitRequest[]>(STORAGE_KEY, [])
  );

  useEffect(() => {
    void readIndexedJSON<PermitRequest[]>(STORAGE_KEY, []).then(stored => {
      setPermits(prev => (prev.length > 0 ? prev : stored));
    });
  }, []);

  const save = async (list: PermitRequest[]) => {
    setPermits(list);
    writeLocalJSON(STORAGE_KEY, list);
    await writeIndexedJSON(STORAGE_KEY, list);
  };

  const getNextPermitNumber = useCallback((): string => {
    const year = new Date().getFullYear();
    const count = permits.filter(p => p.requestNumber.startsWith(`PRM-${year}`)).length + 1;
    return `PRM-${year}-${String(count).padStart(5, '0')}`;
  }, [permits]);

  const addPermit = useCallback(
    (
      data: Omit<
        PermitRequest,
        'id' | 'requestNumber' | 'status' | 'createdAt' | 'updatedAt' | 'approvalHistory' | 'stageApprovals'
      >
    ): PermitRequest => {
      const now = new Date().toISOString();
      const newPermit: PermitRequest = {
        ...data,
        id: uuidv4(),
        requestNumber: getNextPermitNumber(),
        status: 'pending_dept_manager',
        createdAt: now,
        updatedAt: now,
        approvalHistory: [],
        stageApprovals: [],
      };
      void save([...permits, newPermit]);
      addAuditEntry({
        userId: data.createdBy,
        action: 'create_permit',
        details: `Created permit request ${newPermit.requestNumber} (${data.permitType})`,
        requestId: newPermit.id,
      });
      return newPermit;
    },
    [permits, getNextPermitNumber, addAuditEntry]
  );

  const approvePermit = useCallback(
    (id: string, userId: string, approval: PermitStageApproval, notes?: string) => {
      let requestNumber = '';
      const updated = permits.map(p => {
        if (p.id !== id) return p;
        requestNumber = p.requestNumber;
        const next = nextPermitStatus(p.permitType, p.status);
        const action: PermitApprovalAction = {
          id: uuidv4(),
          userId,
          action: 'approve',
          reason: notes,
          timestamp: new Date().toISOString(),
          stage: p.status,
        };
        return {
          ...p,
          status: next,
          updatedAt: new Date().toISOString(),
          approvalHistory: [...p.approvalHistory, action],
          stageApprovals: [...p.stageApprovals, { ...approval, stage: p.status, notes }],
        };
      });
      void save(updated);
      addAuditEntry({
        userId,
        action: 'approve_permit',
        details: `Approved permit ${requestNumber}`,
        requestId: id,
      });
    },
    [permits, addAuditEntry]
  );

  const rejectPermit = useCallback(
    (id: string, userId: string, reason: string) => {
      let requestNumber = '';
      const updated = permits.map(p => {
        if (p.id !== id) return p;
        requestNumber = p.requestNumber;
        return {
          ...p,
          status: 'rejected' as PermitStatus,
          rejectReason: reason,
          updatedAt: new Date().toISOString(),
          approvalHistory: [
            ...p.approvalHistory,
            { id: uuidv4(), userId, action: 'reject' as const, reason, timestamp: new Date().toISOString(), stage: p.status },
          ],
        };
      });
      void save(updated);
      addAuditEntry({ userId, action: 'reject_permit', details: `Rejected permit ${requestNumber} - ${reason}`, requestId: id });
    },
    [permits, addAuditEntry]
  );

  const holdPermit = useCallback(
    (id: string, userId: string, reason: string) => {
      let requestNumber = '';
      const updated = permits.map(p => {
        if (p.id !== id) return p;
        requestNumber = p.requestNumber;
        return {
          ...p,
          status: 'on_hold' as PermitStatus,
          holdReason: reason,
          updatedAt: new Date().toISOString(),
          approvalHistory: [
            ...p.approvalHistory,
            { id: uuidv4(), userId, action: 'hold' as const, reason, timestamp: new Date().toISOString(), stage: p.status },
          ],
        };
      });
      void save(updated);
      addAuditEntry({ userId, action: 'hold_permit', details: `Held permit ${requestNumber} - ${reason}`, requestId: id });
    },
    [permits, addAuditEntry]
  );

  const deletePermit = useCallback(
    (id: string, userId: string) => {
      const p = permits.find(x => x.id === id);
      void save(permits.filter(x => x.id !== id));
      if (p) {
        addAuditEntry({ userId, action: 'delete_permit', details: `Deleted permit ${p.requestNumber}`, requestId: id });
      }
    },
    [permits, addAuditEntry]
  );

  const getPermitById = useCallback((id: string) => permits.find(p => p.id === id), [permits]);

  return (
    <PermitsContext.Provider
      value={{
        permits,
        addPermit,
        approvePermit,
        rejectPermit,
        holdPermit,
        deletePermit,
        getPermitById,
        getNextPermitNumber,
      }}
    >
      {children}
    </PermitsContext.Provider>
  );
}

export function usePermits() {
  const ctx = useContext(PermitsContext);
  if (!ctx) throw new Error('usePermits must be used within PermitsProvider');
  return ctx;
}
