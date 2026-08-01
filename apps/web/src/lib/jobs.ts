import { createJobService } from "@siteyonetim/platform-jobs";

import { getDuesService, getNotificationService } from "@/lib/services";

export function getJobService() {
  return createJobService(getDuesService(), getNotificationService());
}
