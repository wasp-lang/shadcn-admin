import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend } from 'recharts';
import { useQuery } from 'wasp/client/operations';
import { getDashboardTotals } from 'wasp/client/operations';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card'; // Assuming shadcn card
import { Skeleton } from '../../../components/ui/skeleton'; // Assuming shadcn skeleton

type IncomeExpenseOverviewProps = {
  budgetIds: string[];
};

export function IncomeExpenseOverview({ budgetIds }: IncomeExpenseOverviewProps) {
  const { data: totals, isLoading, error } = useQuery(
    getDashboardTotals,
    { budgetIds },
    { enabled: budgetIds.length > 0 } // Only run query if budgetIds exist
  );

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-1/2" />
        </CardHeader>
        <CardContent>
           <Skeleton className="h-[350px] w-full" />
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
       <Card>
          <CardHeader><CardTitle>Income vs. Expense</CardTitle></CardHeader>
          <CardContent><p className='text-red-500'>Error loading data: {error.message}</p></CardContent>
       </Card>
    );
  }

  // Prepare data for the chart
  const chartData = [
    { name: 'Income', total: totals?.income ?? 0 },
    { name: 'Expense', total: totals?.expense ?? 0 },
  ];

  return (
    <Card>
       <CardHeader>
          <CardTitle>Income vs. Expense (Current Month)</CardTitle>
       </CardHeader>
       <CardContent className='pl-2'> {/* Adjust padding for axis labels */}
          <ResponsiveContainer width='100%' height={350}>
             <BarChart data={chartData} layout="vertical" margin={{ right: 30 }}> {/* Vertical layout */}
                <XAxis
                  type="number" // XAxis is now numerical amount
                  stroke='#888888'
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => `$${value}`}
                />
                <YAxis
                  type="category" // YAxis is now categorical (Income/Expense)
                  dataKey='name'
                  stroke='#888888'
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  width={80} // Adjust width for labels
                />
                <Tooltip formatter={(value: number) => `$${value.toFixed(2)}`} />
                {/* Using primary fill for simplicity now, color logic can be complex */}
                 <Bar dataKey="total" fill="currentColor" radius={[0, 4, 4, 0]} className="fill-primary" maxBarSize={60}/>

             </BarChart>
          </ResponsiveContainer>
       </CardContent>
    </Card>
  );
} 