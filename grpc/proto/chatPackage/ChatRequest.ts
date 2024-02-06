// Original file: proto/Chat.proto

import type { GroupMessage as _chatPackage_GroupMessage, GroupMessage__Output as _chatPackage_GroupMessage__Output } from '../chatPackage/GroupMessage';

export interface ChatRequest {
  'message'?: (string);
  'groupMessage'?: (_chatPackage_GroupMessage | null);
  'messageType'?: "message"|"groupMessage";
}

export interface ChatRequest__Output {
  'message'?: (string);
  'groupMessage'?: (_chatPackage_GroupMessage__Output);
}
