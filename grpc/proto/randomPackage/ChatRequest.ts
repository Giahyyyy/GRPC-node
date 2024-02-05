// Original file: proto/random.proto

import type { GroupMessage as _randomPackage_GroupMessage, GroupMessage__Output as _randomPackage_GroupMessage__Output } from '../randomPackage/GroupMessage';

export interface ChatRequest {
  'message'?: (string);
  'groupMessage'?: (_randomPackage_GroupMessage | null);
  'messageType'?: "message"|"groupMessage";
}

export interface ChatRequest__Output {
  'message'?: (string);
  'groupMessage'?: (_randomPackage_GroupMessage__Output);
}
