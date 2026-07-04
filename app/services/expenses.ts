import { fetchFromBackend } from "~/utils/backend";
import { cachedFetch, invalidatePrefix } from "~/utils/request-cache";
import { type Expense, type NewExpense } from "~/types/db";

// The whole-fleet expense list is read by several routes (a motorcycle's detail,
// fleet-expenses, documents) — cache it so those navigations reuse one request
// instead of re-fetching the entire collection each time. Mutations below
// invalidate it.
const EXPENSES_TTL_MS = 60_000;

export async function listExpenses(token: string) {
  const response = await cachedFetch(`expenses:${token}`, EXPENSES_TTL_MS, () =>
    fetchFromBackend<{ expenses: Expense[] }>("/expenses", {}, token),
  );
  return response.expenses;
}

export async function createExpense(token: string, values: NewExpense) {
  const response = await fetchFromBackend<{ expense: Expense }>("/expenses", {
    method: "POST",
    body: JSON.stringify(values),
  }, token);
  invalidatePrefix("expenses:");
  return response.expense;
}

export async function updateExpense(token: string, id: number, values: Partial<NewExpense>) {
  const response = await fetchFromBackend<{ expense: Expense }>(`/expenses/${id}`, {
    method: "PUT",
    body: JSON.stringify(values),
  }, token);
  invalidatePrefix("expenses:");
  return response.expense;
}

export async function deleteExpense(token: string, id: number) {
  await fetchFromBackend(`/expenses/${id}`, {
    method: "DELETE",
  }, token);
  invalidatePrefix("expenses:");
}
