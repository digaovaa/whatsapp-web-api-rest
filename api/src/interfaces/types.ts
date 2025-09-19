// Tipos base inspirados em pkg/interfaces da API Go

export type MediaType =
  | 'audio'
  | 'image'
  | 'document'
  | 'sticker'
  | 'video'
  | 'location'
  | 'contact'
  | 'list'
  | 'order'
  | 'payment'
  | 'poll'
  | 'text'
  | 'live_location'
  | 'animated_sticker'
  | 'reaction'
  | 'unknown';

export interface MessageRequest {
  Phone: string;
  Body: string;
  IsForwarded?: boolean;
  ReplyMessageID?: string | null;
}

export interface EditMessageRequest {
  Phone: string;
  Body: string;
  Id: string;
}

export interface ReactMessageRequest {
  Phone: string;
  Body: string;
  ID: string;
  FromMe: boolean;
}

export interface ChatPresenceRequest {
  Phone: string;
  State: string;
  Media?: string;
}

export interface ImageRequest {
  Phone: string;
  Caption?: string;
  Image?: string;
  FileURL?: string | null;
  ViewOnce?: boolean;
  Compress?: boolean;
  IsForwarded?: boolean;
}

export interface AudioRequest {
  Phone: string;
  Audio?: string;
  FileURL?: string | null;
  IsForwarded?: boolean;
}

export interface FileRequest {
  Phone: string;
  Document?: string;
  FileName?: string;
  FileURL?: string | null;
  Caption?: string;
  IsForwarded?: boolean;
}

export interface VCard {
  Phone: string;
  ContactName: string;
  ContactPhone: string;
}

export interface ContactRequest {
  Phone: string;
  VCard: VCard;
  IsForwarded?: boolean;
}

export interface ListItem {
  Title: string;
  Desc?: string;
  RowId: string;
}

export interface ListSection {
  Title: string;
  Rows: ListItem[];
}

export interface ListRequest {
  Phone: string;
  ButtonText: string;
  Desc?: string;
  TopText?: string;
  Sections?: ListSection[];
  List?: ListItem[]; // compat
  FooterText?: string;
  Id?: string;
}

export interface RevokeMessageRequest {
  Phone: string;
  ID: string;
}

export interface UserInfoRequest {
  Phone: string[];
}

export interface UserAvatarRequest {
  Phone: string;
  Preview?: boolean;
}

export interface UserRequest {
  Token: string;
  Name: string;
  Instance?: string;
  CompanyToken?: string;
  WhatsAppID?: number;
  Events?: string;
  Webhook?: string;
  MultiCompanyId?: number;
}

export interface WebhookRequest {
  WebhookURL: string;
}

export interface PairingRequest {
  Phone: string;
}

export interface LinkRequest {
  Phone: string;
  Caption?: string;
  Link: string;
  IsForwarded?: boolean;
}

export interface GroupInfoRequest {
  GroupJID: string;
}

export interface CreateGroupRequest {
  GroupName: string;
  Participants: string[]; // JIDs
}

export interface GetGroupInfoRequest {
  GroupJID: string;
  Reset?: boolean;
}


