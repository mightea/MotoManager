import { fetchFromBackend } from "~/utils/backend";
import { type Expense, type NewExpense } from "~/types/db";

export async function listExpenses(token: string) {
  const response = await fetchFromBackend<{ expenses: Expense[] }>("/expenses", {}, token);
  return response.expenses;
}

export async function createExpense(token: string, values: NewExpense) {
  const response = await fetchFromBackend<{ expense: Expense }>("/expenses", {
    method: "POST",
    body: JSON.stringify(values),
  }, token);
  return response.expense;
}

export async function updateExpense(token: string, id: number, values: Partial<NewExpense>) {
  const response = await fetchFromBackend<{ expense: Expense }>(`/expenses/${id}`, {
    method: "PUT",
    body: JSON.stringify(values),
  }, token);
  return response.expense;
}

export async function deleteExpense(token: string, id: number) {
  await fetchFromBackend(`/expenses/${id}`, {
    method: "DELETE",
  }, token);
}
