import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { ViolationRecord, ViolationPaymentStatus } from '@/types/violation';
import { readIndexedJSON, readLocalJSON, writeIndexedJSON, writeLocalJSON } from '@/lib/browserStorage';
import { useRequests } from '@/contexts/RequestContext';

const STORAGE_KEY = 'sarh_violations';

interface ViolationsContextType {
  violations: ViolationRecord[];
  addViolation: (
    data: Omit<ViolationRecord, 'id' | 'violationNumber' | 'createdAt' | 'updatedAt' | 'paymentStatus'> & {
      paymentStatus?: ViolationPaymentStatus;
    }
  ) => ViolationRecord;
  updatePaymentStatus: (id: string, status: ViolationPaymentStatus, userId: string, receiptNumber?: string) => void;
  deleteViolation: (id: string, userId: string) => void;
  getViolationById: (id: string) => ViolationRecord | undefined;
  countLostOffenses: (employeeId: string) => number;
  isBanned: (employeeId: string) => boolean;
  getNextViolationNumber: () => string;
}

const ViolationsContext = createContext<ViolationsContextType | undefined>(undefined);

export function ViolationsProvider({ children }: { children: React.ReactNode }) {
  const { addAuditEntry } = useRequests();
  const [violations, setViolations] = useState<ViolationRecord[]>(() =>
    readLocalJSON<ViolationRecord[]>(STORAGE_KEY, [])
  );

  useEffect(() => {
    void readIndexedJSON<ViolationRecord[]>(STORAGE_KEY, []).then(stored => {
      setViolations(prev => (prev.length > 0 ? prev : stored));
    });
  }, []);

  const save = async (list: ViolationRecord[]) => {
    setViolations(list);
    writeLocalJSON(STORAGE_KEY, list);
    await writeIndexedJSON(STORAGE_KEY, list);
  };

  const getNextViolationNumber = useCallback((): string => {
    const year = new Date().getFullYear();
    const count = violations.filter(v => v.violationNumber.startsWith(`VIO-${year}`)).length + 1;
    return `VIO-${year}-${String(count).padStart(5, '0')}`;
  }, [violations]);

  const countLostOffenses = useCallback(
    (employeeId: string) =>
      violations.filter(
        v => v.violationType === 'lost' && v.employeeId.trim().toLowerCase() === employeeId.trim().toLowerCase()
      ).length,
    [violations]
  );

  const isBanned = useCallback(
    (employeeId: string) =>
      violations.some(v => v.banned && v.employeeId.trim().toLowerCase() === employeeId.trim().toLowerCase()),
    [violations]
  );

  const addViolation = useCallback<ViolationsContextType['addViolation']>(
    data => {
      const now = new Date().toISOString();
      const record: ViolationRecord = {
        ...data,
        paymentStatus: data.paymentStatus ?? 'unpaid',
        id: uuidv4(),
        violationNumber: getNextViolationNumber(),
        createdAt: now,
        updatedAt: now,
      };
      void save([record, ...violations]);
      addAuditEntry({
        userId: data.createdBy,
        action: 'create_violation',
        details: `Issued violation ${record.violationNumber} — ${record.contractorName} — SAR ${record.fineAmount}`,
        requestId: record.id,
      });
      return record;
    },
    [violations, getNextViolationNumber, addAuditEntry]
  );

  const updatePaymentStatus = useCallback(
    (id: string, status: ViolationPaymentStatus, userId: string, receiptNumber?: string) => {
      let number = '';
      const updated = violations.map(v => {
        if (v.id !== id) return v;
        number = v.violationNumber;
        return {
          ...v,
          paymentStatus: status,
          receiptNumber: receiptNumber ?? v.receiptNumber,
          paidAt: status === 'paid' ? new Date().toISOString() : undefined,
          updatedAt: new Date().toISOString(),
        };
      });
      void save(updated);
      addAuditEntry({ userId, action: 'update_violation', details: `Violation ${number} → ${status}`, requestId: id });
    },
    [violations, addAuditEntry]
  );

  const deleteViolation = useCallback(
    (id: string, userId: string) => {
      const v = violations.find(x => x.id === id);
      void save(violations.filter(x => x.id !== id));
      if (v) {
        addAuditEntry({ userId, action: 'delete_violation', details: `Deleted violation ${v.violationNumber}`, requestId: id });
      }
    },
    [violations, addAuditEntry]
  );

  const getViolationById = useCallback((id: string) => violations.find(v => v.id === id), [violations]);

  return (
    <ViolationsContext.Provider
      value={{
        violations,
        addViolation,
        updatePaymentStatus,
        deleteViolation,
        getViolationById,
        countLostOffenses,
        isBanned,
        getNextViolationNumber,
      }}
    >
      {children}
    </ViolationsContext.Provider>
  );
}

export function useViolations() {
  const ctx = useContext(ViolationsContext);
  if (!ctx) throw new Error('useViolations must be used within ViolationsProvider');
  return ctx;
}
