// Original file: proto/Chat.proto

import type { GroupInfo as _chatPackage_GroupInfo, GroupInfo__Output as _chatPackage_GroupInfo__Output } from '../chatPackage/GroupInfo';

export interface GroupMessage {
  'groupInfo'?: (_chatPackage_GroupInfo | null);
  'message'?: (string);
}

export interface GroupMessage__Output {
  'groupInfo'?: (_chatPackage_GroupInfo__Output);
  'message'?: (string);
}
