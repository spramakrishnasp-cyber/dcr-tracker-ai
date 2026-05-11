import { supabase } from "@/integrations/supabase/client";

export type Customer = {
  id: string;
  created_by: string;
  customer_name: string;
  company_name: string | null;
  contact_person: string | null;
  mobile: string | null;
  email: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  customer_type: string | null;
  industry_segment: string | null;
  notes: string | null;
  status: "Active" | "Inactive";
  created_at: string;
  updated_at: string;
};

export type CallReport = {
  id: string;
  user_id: string;
  customer_id: string | null;
  call_date: string;
  call_time: string;
  meeting_type: "Physical Meeting" | "Phone Call" | "Video Call" | "Follow-up";
  product_discussed: string | null;
  discussion: string | null;
  order_status: "Interested" | "Trial Required" | "Follow-up Needed" | "Order Confirmed" | "No Response";
  meeting_outcome: string | null;
  next_follow_up: string | null;
  location: string | null;
  attachment_url: string | null;
  created_at: string;
  updated_at: string;
};

export type TravelExpense = {
  id: string;
  user_id: string;
  expense_date: string;
  daily_allowance: number;
  kilometers_travelled: number;
  ta_per_km: number;
  lodging_expense: number;
  travel_fare: number;
  other_expense: number;
  other_expense_note: string | null;
  details: string | null;
  other_expenses_items: { category: string; amount: number; note?: string | null }[];
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export async function fetchCustomers() {
  const { data, error } = await supabase
    .from("customers")
    .select("*")
    .order("customer_name");
  if (error) throw error;
  return data as Customer[];
}

export async function fetchReports() {
  const { data, error } = await supabase
    .from("call_reports")
    .select("*")
    .order("call_date", { ascending: false })
    .order("call_time", { ascending: false });
  if (error) throw error;
  return data as CallReport[];
}

export async function fetchProfiles() {
  const { data, error } = await supabase.from("profiles").select("id, full_name, email");
  if (error) throw error;
  return data as { id: string; full_name: string; email: string }[];
}

export async function fetchExpenses() {
  const { data, error } = await supabase
    .from("travelling_expenses")
    .select("*")
    .order("expense_date", { ascending: false });
  if (error) throw error;
  return data as TravelExpense[];
}