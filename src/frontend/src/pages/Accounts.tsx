import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  DollarSign,
  Loader2,
  Plus,
  Trash2,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import type { Page } from "../App";
import { Button } from "../components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Skeleton } from "../components/ui/skeleton";
import { useActor } from "../hooks/useActor";

interface Props {
  navigate: (p: Page) => void;
}

function formatDate(ts: bigint): string {
  return new Date(Number(ts)).toLocaleDateString("en-IN");
}

export function Accounts({ navigate: _ }: Props) {
  const { actor } = useActor();
  const qc = useQueryClient();

  const { data: profit, isLoading: loadingProfit } = useQuery({
    queryKey: ["profit-summary"],
    queryFn: () => actor!.getProfitSummary(),
    enabled: !!actor,
  });

  const { data: expenses, isLoading: loadingExpenses } = useQuery({
    queryKey: ["expenses"],
    queryFn: () => actor!.listExpenses(),
    enabled: !!actor,
  });

  const { data: expSummary, isLoading: loadingExpSummary } = useQuery({
    queryKey: ["expense-summary"],
    queryFn: () => actor!.getExpenseSummary(),
    enabled: !!actor,
  });

  const [desc, setDesc] = useState("");
  const [category, setCategory] = useState("Rent");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);

  const addMut = useMutation({
    mutationFn: () =>
      actor!.addExpense({
        description: desc,
        category,
        amount: Number.parseFloat(amount) || 0,
        date: BigInt(new Date(date).getTime()),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["expenses"] });
      qc.invalidateQueries({ queryKey: ["expense-summary"] });
      toast.success("Expense added");
      setDesc("");
      setAmount("");
    },
    onError: () => toast.error("Failed to add expense"),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => actor!.deleteExpense(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["expenses"] });
      qc.invalidateQueries({ queryKey: ["expense-summary"] });
      qc.invalidateQueries({ queryKey: ["profit-summary"] });
      toast.success("Deleted Successfully");
    },
    onError: () => toast.error("Failed to delete expense"),
  });

  function handleDelete(id: string) {
    if (window.confirm("Are you sure you want to delete this expense?")) {
      deleteMut.mutate(id);
    }
  }

  const netEarnings = (profit?.totalNetProfit ?? 0) - (expSummary?.total ?? 0);

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold text-white">Accounts</h1>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard
          title="Today's Profit"
          value={profit?.today}
          icon={<TrendingUp className="h-4 w-4 text-green-400" />}
          color="text-green-400"
          loading={loadingProfit}
        />
        <SummaryCard
          title="Monthly Profit"
          value={profit?.thisMonth}
          icon={<TrendingUp className="h-4 w-4 text-amber-400" />}
          color="text-amber-400"
          loading={loadingProfit}
        />
        <SummaryCard
          title="Monthly Expenses"
          value={expSummary?.thisMonth}
          icon={<TrendingDown className="h-4 w-4 text-red-400" />}
          color="text-red-400"
          loading={loadingExpSummary}
        />
        <Card className="bg-slate-800 border-slate-700 border-l-4 border-l-purple-500">
          <CardContent className="p-4">
            <DollarSign className="h-4 w-4 text-purple-400" />
            {loadingProfit || loadingExpSummary ? (
              <Skeleton className="h-7 w-20 mt-2" />
            ) : (
              <div
                className={`text-2xl font-bold mt-1 ${
                  netEarnings >= 0 ? "text-purple-400" : "text-red-400"
                }`}
              >
                ₹{netEarnings.toFixed(0)}
              </div>
            )}
            <div className="text-slate-400 text-xs mt-0.5">Net Earnings</div>
          </CardContent>
        </Card>
      </div>

      {/* Add Expense */}
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader className="pb-3">
          <CardTitle className="text-white text-base">Add Expense</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              addMut.mutate();
            }}
            className="flex flex-wrap gap-3"
          >
            <Input
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              required
              placeholder="Description"
              className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-500 flex-1 min-w-36"
            />
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white text-sm"
            >
              <option>Rent</option>
              <option>Bills</option>
              <option>Materials</option>
              <option>Other</option>
            </select>
            <Input
              type="number"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
              placeholder="Amount (₹)"
              className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-500 w-32"
            />
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="bg-slate-700 border-slate-600 text-white w-36"
            />
            <Button
              type="submit"
              disabled={addMut.isPending}
              className="bg-amber-500 hover:bg-amber-600 text-slate-900 font-semibold"
            >
              {addMut.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-1" />
                  Add
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Expenses Table */}
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader className="pb-3">
          <div className="flex justify-between items-center">
            <CardTitle className="text-white text-base">Expense Log</CardTitle>
            <span className="text-slate-400 text-sm">
              Total: ₹{expSummary?.total?.toFixed(0) ?? 0}
            </span>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loadingExpenses ? (
            <div className="p-4 space-y-2">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : (expenses ?? []).length === 0 ? (
            <p className="text-slate-400 text-sm text-center py-8">
              No expenses recorded yet.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-slate-400 border-b border-slate-700">
                    <th className="text-left p-3 font-medium">Date</th>
                    <th className="text-left p-3 font-medium">Description</th>
                    <th className="text-left p-3 font-medium">Category</th>
                    <th className="text-left p-3 font-medium">Amount</th>
                    <th className="p-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/50">
                  {[...(expenses ?? [])]
                    .sort((a, b) => Number(b.date) - Number(a.date))
                    .map((e) => (
                      <tr key={e.id} className="hover:bg-slate-700/30">
                        <td className="p-3 text-slate-400">
                          {formatDate(e.date)}
                        </td>
                        <td className="p-3 text-white">{e.description}</td>
                        <td className="p-3 text-slate-300">{e.category}</td>
                        <td className="p-3 text-red-400 font-medium">
                          ₹{e.amount.toFixed(2)}
                        </td>
                        <td className="p-3">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-slate-400 hover:text-red-400"
                            disabled={deleteMut.isPending}
                            onClick={() => handleDelete(e.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function SummaryCard({
  title,
  value,
  icon,
  color,
  loading,
}: {
  title: string;
  value?: number;
  icon: React.ReactNode;
  color: string;
  loading: boolean;
}) {
  return (
    <Card className="bg-slate-800 border-slate-700">
      <CardContent className="p-4">
        {icon}
        {loading ? (
          <Skeleton className="h-7 w-20 mt-2" />
        ) : (
          <div className={`text-2xl font-bold mt-1 ${color}`}>
            ₹{(value ?? 0).toFixed(0)}
          </div>
        )}
        <div className="text-slate-400 text-xs mt-0.5">{title}</div>
      </CardContent>
    </Card>
  );
}
