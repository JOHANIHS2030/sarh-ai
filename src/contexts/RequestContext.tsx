import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { IDCardRequest, RequestStatus, ApprovalAction, AuditLogEntry } from '@/types';
import { v4 as uuidv4 } from 'uuid';
import { readIndexedJSON, readLocalJSON, writeIndexedJSON, writeLocalJSON } from '@/lib/browserStorage';

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
const REQUESTS_STORAGE_KEY = 'farabi_requests';
const AUDIT_LOG_STORAGE_KEY = 'farabi_audit_log';

export function RequestProvider({ children }: { children: React.ReactNode }) {
  const [requests, setRequests] = useState<IDCardRequest[]>(() => readLocalJSON<IDCardRequest[]>(REQUESTS_STORAGE_KEY, []));

  const [auditLog, setAuditLog] = useState<AuditLogEntry[]>(() => readLocalJSON<AuditLogEntry[]>(AUDIT_LOG_STORAGE_KEY, []));

  useEffect(() => {
    void readIndexedJSON<IDCardRequest[]>(REQUESTS_STORAGE_KEY, []).then(setRequests);
    void readIndexedJSON<AuditLogEntry[]>(AUDIT_LOG_STORAGE_KEY, []).then(setAuditLog);
  }, []);

  const saveRequests = async (newReqs: IDCardRequest[]) => {
    setRequests(newReqs);
    writeLocalJSON(REQUESTS_STORAGE_KEY, newReqs);
    await writeIndexedJSON(REQUESTS_STORAGE_KEY, newReqs);
  };

  const saveAuditLog = async (entries: AuditLogEntry[]) => {
    setAuditLog(entries);
    writeLocalJSON(AUDIT_LOG_STORAGE_KEY, entries);
    await writeIndexedJSON(AUDIT_LOG_STORAGE_KEY, entries);
  };

  const addAuditEntry = useCallback((entry: Omit<AuditLogEntry, 'id' | 'timestamp'>) => {
    const newEntry: AuditLogEntry = {
      ...entry,
      id: uuidv4(),
      timestamp: new Date().toISOString(),
    };
    const current = auditLog;
    const updated = [newEntry, ...current];
    void saveAuditLog(updated);
  }, [auditLog]);

  const getNextRequestNumber = useCallback((): string => {
    const year = new Date().getFullYear();
    const count = requests.filter(r => r.requestNumber.startsWith(`IDC-${year}`)).length + 1;
    return `IDC-${year}-${String(count).padStart(5, '0')}`;
  }, [requests]);

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
    const newReqs = [...requests, newReq];
    void saveRequests(newReqs);

    addAuditEntry({
      userId: data.createdBy,
      action: 'create_request',
      details: `Created request ${newReq.requestNumber}`,
      requestId: newReq.id,
    });

    return newReq;
  }, [requests, getNextRequestNumber, addAuditEntry]);

  const updateRequestStatus = useCallback((requestId: string, status: RequestStatus, userId: string, reason?: string) => {
    let requestNumber = '';
    const newReqs = requests.map(r => {
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
    void saveRequests(newReqs);

    const actionName = status === 'on_hold' ? 'hold_request' : status === 'rejected' ? 'reject_request' : 'approve_request';
    addAuditEntry({
      userId,
      action: actionName,
      details: `${actionName} ${requestNumber}${reason ? ` - ${reason}` : ''}`,
      requestId,
    });
  }, [requests, addAuditEntry]);

  const deleteRequest = useCallback((requestId: string, userId: string) => {
    const req = requests.find(r => r.id === requestId);
    const newReqs = requests.filter(r => r.id !== requestId);
    void saveRequests(newReqs);

    if (req) {
      addAuditEntry({
        userId,
        action: 'delete_request',
        details: `Deleted request ${req.requestNumber}`,
        requestId,
      });
    }
  }, [requests, addAuditEntry]);

  const getRequestById = useCallback((id: string) => {
    return requests.find(r => r.id === id);
  }, [requests]);

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
