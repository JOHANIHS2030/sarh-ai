import React, { createContext, useContext, useState, useCallback } from 'react';
import { IDCardRequest, RequestStatus, ApprovalAction } from '@/types';
import { v4 as uuidv4 } from 'uuid';

interface RequestContextType {
  requests: IDCardRequest[];
  addRequest: (request: Omit<IDCardRequest, 'id' | 'requestNumber' | 'status' | 'createdAt' | 'updatedAt' | 'approvalHistory'>) => IDCardRequest;
  updateRequestStatus: (requestId: string, status: RequestStatus, userId: string, reason?: string) => void;
  getNextRequestNumber: () => string;
  getRequestById: (id: string) => IDCardRequest | undefined;
}

const RequestContext = createContext<RequestContextType | undefined>(undefined);

export function RequestProvider({ children }: { children: React.ReactNode }) {
  const [requests, setRequests] = useState<IDCardRequest[]>(() => {
    const saved = localStorage.getItem('farabi_requests');
    return saved ? JSON.parse(saved) : [];
  });

  const saveRequests = (newReqs: IDCardRequest[]) => {
    setRequests(newReqs);
    localStorage.setItem('farabi_requests', JSON.stringify(newReqs));
  };

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
    return newReq;
  }, [getNextRequestNumber]);

  const updateRequestStatus = useCallback((requestId: string, status: RequestStatus, userId: string, reason?: string) => {
    const saved = localStorage.getItem('farabi_requests');
    const current: IDCardRequest[] = saved ? JSON.parse(saved) : [];
    const newReqs = current.map(r => {
      if (r.id === requestId) {
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
  }, []);

  const getRequestById = useCallback((id: string) => {
    const saved = localStorage.getItem('farabi_requests');
    const current: IDCardRequest[] = saved ? JSON.parse(saved) : [];
    return current.find(r => r.id === id);
  }, []);

  return (
    <RequestContext.Provider value={{ requests, addRequest, updateRequestStatus, getNextRequestNumber, getRequestById }}>
      {children}
    </RequestContext.Provider>
  );
}

export function useRequests() {
  const context = useContext(RequestContext);
  if (!context) throw new Error('useRequests must be used within RequestProvider');
  return context;
}
