import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  ResponsiveContainer,
} from "recharts";
import { BookOpen, TrendingUp, AlertTriangle, DollarSign } from "lucide-react";

const COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--accent))",
  "hsl(var(--destructive))",
  "hsl(210, 70%, 55%)",
  "hsl(150, 60%, 45%)",
];

const monthlyChartConfig: ChartConfig = {
  count: { label: "Emprunts", color: "hsl(var(--primary))" },
};

const overdueChartConfig: ChartConfig = {
  onTime: { label: "À temps", color: "hsl(150, 60%, 45%)" },
  overdue: { label: "En retard", color: "hsl(var(--destructive))" },
};

const finesChartConfig: ChartConfig = {
  total: { label: "Amendes (€)", color: "hsl(var(--accent))" },
};

export const AdminDashboardCharts = () => {
  const [monthlyData, setMonthlyData] = useState<any[]>([]);
  const [popularBooks, setPopularBooks] = useState<any[]>([]);
  const [overdueRate, setOverdueRate] = useState({ onTime: 0, overdue: 0 });
  const [finesData, setFinesData] = useState<any[]>([]);
  const [totalFines, setTotalFines] = useState(0);
  const [unpaidFines, setUnpaidFines] = useState(0);

  useEffect(() => {
    fetchAllStats();
  }, []);

  const fetchAllStats = async () => {
    // Fetch all borrowings
    const { data: borrowings } = await supabase
      .from("borrowings")
      .select("*")
      .order("borrowed_at", { ascending: true });

    if (!borrowings) return;

    // --- Monthly borrowings ---
    const monthMap: Record<string, number> = {};
    const finesMap: Record<string, number> = {};
    const months = [
      "Jan", "Fév", "Mar", "Avr", "Mai", "Jun",
      "Jul", "Aoû", "Sep", "Oct", "Nov", "Déc",
    ];

    borrowings.forEach((b) => {
      const d = new Date(b.borrowed_at);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const label = `${months[d.getMonth()]} ${d.getFullYear()}`;
      monthMap[key] = (monthMap[key] || 0) + 1;

      if (b.fine_amount && b.fine_amount > 0) {
        finesMap[key] = (finesMap[key] || 0) + b.fine_amount;
      }
    });

    // Last 12 months
    const now = new Date();
    const last12: { key: string; label: string }[] = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      last12.push({ key, label: `${months[d.getMonth()]} ${String(d.getFullYear()).slice(2)}` });
    }

    setMonthlyData(last12.map((m) => ({ month: m.label, count: monthMap[m.key] || 0 })));
    setFinesData(last12.map((m) => ({ month: m.label, total: Number((finesMap[m.key] || 0).toFixed(2)) })));

    // --- Overdue rate ---
    const active = borrowings.filter((b) => b.status === "active");
    const overdueCount = active.filter((b) => new Date(b.due_date) < new Date()).length;
    setOverdueRate({ onTime: active.length - overdueCount, overdue: overdueCount });

    // --- Fines totals ---
    const total = borrowings.reduce((sum, b) => sum + (b.fine_amount || 0), 0);
    const unpaid = borrowings
      .filter((b) => b.fine_amount > 0 && !b.fine_paid)
      .reduce((sum, b) => sum + (b.fine_amount || 0), 0);
    setTotalFines(total);
    setUnpaidFines(unpaid);

    // --- Popular books ---
    const bookCounts: Record<string, number> = {};
    borrowings.forEach((b) => {
      bookCounts[b.book_id] = (bookCounts[b.book_id] || 0) + 1;
    });
    const topBookIds = Object.entries(bookCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    if (topBookIds.length > 0) {
      const { data: booksData } = await supabase
        .from("books")
        .select("id, title")
        .in("id", topBookIds.map(([id]) => id));

      setPopularBooks(
        topBookIds.map(([id, count]) => ({
          name: booksData?.find((b) => b.id === id)?.title?.slice(0, 20) || "N/A",
          count,
        }))
      );
    }
  };

  const pieData = [
    { name: "À temps", value: overdueRate.onTime },
    { name: "En retard", value: overdueRate.overdue },
  ].filter((d) => d.value > 0);

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6 text-center">
            <TrendingUp className="h-6 w-6 mx-auto mb-2 text-primary" />
            <p className="text-2xl font-bold">{monthlyData.reduce((s, d) => s + d.count, 0)}</p>
            <p className="text-xs text-muted-foreground">Emprunts (12 mois)</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <AlertTriangle className="h-6 w-6 mx-auto mb-2 text-destructive" />
            <p className="text-2xl font-bold text-destructive">{overdueRate.overdue}</p>
            <p className="text-xs text-muted-foreground">En retard actuellement</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <DollarSign className="h-6 w-6 mx-auto mb-2 text-accent" />
            <p className="text-2xl font-bold">{totalFines.toFixed(2)}€</p>
            <p className="text-xs text-muted-foreground">Amendes totales</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <DollarSign className="h-6 w-6 mx-auto mb-2 text-destructive" />
            <p className="text-2xl font-bold text-destructive">{unpaidFines.toFixed(2)}€</p>
            <p className="text-xs text-muted-foreground">Amendes impayées</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts row 1 */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Monthly borrowings */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Emprunts par mois</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={monthlyChartConfig} className="h-[250px] w-full">
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Popular books */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Livres les plus empruntés</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={monthlyChartConfig} className="h-[250px] w-full">
              <BarChart data={popularBooks} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis type="number" allowDecimals={false} />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={100} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="count" fill="hsl(var(--accent))" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      {/* Charts row 2 */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Overdue rate */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Taux de retard (emprunts actifs)</CardTitle>
          </CardHeader>
          <CardContent className="flex justify-center">
            {pieData.length > 0 ? (
              <ChartContainer config={overdueChartConfig} className="h-[250px] w-full max-w-[300px]">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={4}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    <Cell fill="hsl(150, 60%, 45%)" />
                    <Cell fill="hsl(var(--destructive))" />
                  </Pie>
                  <ChartTooltip content={<ChartTooltipContent />} />
                </PieChart>
              </ChartContainer>
            ) : (
              <p className="text-muted-foreground py-12">Aucun emprunt actif</p>
            )}
          </CardContent>
        </Card>

        {/* Fines over time */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Amendes collectées par mois (€)</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={finesChartConfig} className="h-[250px] w-full">
              <LineChart data={finesData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Line
                  type="monotone"
                  dataKey="total"
                  stroke="hsl(var(--accent))"
                  strokeWidth={2}
                  dot={{ fill: "hsl(var(--accent))" }}
                />
              </LineChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
