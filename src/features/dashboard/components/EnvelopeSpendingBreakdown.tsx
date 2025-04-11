import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { useQuery } from 'wasp/client/operations';
import { getSpendingByEnvelope } from 'wasp/client/operations';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { Skeleton } from '../../../components/ui/skeleton';

// Define some colors for the pie chart segments
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#A36EFE', '#F76E8C'];

type EnvelopeSpendingBreakdownProps = {
  budgetIds: string[];
};

export function EnvelopeSpendingBreakdown({ budgetIds }: EnvelopeSpendingBreakdownProps) {
  const { data: spendingData, isLoading, error } = useQuery(
    getSpendingByEnvelope,
    { budgetIds },
    { enabled: budgetIds.length > 0 }
  );

 if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-3/4" />
        </CardHeader>
        <CardContent className="flex justify-center items-center h-[350px]">
           <Skeleton className="h-48 w-48 rounded-full" />
        </CardContent>
      </Card>
    )
  }

  if (error) {
     return (
       <Card>
          <CardHeader><CardTitle>Spending by Envelope</CardTitle></CardHeader>
          <CardContent><p className='text-red-500'>Error loading data: {error.message}</p></CardContent>
       </Card>
    );
  }

  const hasSpendingData = spendingData && spendingData.length > 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Spending by Envelope (Current Month)</CardTitle>
      </CardHeader>
      <CardContent>
        {hasSpendingData ? (
          <ResponsiveContainer width='100%' height={350}>
            <PieChart>
              <Pie
                data={spendingData}
                cx='50%'
                cy='50%'
                labelLine={false}
                // label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} // Example label
                outerRadius={100} // Adjust size as needed
                fill='#8884d8'
                dataKey='total'
                nameKey='name'
              >
                {spendingData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value: number, name: string) => [`$${value.toFixed(2)}`, name]} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex justify-center items-center h-[350px]">
            <p className="text-muted-foreground">No spending data for the current month.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
} 