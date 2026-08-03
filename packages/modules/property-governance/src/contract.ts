import type {
  AssemblyAttendanceMode,
  AssemblyDecisionOutcome,
  AuditorReportPeriod,
  GeneralAssemblyMeetingType,
} from "@siteyonetim/db";

export type GovernanceContext = {
  organizationId: string;
  propertyId: string;
  actorUserId?: string | null;
};

export type AssemblyDecisionDto = {
  id: string;
  subject: string;
  outcome: AssemblyDecisionOutcome;
  voteFor: number | null;
  voteAgainst: number | null;
  voteAbstain: number | null;
  sortOrder: number;
};

export type AssemblyAttendanceDto = {
  id: string;
  unitId: string;
  unitCode: string;
  blockName: string | null;
  ownerName: string | null;
  mode: AssemblyAttendanceMode;
  proxyHolder: string | null;
  notes: string | null;
};

export type GeneralAssemblyMeetingDto = {
  id: string;
  meetingType: GeneralAssemblyMeetingType;
  meetingDate: Date;
  location: string | null;
  agendaSummary: string | null;
  noticeSentAt: Date | null;
  noticeMethod: string | null;
  linkedReportId: string | null;
  linkedReportLabel: string | null;
  decisionCount: number;
  attendanceCount: number;
  presentCount: number;
};

export type GeneralAssemblyMeetingDetailDto = GeneralAssemblyMeetingDto & {
  decisions: AssemblyDecisionDto[];
  attendances: AssemblyAttendanceDto[];
};

export type ApprovedAuditorReportOptionDto = {
  id: string;
  year: number;
  period: AuditorReportPeriod;
  approvedAt: string | null;
};

export type PaginatedMeetings = {
  items: GeneralAssemblyMeetingDto[];
  total: number;
  page: number;
  pageSize: number;
};

export type ListMeetingsInput = GovernanceContext & {
  page: number;
  pageSize: number;
  year?: number;
};

export type CreateMeetingInput = GovernanceContext & {
  meetingType: GeneralAssemblyMeetingType;
  meetingDate: Date;
  location?: string | null;
  agendaSummary?: string | null;
  noticeSentAt?: Date | null;
  noticeMethod?: string | null;
  linkedReportId?: string | null;
};

export type UpdateMeetingInput = GovernanceContext & {
  meetingId: string;
  meetingType?: GeneralAssemblyMeetingType;
  meetingDate?: Date;
  location?: string | null;
  agendaSummary?: string | null;
  noticeSentAt?: Date | null;
  noticeMethod?: string | null;
  linkedReportId?: string | null;
};

export type UpsertDecisionInput = GovernanceContext & {
  meetingId: string;
  decisionId?: string | null;
  subject: string;
  outcome?: AssemblyDecisionOutcome;
  voteFor?: number | null;
  voteAgainst?: number | null;
  voteAbstain?: number | null;
  sortOrder?: number;
};

export type DeleteDecisionInput = GovernanceContext & {
  meetingId: string;
  decisionId: string;
};

export type UpsertAttendanceInput = GovernanceContext & {
  meetingId: string;
  unitId: string;
  mode: AssemblyAttendanceMode;
  proxyHolder?: string | null;
  notes?: string | null;
};

export type DeleteMeetingInput = GovernanceContext & {
  meetingId: string;
};

export type ExportHazirunInput = GovernanceContext & {
  meetingId: string;
  locale?: string;
  propertyName?: string;
};

export interface GovernanceServiceContract {
  listMeetings(input: ListMeetingsInput): Promise<PaginatedMeetings>;
  getMeeting(ctx: GovernanceContext, meetingId: string): Promise<GeneralAssemblyMeetingDetailDto | null>;
  createMeeting(input: CreateMeetingInput): Promise<GeneralAssemblyMeetingDetailDto>;
  updateMeeting(input: UpdateMeetingInput): Promise<GeneralAssemblyMeetingDetailDto>;
  deleteMeeting(input: DeleteMeetingInput): Promise<void>;
  upsertDecision(input: UpsertDecisionInput): Promise<AssemblyDecisionDto>;
  deleteDecision(input: DeleteDecisionInput): Promise<void>;
  upsertAttendance(input: UpsertAttendanceInput): Promise<AssemblyAttendanceDto>;
  listApprovedReportOptions(ctx: GovernanceContext, year?: number): Promise<ApprovedAuditorReportOptionDto[]>;
  exportHazirunPdf(input: ExportHazirunInput): Promise<{ buffer: Buffer; contentType: string; extension: string }>;
}
