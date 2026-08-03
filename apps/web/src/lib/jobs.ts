import { createJobService } from "@siteyonetim/platform-jobs";

import { getBankingService, getDuesService, getNotificationService } from "@/lib/services";

export function getJobService() {
  return createJobService(getDuesService(), getNotificationService(), undefined, getBankingService());
}
