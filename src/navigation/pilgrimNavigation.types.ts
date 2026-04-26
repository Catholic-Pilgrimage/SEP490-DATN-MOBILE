import type { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";
import type { CompositeNavigationProp, NavigatorScreenParams, RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp, NativeStackScreenProps } from "@react-navigation/native-stack";
import type { PlanItem, TransportationType } from "../types/pilgrim/planner.types";

export type PlannerInitialTab = "my" | "invited";

export type PlannerPlanPrefill = {
  id: string;
  name?: string;
  title?: string;
  status?: string;
  start_date?: string;
  end_date?: string;
  startDate?: string;
  endDate?: string;
  number_of_days?: number;
  number_of_people?: number;
  item_count?: number;
  transportation?: TransportationType | string;
};

/** Tham số tùy chọn màn tạo kế hoạch — từ bài cộng đồng (clone) hoặc không truyền (tạo mới). */
export type CreatePlanScreenParams = {
  cloneSourcePlanId: string;
  prefillName: string;
  prefillStartDate: string;
  prefillEndDate: string;
  prefillPeople: number;
  prefillTransportation: string;
  prefillDeposit: number;
  prefillPenalty: number;
};

export type PlannerStackParamList = {
  PlannerMain: { initialTab?: PlannerInitialTab; token?: string; refresh?: number } | undefined;
  PlanDetailScreen: {
    planId: string;
    autoAddSiteId?: string;
    autoAddDay?: number;
    planPrefill?: PlannerPlanPrefill;
    inviteToken?: string;
    inviteStatus?: string;
    invitedView?: boolean;
    ownerName?: string;
    ownerEmail?: string;
    depositAmount?: number | string;
    penaltyPercentage?: number | string;
    inviteType?: string;
  };
  ActiveJourneyScreen: { planId: string };
  PlannerMapScreen: {
    planId: string;
    focusItemId?: string;
    focusDay?: string;
    itemsByDay?: Record<string, PlanItem[]>;
  };
  NearbySiteAmenitiesScreen: {
    planId?: string;
    siteId: string;
    siteName?: string;
    siteAddress?: string;
    latitude?: number;
    longitude?: number;
    itemsByDay?: Record<string, PlanItem[]>;
  };
  CreatePlanScreen: CreatePlanScreenParams | undefined;
  AIRouteSuggestionScreen: undefined;
};

export type JournalStackParamList = {
  JournalMain: undefined;
  JournalDetailScreen: { journalId?: string } | undefined;
  CreateJournalScreen:
    | {
        journalId?: string;
        plannerItemId?: string;
        plannerItemIds?: string[];
        planId?: string;
        planName?: string;
        siteName?: string;
        from?: "ActiveJourney" | string;
      }
    | undefined;
};

export type PilgrimTabParamList = {
  "Hanh huong": undefined;
  "Nhat ky": NavigatorScreenParams<JournalStackParamList> | undefined;
  "Lich trinh": NavigatorScreenParams<PlannerStackParamList> | undefined;
  "Cong dong": undefined;
  "Ho so": undefined;
};

export type PilgrimMainStackParamList = {
  MainTabs: undefined;
  PlanChatScreen: { planId: string; planName?: string; ownerId?: string };
  PlannerMembersScreen:
    | { planId?: string; planName?: string; readOnlyFormerMember?: boolean }
    | undefined;
  SiteDetail: { siteId: string };
  AllSites: undefined;
  FriendList: undefined;
  SOSHistory: undefined;
  SOSDetail: { id?: string } | undefined;
  JournalDetail: { journalId?: string } | undefined;
  CreateJournalScreen:
    | {
        journalId?: string;
        plannerItemId?: string;
        plannerItemIds?: string[];
        planId?: string;
        planName?: string;
        siteName?: string;
        from?: "ActiveJourney" | string;
      }
    | undefined;
};

export type PlannerCompositeNavigationProp = CompositeNavigationProp<
  NativeStackNavigationProp<PlannerStackParamList>,
  CompositeNavigationProp<
    NativeStackNavigationProp<PilgrimMainStackParamList>,
    BottomTabNavigationProp<PilgrimTabParamList>
  >
>;

export type PlannerScreenProps<T extends keyof PlannerStackParamList> = NativeStackScreenProps<
  PlannerStackParamList,
  T
>;

export type PlannerRouteProp<T extends keyof PlannerStackParamList> = RouteProp<
  PlannerStackParamList,
  T
>;
