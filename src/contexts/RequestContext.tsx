import React, { createContext, useContext, useState, useCallback } from 'react';
import { IDCardRequest, RequestStatus, ApprovalAction, AuditLogEntry } from '@/types';
import { v4 as uuidv4 } from 'uuid';

interface RequestContextType {
  requests: IDCardRequest[];
  auditLog: AuditLogEntry[];
  addRequest: (request: Omit<IDCardRequest, 'id' | 'requestNumber' | 'status' | 'createdAt' | 'updatedAt' | 'approvalHistory'>) => IDCardRequest;
  updateRequestStatus: (requestId: string, status: RequestStatus, userId: string, reason?: string) => void;
  deleteRequest: (requestId: string, userId: string) => void;
  getNextRequestNumber: () => string;
  getRequestById: (id: string) => IDCardRequest | undefined;
  addAuditEntry: (entry: Omit<AuditLogEntry, 'id' | 'timestamp'>) => void;
}

const RequestContext = createContext<RequestContextType | undefined>(undefined);

export function RequestProvider({ children }: { children: React.ReactNode }) {
  const [requests, setRequests] = useState<IDCardRequest[]>(() => {
    const saved = localStorage.getItem('farabi_requests');
    return saved ? JSON.parse(saved) : [];
  });

  const [auditLog, setAuditLog] = useState<AuditLogEntry[]>(() => {
    const saved = localStorage.getItem('farabi_audit_log');
    return saved ? JSON.parse(saved) : [];
  });

  const saveRequests = (newReqs: IDCardRequest[]) => {
    setRequests(newReqs);
    localStorage.setItem('farabi_requests', JSON.stringify(newReqs));
  };

  const saveAuditLog = (entries: AuditLogEntry[]) => {
    setAuditLog(entries);
    localStorage.setItem('farabi_audit_log', JSON.stringify(entries));
  };

  const addAuditEntry = useCallback((entry: Omit<AuditLogEntry, 'id' | 'timestamp'>) => {
    const newEntry: AuditLogEntry = {
      ...entry,
      id: uuidv4(),
      timestamp: new Date().toISOString(),
    };
    const saved = localStorage.getItem('farabi_audit_log');
    const current: AuditLogEntry[] = saved ? JSON.parse(saved) : [];
    const updated = [newEntry, ...current];
    saveAuditLog(updated);
  }, []);

  const getNextRequestNumber = useCallback((): string => {
    const year = new Date().getFullYear();
    const saved = localStorage.getItem('farabi_requests');
    const existingRequests: IDCardRequest[] = saved ? JSON.parse(saved) : [];
    const count = existingRequests.filter(r => r.requestNumber.startsWith(`IDC-${year}`)).length + 1;
    return `IDC-${year}-${String(count).padStart(5, '0')}`;
  }, []);

  const addRequest = useCallback((data: Omit<IDCardRequest, 'id' | 'requestNumber' | 'status' | 'createdAt' | 'updatedAt' | 'approvalHistory'>): IDCardRequest => {
    const now = new Date().toISOString();
    const newReq: IDCardRequest = {
      ...data,
      id: uuidv4(),
      requestNumber: getNextRequestNumber(),
      status: 'pending_dept_approval',
      createdAt: now,
      updatedAt: now,
      approvalHistory: [],
    };
    const saved = localStorage.getItem('farabi_requests');
    const current: IDCardRequest[] = saved ? JSON.parse(saved) : [];
    const newReqs = [...current, newReq];
    saveRequests(newReqs);

    addAuditEntry({
      userId: data.createdBy,
      action: 'create_request',
      details: `Created request ${newReq.requestNumber}`,
      requestId: newReq.id,
    });

    return newReq;
  }, [getNextRequestNumber, addAuditEntry]);

  const updateRequestStatus = useCallback((requestId: string, status: RequestStatus, userId: string, reason?: string) => {
    const saved = localStorage.getItem('farabi_requests');
    const current: IDCardRequest[] = saved ? JSON.parse(saved) : [];
    let requestNumber = '';
    const newReqs = current.map(r => {
      if (r.id === requestId) {
        requestNumber = r.requestNumber;
        const action: ApprovalAction = {
          id: uuidv4(),
          userId,
          action: status === 'on_hold' ? 'hold' : status === 'rejected' ? 'reject' : 'approve',
          reason,
          timestamp: new Date().toISOString(),
          stage: r.status,
        };
        return {
          ...r,
          status,
          updatedAt: new Date().toISOString(),
          approvalHistory: [...r.approvalHistory, action],
          ...(status === 'on_hold' ? { holdReason: reason } : {}),
          ...(status === 'rejected' ? { rejectReason: reason } : {}),
        };
      }
      return r;
    });
    saveRequests(newReqs);

    const actionName = status === 'on_hold' ? 'hold_request' : status === 'rejected' ? 'reject_request' : 'approve_request';
    addAuditEntry({
      userId,
      action: actionName,
      details: `${actionName} ${requestNumber}${reason ? ` - ${reason}` : ''}`,
      requestId,
    });
  }, [addAuditEntry]);

  const deleteRequest = useCallback((requestId: string, userId: string) => {
    const saved = localStorage.getItem('farabi_requests');
    const current: IDCardRequest[] = saved ? JSON.parse(saved) : [];
    const req = current.find(r => r.id === requestId);
    const newReqs = current.filter(r => r.id !== requestId);
    saveRequests(newReqs);

    if (req) {
      addAuditEntry({
        userId,
        action: 'delete_request',
        details: `Deleted request ${req.requestNumber}`,
        requestId,
      });
    }
  }, [addAuditEntry]);

  const getRequestById = useCallback((id: string) => {
    const saved = localStorage.getItem('farabi_requests');
    const current: IDCardRequest[] = saved ? JSON.parse(saved) : [];
    return current.find(r => r.id === id);
  }, []);

  return (
    <RequestContext.Provider value={{ requests, auditLog, addRequest, updateRequestStatus, deleteRequest, getNextRequestNumber, getRequestById, addAuditEntry }}>
      {children}
    </RequestContext.Provider>
  );
}

export function useRequests() {
  const context = useContext(RequestContext);
  if (!context) throw new Error('useRequests must be used within RequestProvider');
  return context;
}
