import type {
  AssemblyAttendanceKind,
  AssemblyNoticeMethod,
  GeneralAssemblyMeetingType,
} from "@siteyonetim/db";

export type GovernanceContext = {
  organizationId: string;
  propertyId: string;
  actorUserId?: string | null;
};

export type GeneralAssemblyMeetingSummaryDto = {
  id: string;
  propertyId: string;
  meetingDate: string;
  meetingType: GeneralAssemblyMeetingType;
  title: string | null;
  linkedReportId: string | null;
  noticeSentAt: string | null;
  noticeMethod: AssemblyNoticeMethod | null;
  decisionCount: number;
  attendanceCount: number;
};

export type AssemblyDecisionDto = {
  id: string;
  meetingId: string;
  topic: string;
  outcome: string;
  sortOrder: number;
};

export type AssemblyAttendanceDto = {
  id: string;
  meetingId: string;
  unitId: string;
  unitCode: string;
  blockName: string | null;
  partyName: string | null;
  attendanceKind: AssemblyAttendanceKind;
  proxyHolderName: string | null;
  notes: string | null;
};

export type GeneralAssemblyMeetingDetailDto = {
  id: string;
  propertyId: string;
  propertyName: string;
  organizationName: string;
  meetingDate: string;
  meetingType: GeneralAssemblyMeetingType;
  title: string | null;
  linkedReportId: string | null;
  linkedReportLabel: string | null;
  noticeSentAt: string | null;
  noticeMethod: AssemblyNoticeMethod | null;
  notes: string | null;
  decisions: AssemblyDecisionDto[];
  attendances: AssemblyAttendanceDto[];
};

export type PaginatedMeetings = {
  items: GeneralAssemblyMeetingSummaryDto[];
  total: number;
  page: number;
  pageSize: number;
};

export type ListMeetingsInput = GovernanceContext & {
  page: number;
  pageSize: number;
};

export type CreateMeetingInput = GovernanceContext & {
  meetingDate: string;
  meetingType: GeneralAssemblyMeetingType;
  title?: string | null;
  linkedReportId?: string | null;
  noticeSentAt?: string | null;
  noticeMethod?: AssemblyNoticeMethod | null;
  notes?: string | null;
};

export type UpdateMeetingInput = GovernanceContext & {
  meetingId: string;
  meetingDate: string;
  meetingType: GeneralAssemblyMeetingType;
  title?: string | null;
  linkedReportId?: string | null;
  noticeSentAt?: string | null;
  noticeMethod?: AssemblyNoticeMethod | null;
  notes?: string | null;
};

export type DeleteMeetingInput = GovernanceContext & {
  meetingId: string;
};

export type AddDecisionInput = GovernanceContext & {
  meetingId: string;
  topic: string;
  outcome: string;
};

export type UpdateDecisionInput = GovernanceContext & {
  meetingId: string;
  decisionId: string;
  topic: string;
  outcome: string;
};

export type DeleteDecisionInput = GovernanceContext & {
  meetingId: string;
  decisionId: string;
};

export type UpsertAttendanceInput = GovernanceContext & {
  meetingId: string;
  unitId: string;
  attendanceKind: AssemblyAttendanceKind;
  proxyHolderName?: string | null;
  notes?: string | null;
};

export type DeleteAttendanceInput = GovernanceContext & {
  meetingId: string;
  attendanceId: string;
};

export type HazirunExportInput = GovernanceContext & {
  meetingId: string;
  locale?: string;
};

export interface GovernanceServiceContract {
  listMeetings(input: ListMeetingsInput): Promise<PaginatedMeetings>;
  getMeeting(ctx: GovernanceContext, meetingId: string): Promise<GeneralAssemblyMeetingDetailDto | null>;
  createMeeting(input: CreateMeetingInput): Promise<GeneralAssemblyMeetingDetailDto>;
  updateMeeting(input: UpdateMeetingInput): Promise<GeneralAssemblyMeetingDetailDto>;
  deleteMeeting(input: DeleteMeetingInput): Promise<void>;
  addDecision(input: AddDecisionInput): Promise<AssemblyDecisionDto>;
  updateDecision(input: UpdateDecisionInput): Promise<AssemblyDecisionDto>;
  deleteDecision(input: DeleteDecisionInput): Promise<void>;
  upsertAttendance(input: UpsertAttendanceInput): Promise<AssemblyAttendanceDto>;
  deleteAttendance(input: DeleteAttendanceInput): Promise<void>;
  exportHazirunPdf(input: HazirunExportInput): Promise<{ buffer: Buffer; fileName: string }>;
}

export type { AssemblyAttendanceKind, AssemblyNoticeMethod, GeneralAssemblyMeetingType };
