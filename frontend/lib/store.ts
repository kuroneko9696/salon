import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type {
  BusinessCard,
  Booth,
  BoothDraft,
  BusinessCardLinkage,
  Event,
  EventDraft,
  EventReport,
  KeywordNote,
  KeywordNoteDraft,
  MaterialImage,
  MaterialImageDraft,
  Meeting,
  MeetingVisitContext,
  TargetCompany,
  TargetCompanyDraft,
  Task,
  TaskDraft,
  UploadedImage,
  VisitNote,
  VisitNoteDraft,
} from '@/types';

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
  events: Event[];
  booths: Booth[];
  businessCards: BusinessCard[];
  meetings: Record<string, Meeting>; // card_idをキーとする
  targetCompanies: TargetCompany[];
  visitNotes: VisitNote[];
  keywordNotes: KeywordNote[];
  materialImages: MaterialImage[];
  tasks: Task[];
  eventReports: EventReport[];
  uploadedImages: Record<string, UploadedImage>;

  // アクション
  setEvents: (events: Event[]) => void;
  addEvent: (event: Event) => void;
  updateEvent: (eventId: string, updates: Partial<Event>) => void;
  upsertEventFromDraft: (eventId: string | null, draft: EventDraft) => Event;
  setBooths: (booths: Booth[]) => void;
  addBooth: (booth: Booth) => void;
  updateBooth: (boothId: string, updates: Partial<Booth>) => void;
  upsertBoothFromDraft: (boothId: string | null, draft: BoothDraft) => Booth;
  getBoothsByEvent: (eventId: string) => Booth[];
  setTargetCompanies: (targets: TargetCompany[]) => void;
  upsertTargetCompany: (
    targetId: string | null,
    draft: TargetCompanyDraft
  ) => TargetCompany;
  removeTargetCompany: (targetId: string) => void;
  setVisitNotes: (notes: VisitNote[]) => void;
  upsertVisitNote: (noteId: string | null, draft: VisitNoteDraft) => VisitNote;
  removeVisitNote: (noteId: string) => void;
  setKeywordNotes: (notes: KeywordNote[]) => void;
  upsertKeywordNote: (
    noteId: string | null,
    draft: KeywordNoteDraft
  ) => KeywordNote;
  removeKeywordNote: (noteId: string) => void;
  setMaterialImages: (materials: MaterialImage[]) => void;
  upsertMaterialImage: (
    materialId: string | null,
    draft: MaterialImageDraft
  ) => MaterialImage;
  removeMaterialImage: (materialId: string) => void;
  setTasks: (tasks: Task[]) => void;
  upsertTask: (taskId: string | null, draft: TaskDraft) => Task;
  removeTask: (taskId: string) => void;
  setEventReports: (reports: EventReport[]) => void;
  upsertEventReport: (report: EventReport) => void;
  removeEventReport: (reportId: string) => void;
  setUploadedImage: (image: UploadedImage) => void;
  getUploadedImage: (imageId: string) => UploadedImage | undefined;
  addBusinessCard: (card: BusinessCard) => void;
  updateBusinessCard: (cardId: string, updates: Partial<BusinessCard>) => void;
  deleteBusinessCard: (cardId: string) => void;
  setCardLinkage: (cardId: string, linkage: BusinessCardLinkage) => void;
  setCardHighlight: (cardId: string, highlight: boolean) => void;
  addMeeting: (meeting: Meeting) => void;
  updateMeeting: (meetingId: string, updates: Partial<Meeting>) => void;
  getMeetingByCardId: (cardId: string) => Meeting | undefined;
  setMeetingVisitContext: (
    meetingId: string,
    context: MeetingVisitContext
  ) => void;
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
      events: [],
      booths: [],
      businessCards: [],
      meetings: {},
      targetCompanies: [],
      visitNotes: [],
      keywordNotes: [],
      materialImages: [],
      tasks: [],
      eventReports: [],
      uploadedImages: {},

      setEvents: (events) => set({ events }),

      addEvent: (event) =>
        set((state) => ({
          events: [...state.events, event],
        })),

      updateEvent: (eventId, updates) =>
        set((state) => ({
          events: state.events.map((event) =>
            event.event_id === eventId ? { ...event, ...updates } : event
          ),
        })),

      upsertEventFromDraft: (eventId, draft) => {
        const now = new Date().toISOString();
        if (eventId) {
          const existing = get().events.find((event) => event.event_id === eventId);
          if (!existing) {
            throw new Error('指定したイベントが見つかりません');
          }
          const merged: Event = {
            ...existing,
            ...draft,
            highlight_tags: draft.highlight_tags ?? existing.highlight_tags,
            updated_at: now,
          };
          set((state) => ({
            events: state.events.map((event) =>
              event.event_id === eventId ? merged : event
            ),
          }));
          return merged;
        }

        const newEvent: Event = {
          event_id: crypto.randomUUID(),
          name: draft.name,
          start_date: draft.start_date ?? null,
          end_date: draft.end_date ?? null,
          location: draft.location ?? null,
          description: draft.description ?? null,
          event_website_url: draft.event_website_url ?? null,
          scraped_data: draft.scraped_data ?? null,
          highlight_tags: draft.highlight_tags ?? [],
          created_at: now,
          updated_at: now,
        };

        set((state) => ({
          events: [...state.events, newEvent],
        }));

        return newEvent;
      },

      setBooths: (booths) => set({ booths }),

      addBooth: (booth) =>
        set((state) => ({
          booths: [...state.booths, booth],
        })),

      updateBooth: (boothId, updates) =>
        set((state) => ({
          booths: state.booths.map((booth) =>
            booth.booth_id === boothId ? { ...booth, ...updates } : booth
          ),
        })),

      upsertBoothFromDraft: (boothId, draft) => {
        const now = new Date().toISOString();
        if (boothId) {
          const existing = get().booths.find((booth) => booth.booth_id === boothId);
          if (!existing) {
            throw new Error('指定したブースが見つかりません');
          }
          const merged: Booth = {
            ...existing,
            ...draft,
            contact_persons: draft.contact_persons ?? existing.contact_persons,
            focus_products: draft.focus_products ?? existing.focus_products,
            highlight_tags: draft.highlight_tags ?? existing.highlight_tags,
            updated_at: now,
          };
          set((state) => ({
            booths: state.booths.map((booth) =>
              booth.booth_id === boothId ? merged : booth
            ),
          }));
          return merged;
        }

        const newBooth: Booth = {
          booth_id: crypto.randomUUID(),
          event_id: draft.event_id,
          name: draft.name,
          booth_code: draft.booth_code ?? null,
          location: draft.location ?? null,
          contact_persons: draft.contact_persons,
          focus_products: draft.focus_products,
          highlight_tags: draft.highlight_tags,
          pre_research_status: draft.pre_research_status ?? null,
          memo: draft.memo ?? null,
          created_at: now,
          updated_at: now,
        };

        set((state) => ({
          booths: [...state.booths, newBooth],
        }));

        return newBooth;
      },

      getBoothsByEvent: (eventId) =>
        get().booths.filter((booth) => booth.event_id === eventId),

      setTargetCompanies: (targets) => set({ targetCompanies: targets }),

      upsertTargetCompany: (targetId, draft) => {
        const now = new Date().toISOString();
        if (targetId) {
          const existing = get().targetCompanies.find(
            (target) => target.target_company_id === targetId
          );
          if (!existing) {
            throw new Error('指定したターゲット企業が見つかりません');
          }
          const merged: TargetCompany = {
            ...existing,
            ...draft,
            highlight_tags: draft.highlight_tags ?? existing.highlight_tags,
            highlight: draft.highlight ?? existing.highlight,
            updated_at: now,
          };
          set((state) => ({
            targetCompanies: state.targetCompanies.map((target) =>
              target.target_company_id === targetId ? merged : target
            ),
          }));
          return merged;
        }

        const newTarget: TargetCompany = {
          target_company_id: crypto.randomUUID(),
          event_id: draft.event_id,
          name: draft.name,
          website_url: draft.website_url ?? null,
          description: draft.description ?? null,
          booth_code: draft.booth_code ?? null,
          priority: draft.priority ?? null,
          highlight_tags: draft.highlight_tags ?? [],
          pre_research_status: draft.pre_research_status ?? null,
          research_summary: draft.research_summary ?? null,
          notes: draft.notes ?? null,
          scraped_context: draft.scraped_context ?? null,
          ai_research: draft.ai_research ?? null,
          highlight: draft.highlight ?? false,
          created_at: now,
          updated_at: now,
        };

        set((state) => ({
          targetCompanies: [...state.targetCompanies, newTarget],
        }));

        return newTarget;
      },

      removeTargetCompany: (targetId) =>
        set((state) => ({
          targetCompanies: state.targetCompanies.filter(
            (target) => target.target_company_id !== targetId
          ),
        })),

      setVisitNotes: (notes) => set({ visitNotes: notes }),

      upsertVisitNote: (noteId, draft) => {
        const now = new Date().toISOString();
        if (noteId) {
          const existing = get().visitNotes.find(
            (note) => note.visit_note_id === noteId
          );
          if (!existing) {
            throw new Error('指定したノートが見つかりません');
          }
          const merged: VisitNote = {
            ...existing,
            ...draft,
            highlight: draft.highlight ?? existing.highlight,
            updated_at: now,
          };
          set((state) => ({
            visitNotes: state.visitNotes.map((note) =>
              note.visit_note_id === noteId ? merged : note
            ),
          }));
          return merged;
        }

        const newNote: VisitNote = {
          visit_note_id: crypto.randomUUID(),
          event_id: draft.event_id,
          target_company_id: draft.target_company_id ?? null,
          title: draft.title ?? null,
          note_type: draft.note_type,
          content: draft.content,
          image_ids: draft.image_ids ?? [],
          keywords: draft.keywords ?? [],
          highlight: draft.highlight ?? false,
          created_by: draft.created_by ?? null,
          created_at: now,
          updated_at: now,
        };

        set((state) => ({
          visitNotes: [newNote, ...state.visitNotes],
        }));

        return newNote;
      },

      removeVisitNote: (noteId) =>
        set((state) => ({
          visitNotes: state.visitNotes.filter(
            (note) => note.visit_note_id !== noteId
          ),
        })),

      setKeywordNotes: (notes) => set({ keywordNotes: notes }),

      upsertKeywordNote: (noteId, draft) => {
        const now = new Date().toISOString();
        if (noteId) {
          const existing = get().keywordNotes.find(
            (note) => note.keyword_note_id === noteId
          );
          if (!existing) {
            throw new Error('指定したキーワードメモが見つかりません');
          }
          const merged: KeywordNote = {
            ...existing,
            ...draft,
            updated_at: now,
          };
          set((state) => ({
            keywordNotes: state.keywordNotes.map((note) =>
              note.keyword_note_id === noteId ? merged : note
            ),
          }));
          return merged;
        }

        const newNote: KeywordNote = {
          keyword_note_id: crypto.randomUUID(),
          event_id: draft.event_id,
          target_company_id: draft.target_company_id ?? null,
          keyword: draft.keyword,
          context: draft.context ?? null,
          ai_suggestions: draft.ai_suggestions ?? [],
          status: draft.status ?? 'open',
          created_at: now,
          updated_at: now,
        };

        set((state) => ({
          keywordNotes: [newNote, ...state.keywordNotes],
        }));

        return newNote;
      },

      removeKeywordNote: (noteId) =>
        set((state) => ({
          keywordNotes: state.keywordNotes.filter(
            (note) => note.keyword_note_id !== noteId
          ),
        })),

      setMaterialImages: (materials) => set({ materialImages: materials }),

      upsertMaterialImage: (materialId, draft) => {
        const now = new Date().toISOString();
        if (materialId) {
          const existing = get().materialImages.find(
            (material) => material.material_id === materialId
          );
          if (!existing) {
            throw new Error('指定した資料が見つかりません');
          }
          const merged: MaterialImage = {
            ...existing,
            ...draft,
            updated_at: now,
          };
          set((state) => ({
            materialImages: state.materialImages.map((material) =>
              material.material_id === materialId ? merged : material
            ),
          }));
          return merged;
        }

        const newMaterial: MaterialImage = {
          material_id: crypto.randomUUID(),
          event_id: draft.event_id,
          target_company_id: draft.target_company_id ?? null,
          visit_note_id: draft.visit_note_id ?? null,
          image_id: draft.image_id,
          caption: draft.caption ?? null,
          tags: draft.tags ?? [],
          ocr_text: draft.ocr_text ?? null,
          ai_summary: draft.ai_summary ?? null,
          created_at: now,
          updated_at: now,
        };

        set((state) => ({
          materialImages: [newMaterial, ...state.materialImages],
        }));

        return newMaterial;
      },

      removeMaterialImage: (materialId) =>
        set((state) => ({
          materialImages: state.materialImages.filter(
            (material) => material.material_id !== materialId
          ),
        })),

      setTasks: (tasks) => set({ tasks }),

      upsertTask: (taskId, draft) => {
        const now = new Date().toISOString();
        if (taskId) {
          const existing = get().tasks.find((task) => task.task_id === taskId);
          if (!existing) {
            throw new Error('指定したタスクが見つかりません');
          }
          const merged: Task = {
            ...existing,
            ...draft,
            status: draft.status ?? existing.status,
            priority: draft.priority ?? existing.priority,
            updated_at: now,
          };
          set((state) => ({
            tasks: state.tasks.map((task) =>
              task.task_id === taskId ? merged : task
            ),
          }));
          return merged;
        }

        const newTask: Task = {
          task_id: crypto.randomUUID(),
          event_id: draft.event_id,
          title: draft.title,
          description: draft.description ?? null,
          status: draft.status ?? 'open',
          due_date: draft.due_date ?? null,
          target_company_id: draft.target_company_id ?? null,
          visit_note_id: draft.visit_note_id ?? null,
          source: draft.source ?? null,
          priority: draft.priority ?? null,
          created_at: now,
          updated_at: now,
        };

        set((state) => ({
          tasks: [newTask, ...state.tasks],
        }));

        return newTask;
      },

      removeTask: (taskId) =>
        set((state) => ({
          tasks: state.tasks.filter((task) => task.task_id !== taskId),
        })),

      setEventReports: (reports) => set({ eventReports: reports }),

      upsertEventReport: (report) =>
        set((state) => ({
          eventReports: [
            report,
            ...state.eventReports.filter(
              (stored) => stored.report_id !== report.report_id
            ),
          ],
        })),

      removeEventReport: (reportId) =>
        set((state) => ({
          eventReports: state.eventReports.filter(
            (report) => report.report_id !== reportId
          ),
        })),

      setUploadedImage: (image) =>
        set((state) => ({
          uploadedImages: { ...state.uploadedImages, [image.image_id]: image },
        })),

      getUploadedImage: (imageId) => get().uploadedImages[imageId],

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

      setCardLinkage: (cardId, linkage) =>
        set((state) => ({
          businessCards: state.businessCards.map((card) =>
            card.card_id === cardId
              ? {
                  ...card,
                  event_id: linkage.event_id ?? null,
                  booth_id: linkage.booth_id ?? null,
                  visit_notes: linkage.visit_notes ?? null,
                }
              : card
          ),
        })),

      setCardHighlight: (cardId, highlight) =>
        set((state) => ({
          businessCards: state.businessCards.map((card) =>
            card.card_id === cardId ? { ...card, highlight } : card
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

      setMeetingVisitContext: (meetingId, context) =>
        set((state) => ({
          meetings: Object.fromEntries(
            Object.entries(state.meetings).map(([key, meeting]) =>
              meeting.meeting_id === meetingId
                ? [
                    key,
                    {
                      ...meeting,
                      event_id: context.event_id ?? meeting.event_id ?? null,
                      booth_id: context.booth_id ?? meeting.booth_id ?? null,
                      booth_visit_memo:
                        context.booth_visit_memo ?? meeting.booth_visit_memo ?? null,
                      followup_tasks:
                        context.followup_tasks ?? meeting.followup_tasks ?? [],
                    },
                  ]
                : [key, meeting]
            )
          ),
        })),
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
