import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import React from 'react';

import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { CompanyProvider } from '@/contexts/CompanyContext';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { RequestProvider, useRequests } from '@/contexts/RequestContext';
import { initialUsers } from '@/data/users';

// Stub IndexedDB-backed storage so the tests stay synchronous and isolated.
vi.mock('@/lib/browserStorage', async () => {
  const memory = new Map<string, string>();

  const readLocalJSON = <T,>(key: string, fallback: T): T => {
    const raw = memory.get(key);
    if (!raw) return fallback;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return fallback;
    }
  };

  const writeLocalJSON = <T,>(key: string, value: T): boolean => {
    memory.set(key, JSON.stringify(value));
    return true;
  };

  return {
    readLocalJSON,
    writeLocalJSON,
    readLocalString: (key: string) => memory.get(key) ?? null,
    writeLocalString: (key: string, value: string) => {
      memory.set(key, value);
    },
    removeLocalValue: (key: string) => {
      memory.delete(key);
    },
    readIndexedJSON: async <T,>(key: string, fallback: T) => readLocalJSON<T>(key, fallback),
    writeIndexedJSON: async <T,>(key: string, value: T) => writeLocalJSON<T>(key, value),
    __memory: memory,
  };
});

const browserStorageModulePromise = import('@/lib/browserStorage') as Promise<
  typeof import('@/lib/browserStorage') & { __memory: Map<string, string> }
>;

function AppShell({ initialPath }: { initialPath: string }) {
  return (
    <LanguageProvider>
      <AuthProvider>
        <CompanyProvider>
          <RequestProvider>
            <MemoryRouter initialEntries={[initialPath]}>
              <Routes>
                <Route path="*" element={<RouteHarness />} />
              </Routes>
            </MemoryRouter>
          </RequestProvider>
        </CompanyProvider>
      </AuthProvider>
    </LanguageProvider>
  );
}

function RouteHarness() {
  const location = useLocation();
  const { currentUser, login } = useAuth();
  const { requests, addRequest } = useRequests();

  // Expose hook handles to the test via window for easy assertions.
  (globalThis as Record<string, unknown>).__harness = {
    location: location.pathname,
    currentUser,
    requests,
    login,
    addRequest,
  };

  return (
    <div>
      <span data-testid="path">{location.pathname}</span>
      <span data-testid="auth">{currentUser ? currentUser.username : 'guest'}</span>
      <span data-testid="requests-count">{requests.length}</span>
    </div>
  );
}

async function clearMemory() {
  const mod = await browserStorageModulePromise;
  mod.__memory.clear();
}

function getHarness() {
  return (globalThis as Record<string, unknown>).__harness as {
    location: string;
    currentUser: { username: string } | null;
    requests: Array<{ id: string }>;
    login: (username: string, password: string) => boolean;
    addRequest: (data: any) => any;
  };
}

describe('Session and request persistence', () => {
  beforeEach(async () => {
    await clearMemory();
    delete (globalThis as Record<string, unknown>).__harness;
  });

  afterEach(async () => {
    await clearMemory();
  });

  it('keeps the user signed in after a simulated page reload', async () => {
    const adminUser = initialUsers.find(u => u.username === 'HANI');
    expect(adminUser).toBeDefined();

    const first = render(<AppShell initialPath="/my-requests" />);

    await waitFor(() => expect(getHarness()).toBeTruthy());

    act(() => {
      const success = getHarness().login('HANI', adminUser!.password);
      expect(success).toBe(true);
    });

    await waitFor(() => expect(screen.getByTestId('auth').textContent).toBe('HANI'));
    expect(screen.getByTestId('path').textContent).toBe('/my-requests');

    first.unmount();
    delete (globalThis as Record<string, unknown>).__harness;

    // Simulate a full page reload by re-mounting the entire provider tree.
    render(<AppShell initialPath="/my-requests" />);

    await waitFor(() => expect(screen.getByTestId('auth').textContent).toBe('HANI'));
    expect(screen.getByTestId('path').textContent).toBe('/my-requests');
  });

  it('keeps submitted requests after reload and stays on /my-requests', async () => {
    const adminUser = initialUsers.find(u => u.username === 'HANI')!;

    const first = render(<AppShell initialPath="/new-request" />);
    await waitFor(() => expect(getHarness()).toBeTruthy());

    act(() => {
      getHarness().login('HANI', adminUser.password);
    });
    await waitFor(() => expect(screen.getByTestId('auth').textContent).toBe('HANI'));

    act(() => {
      getHarness().addRequest({
        employeeType: 'direct',
        nameEn: 'Test Employee',
        nameAr: 'موظف اختبار',
        nationality: 'Saudi',
        employeeId: 'EMP-001',
        jobTitle: 'Engineer',
        nationalIdNo: '1234567890',
        dateIssuePlace: '',
        birthDate: '',
        bloodType: '',
        companyNameTel: '',
        departmentId: 'dept2',
        attachments: [
          { id: 'photo', name: 'test.txt', type: 'text/plain', data: 'data:text/plain;base64,dGVzdA==' },
        ],
        createdBy: adminUser.id,
      });
    });

    await waitFor(() => expect(screen.getByTestId('requests-count').textContent).toBe('1'));

    first.unmount();
    delete (globalThis as Record<string, unknown>).__harness;

    render(<AppShell initialPath="/my-requests" />);

    await waitFor(() => expect(screen.getByTestId('auth').textContent).toBe('HANI'));
    await waitFor(() => expect(screen.getByTestId('requests-count').textContent).toBe('1'));
    expect(screen.getByTestId('path').textContent).toBe('/my-requests');
  });
});