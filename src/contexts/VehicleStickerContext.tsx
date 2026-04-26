import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import {
  VehicleStickerRequest,
  StickerStatus,
  StickerApprovalAction,
  StickerDepartmentApproval,
  StickerSecurityIssuance,
} from '@/types/vehicleSticker';
import {
  readIndexedJSON,
  readLocalJSON,
  writeIndexedJSON,
  writeLocalJSON,
} from '@/lib/browserStorage';
import { useRequests } from '@/contexts/RequestContext';

const STORAGE_KEY = 'farabi_vehicle_stickers';

interface VehicleStickerContextType {
  stickers: VehicleStickerRequest[];
  addSticker: (
    data: Omit<
      VehicleStickerRequest,
      'id' | 'requestNumber' | 'status' | 'createdAt' | 'updatedAt' | 'approvalHistory'
    >
  ) => VehicleStickerRequest;
  updateStickerStatus: (
    id: string,
    status: StickerStatus,
    userId: string,
    reason?: string,
    departmentApproval?: StickerDepartmentApproval
  ) => void;
  setSecurityIssuance: (id: string, issuance: StickerSecurityIssuance) => void;
  deleteSticker: (id: string, userId: string) => void;
  getStickerById: (id: string) => VehicleStickerRequest | undefined;
  getNextStickerNumber: () => string;
}

const VehicleStickerContext = createContext<VehicleStickerContextType | undefined>(undefined);

export function VehicleStickerProvider({ children }: { children: React.ReactNode }) {
  const { addAuditEntry } = useRequests();
  const [stickers, setStickers] = useState<VehicleStickerRequest[]>(() =>
    readLocalJSON<VehicleStickerRequest[]>(STORAGE_KEY, [])
  );

  useEffect(() => {
    void readIndexedJSON<VehicleStickerRequest[]>(STORAGE_KEY, []).then(stored => {
      setStickers(prev => (prev.length > 0 ? prev : stored));
    });
  }, []);

  const save = async (list: VehicleStickerRequest[]) => {
    setStickers(list);
    writeLocalJSON(STORAGE_KEY, list);
    await writeIndexedJSON(STORAGE_KEY, list);
  };

  const getNextStickerNumber = useCallback((): string => {
    const year = new Date().getFullYear();
    const count = stickers.filter(s => s.requestNumber.startsWith(`VS-${year}`)).length + 1;
    return `VS-${year}-${String(count).padStart(5, '0')}`;
  }, [stickers]);

  const addSticker = useCallback(
    (
      data: Omit<
        VehicleStickerRequest,
        'id' | 'requestNumber' | 'status' | 'createdAt' | 'updatedAt' | 'approvalHistory'
      >
    ): VehicleStickerRequest => {
      const now = new Date().toISOString();
      const newSticker: VehicleStickerRequest = {
        ...data,
        id: uuidv4(),
        requestNumber: getNextStickerNumber(),
        status: 'pending_dept_approval',
        createdAt: now,
        updatedAt: now,
        approvalHistory: [],
      };
      void save([...stickers, newSticker]);
      addAuditEntry({
        userId: data.createdBy,
        action: 'create_sticker',
        details: `Created vehicle sticker request ${newSticker.requestNumber}`,
        requestId: newSticker.id,
      });
      return newSticker;
    },
    [stickers, getNextStickerNumber, addAuditEntry]
  );

  const updateStickerStatus = useCallback(
    (
      id: string,
      status: StickerStatus,
      userId: string,
      reason?: string,
      departmentApproval?: StickerDepartmentApproval
    ) => {
      let requestNumber = '';
      const updated = stickers.map(s => {
        if (s.id !== id) return s;
        requestNumber = s.requestNumber;
        const action: StickerApprovalAction = {
          id: uuidv4(),
          userId,
          action: status === 'on_hold' ? 'hold' : status === 'rejected' ? 'reject' : 'approve',
          reason,
          timestamp: new Date().toISOString(),
          stage: s.status,
        };
        return {
          ...s,
          status,
          updatedAt: new Date().toISOString(),
          approvalHistory: [...s.approvalHistory, action],
          ...(departmentApproval ? { departmentApproval } : {}),
          ...(status === 'on_hold' ? { holdReason: reason } : {}),
          ...(status === 'rejected' ? { rejectReason: reason } : {}),
        };
      });
      void save(updated);
      const actionName =
        status === 'on_hold'
          ? 'hold_sticker'
          : status === 'rejected'
            ? 'reject_sticker'
            : 'approve_sticker';
      addAuditEntry({
        userId,
        action: actionName,
        details: `${actionName} ${requestNumber}${reason ? ` - ${reason}` : ''}`,
        requestId: id,
      });
    },
    [stickers, addAuditEntry]
  );

  const setSecurityIssuance = useCallback(
    (id: string, issuance: StickerSecurityIssuance) => {
      let requestNumber = '';
      const updated = stickers.map(s => {
        if (s.id !== id) return s;
        requestNumber = s.requestNumber;
        return {
          ...s,
          securityIssuance: issuance,
          status: 'approved' as StickerStatus,
          updatedAt: new Date().toISOString(),
          approvalHistory: [
            ...s.approvalHistory,
            {
              id: uuidv4(),
              userId: issuance.reviewerUserId,
              action: 'approve' as const,
              reason: `Permit ${issuance.permitNumber}`,
              timestamp: new Date().toISOString(),
              stage: s.status,
            },
          ],
        };
      });
      void save(updated);
      addAuditEntry({
        userId: issuance.reviewerUserId,
        action: 'sticker_issued',
        details: `Issued sticker permit ${issuance.permitNumber} for ${requestNumber}`,
        requestId: id,
      });
    },
    [stickers, addAuditEntry]
  );

  const deleteSticker = useCallback(
    (id: string, userId: string) => {
      const s = stickers.find(x => x.id === id);
      void save(stickers.filter(x => x.id !== id));
      if (s) {
        addAuditEntry({
          userId,
          action: 'delete_sticker',
          details: `Deleted vehicle sticker request ${s.requestNumber}`,
          requestId: id,
        });
      }
    },
    [stickers, addAuditEntry]
  );

  const getStickerById = useCallback(
    (id: string) => stickers.find(s => s.id === id),
    [stickers]
  );

  return (
    <VehicleStickerContext.Provider
      value={{
        stickers,
        addSticker,
        updateStickerStatus,
        setSecurityIssuance,
        deleteSticker,
        getStickerById,
        getNextStickerNumber,
      }}
    >
      {children}
    </VehicleStickerContext.Provider>
  );
}

export function useVehicleStickers() {
  const ctx = useContext(VehicleStickerContext);
  if (!ctx) throw new Error('useVehicleStickers must be used within VehicleStickerProvider');
  return ctx;
}
