import collectors from "@/data/collectors.json";
import { supabase } from "@/integrations/supabase/client";

export type Attachment = {
  name: string;
  type: string; // MIME
  kind: "image" | "audio" | "file";
  dataUrl: string;
};

export type Message = {
  id: string;
  fromEmployeeId: string;
  fromName: string;
  toEmployeeId: string;
  toName: string;
  body: string;
  attachments: Attachment[];
  createdAt: string;
  read?: boolean;
};

export const MESSAGES_KEY = "wallet:messages:v1";
export const GROUP_KEY = "wallet:group:members"; // string[] employeeIds
export const COLLECTORS_EXTRA_KEY = "wallet:collectors:extra";

export type Collector = { supervisor: string; collector: string; employeeId: string };

export function getAllCollectors(): Collector[] {
  const base = collectors as Collector[];
  let extra: Collector[] = [];
  if (typeof window !== "undefined") {
    try {
      extra = JSON.parse(localStorage.getItem(COLLECTORS_EXTRA_KEY) || "[]");
    } catch {}
  }
  const map = new Map<string, Collector>();
  [...base, ...extra].forEach((c) => map.set(c.employeeId, c));
  return Array.from(map.values());
}

export function readMessages(): Message[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(MESSAGES_KEY) || "[]");
  } catch {
    return [];
  }
}
export function writeMessages(arr: Message[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(MESSAGES_KEY, JSON.stringify(arr));
  } catch {}
}
export function addMessage(m: Message) {
  const all = readMessages();
  all.unshift(m);
  writeMessages(all);
}

// Cached snapshot (synchronous read for UI); kept in sync via fetchGroupMembers() / realtime.
let _groupCache: string[] = [];
let _groupLoaded = false;

export function getGroupMembers(): string[] {
  if (typeof window === "undefined") return [];
  if (!_groupLoaded) {
    try {
      _groupCache = JSON.parse(localStorage.getItem(GROUP_KEY) || "[]");
    } catch {
      _groupCache = [];
    }
  }
  return _groupCache;
}

function _writeCache(ids: string[]) {
  _groupCache = ids;
  _groupLoaded = true;
  try {
    localStorage.setItem(GROUP_KEY, JSON.stringify(ids));
  } catch {}
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("group-members-changed"));
  }
}

export async function fetchGroupMembers(): Promise<string[]> {
  const { data, error } = await supabase.from("group_members").select("employee_id");
  if (error) {
    console.error("fetchGroupMembers", error);
    return getGroupMembers();
  }
  const ids = (data ?? []).map((r: any) => String(r.employee_id));
  _writeCache(ids);
  return ids;
}

export async function addGroupMember(employeeId: string) {
  const { error } = await supabase.from("group_members").insert({ employee_id: employeeId });
  if (error && !String(error.message).includes("duplicate")) throw error;
  const next = Array.from(new Set([..._groupCache, employeeId]));
  _writeCache(next);
}

export async function removeGroupMember(employeeId: string) {
  const { error } = await supabase.from("group_members").delete().eq("employee_id", employeeId);
  if (error) throw error;
  _writeCache(_groupCache.filter((x) => x !== employeeId));
}

export function isInGroup(employeeId?: string) {
  if (!employeeId) return false;
  return getGroupMembers().includes(employeeId);
}
