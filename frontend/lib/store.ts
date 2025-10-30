import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { BusinessCard, Meeting } from '@/types';

// 名刺登録フローのステート
interface CardRegistrationState {
  currentStep: 'camera' | 'preview' | 'edit' | 'survey' | null;
  capturedImage: string | null;
  scanResult: Partial<BusinessCard> | null;
  isScanning: boolean;

  // アクション
  setCapturedImage: (image: string) => void;
  setScanResult: (result: Partial<BusinessCard>) => void;
  setIsScanning: (isScanning: boolean) => void;
  setCurrentStep: (step: CardRegistrationState['currentStep']) => void;
  resetFlow: () => void;
}

// 名刺・商談データのステート
interface DataState {
  businessCards: BusinessCard[];
  meetings: Record<string, Meeting>; // card_idをキーとする

  // アクション
  addBusinessCard: (card: BusinessCard) => void;
  updateBusinessCard: (cardId: string, updates: Partial<BusinessCard>) => void;
  deleteBusinessCard: (cardId: string) => void;
  addMeeting: (meeting: Meeting) => void;
  updateMeeting: (meetingId: string, updates: Partial<Meeting>) => void;
  getMeetingByCardId: (cardId: string) => Meeting | undefined;
}

// ユーザーステート
interface UserState {
  user: { user_id: string; name: string; email: string } | null;
  setUser: (user: UserState['user']) => void;
  clearUser: () => void;
}

// 名刺登録フロー用ストア
export const useCardRegistrationStore = create<CardRegistrationState>()(
  (set) => ({
    currentStep: null,
    capturedImage: null,
    scanResult: null,
    isScanning: false,

    setCapturedImage: (image) => set({ capturedImage: image }),
    setScanResult: (result) => set({ scanResult: result }),
    setIsScanning: (isScanning) => set({ isScanning }),
    setCurrentStep: (step) => set({ currentStep: step }),
    resetFlow: () =>
      set({
        currentStep: null,
        capturedImage: null,
        scanResult: null,
        isScanning: false,
      }),
  })
);

// データ永続化用ストア（オフライン対応）
export const useDataStore = create<DataState>()(
  persist(
    (set, get) => ({
      businessCards: [],
      meetings: {},

      addBusinessCard: (card) =>
        set((state) => ({
          businessCards: [...state.businessCards, card],
        })),

      updateBusinessCard: (cardId, updates) =>
        set((state) => ({
          businessCards: state.businessCards.map((card) =>
            card.card_id === cardId ? { ...card, ...updates } : card
          ),
        })),

      deleteBusinessCard: (cardId) =>
        set((state) => ({
          businessCards: state.businessCards.filter(
            (card) => card.card_id !== cardId
          ),
          meetings: Object.fromEntries(
            Object.entries(state.meetings).filter(
              ([, meeting]) => meeting.card_id !== cardId
            )
          ),
        })),

      addMeeting: (meeting) =>
        set((state) => ({
          meetings: { ...state.meetings, [meeting.card_id]: meeting },
        })),

      updateMeeting: (meetingId, updates) =>
        set((state) => ({
          meetings: Object.fromEntries(
            Object.entries(state.meetings).map(([key, meeting]) =>
              meeting.meeting_id === meetingId
                ? [key, { ...meeting, ...updates }]
                : [key, meeting]
            )
          ),
        })),

      getMeetingByCardId: (cardId) => get().meetings[cardId],
    }),
    {
      name: 'salon-data-storage',
      storage: createJSONStorage(() => localStorage),
    }
  )
);

// ユーザー認証用ストア
export const useUserStore = create<UserState>()(
  persist(
    (set) => ({
      user: null,
      setUser: (user) => set({ user }),
      clearUser: () => set({ user: null }),
    }),
    {
      name: 'salon-user-storage',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
