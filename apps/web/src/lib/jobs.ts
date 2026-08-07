import { createJobService } from "@siteyonetim/platform-jobs";

import { getAuditorReportService, getDuesService, getNotificationService } from "@/lib/services";

export function getJobService() {
  return createJobService(getDuesService(), getNotificationService(), getAuditorReportService());
}
