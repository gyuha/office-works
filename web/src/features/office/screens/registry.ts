import type { ScreenModule } from './types';

import { approvalScreens } from './approval';
import { attendanceScreens } from './attendance';
import { membersScreens } from './members';
import { projectsScreens } from './projects';
import { settingsScreens } from './settings';
import { teamsScreens } from './teams';

export const SCREEN_REGISTRY: ScreenModule = {
  ...membersScreens,
  ...teamsScreens,
  ...settingsScreens,
  ...projectsScreens,
  ...approvalScreens,
  ...attendanceScreens,
};
