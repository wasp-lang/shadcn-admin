import { Routes, routes } from 'wasp/client/router'
import { Button } from '../../components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../../components/ui/card'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '../../components/ui/tabs'
import { Header } from '../../components/layout/header'
import { Main } from '../../components/layout/main'
import { TopNav } from '../../components/layout/top-nav'
import { ProfileDropdown } from '../../components/profile-dropdown'
import { Search } from '../../components/search'
import { ThemeSwitch } from '../../components/theme-switch'
import { useQuery } from 'wasp/client/operations'
import { getAccessibleBudgets, getDashboardTotals } from 'wasp/client/operations'
import { Link } from 'wasp/client/router'
import { Skeleton } from '../../components/ui/skeleton'
import { IncomeExpenseOverview } from './components/IncomeExpenseOverview'
import { EnvelopeSpendingBreakdown } from './components/EnvelopeSpendingBreakdown'

// Helper function to format currency
const formatCurrency = (amount: number | undefined | null) => {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount ?? 0);
};

export default function Dashboard() {
  const { data: accessibleBudgets, isLoading: isLoadingBudgets, error: errorBudgets } = useQuery(getAccessibleBudgets)
  // Fetch dashboard totals for the cards and the chart
  const { data: totals, isLoading: isLoadingTotals, error: errorTotals } = useQuery(
    getDashboardTotals,
    { budgetIds: accessibleBudgets?.map(b => b.id) ?? [] },
    { enabled: !!accessibleBudgets } // Only run when budgets are loaded
  );

  const budgetIds = accessibleBudgets?.map(b => b.id) ?? []

  // Combined loading state
  const isLoading = isLoadingBudgets || isLoadingTotals;

  if (isLoading) {
    return (
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <Skeleton className="h-8 w-1/4" />
        <div className="flex space-x-2 border-b pb-2">
           <Skeleton className="h-10 w-24" />
           <Skeleton className="h-10 w-24" />
        </div>
         <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Skeleton className="h-[118px]" />
            <Skeleton className="h-[118px]" />
            <Skeleton className="h-[118px]" />
         </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
          <Skeleton className="col-span-4 h-[418px]" />
          <Skeleton className="col-span-3 h-[418px]" />
        </div>
      </div>
    )
  }

  if (errorBudgets || errorTotals) {
    return (
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6 text-red-500">
        Error loading dashboard data: {errorBudgets?.message || errorTotals?.message}
      </div>
    )
  }

  if (!accessibleBudgets || accessibleBudgets.length === 0) {
    return (
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="flex items-center justify-between space-y-2">
          <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Welcome!</CardTitle>
            <CardDescription>You don't seem to have any budgets yet.</CardDescription>
          </CardHeader>
          <CardContent>
            <p>Get started by creating your first budget.</p>
            <Button asChild className="mt-4">
              <Link to={routes.BudgetRoute.to}>Go to Budget Setup</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const remaining = (totals?.income ?? 0) - (totals?.expense ?? 0);

  return (
    <>
      {/* ===== Top Heading ===== */}
      <Header>
        <TopNav links={topNav} />
        <div className='ml-auto flex items-center space-x-4'>
          <Search />
          <ThemeSwitch />
          <ProfileDropdown />
        </div>
      </Header>

      {/* ===== Main ===== */}
      <Main>
        <div className='mb-2 flex items-center justify-between space-y-2'>
          <h1 className='text-2xl font-bold tracking-tight'>Dashboard</h1>
        </div>
        <Tabs
          orientation='vertical'
          defaultValue='overview'
          className='space-y-4'
        >
          <div className='w-full overflow-x-auto pb-2'>
            <TabsList>
              <TabsTrigger value='overview'>Overview</TabsTrigger>
            </TabsList>
          </div>
          <TabsContent value='overview' className='space-y-4'>
            <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-3'>
              <Card>
                <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
                  <CardTitle className='text-sm font-medium'>
                    Total Income (This Month)
                  </CardTitle>
                  <svg
                    xmlns='http://www.w3.org/2000/svg'
                    viewBox='0 0 24 24'
                    fill='none'
                    stroke='currentColor'
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth='2'
                    className='h-4 w-4 text-muted-foreground'
                  >
                    <path d='M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6' />
                  </svg>
                </CardHeader>
                <CardContent>
                  <div className='text-2xl font-bold'>{formatCurrency(totals?.income)}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
                  <CardTitle className='text-sm font-medium'>
                    Total Spent (This Month)
                  </CardTitle>
                  <svg
                    xmlns='http://www.w3.org/2000/svg'
                    viewBox='0 0 24 24'
                    fill='none'
                    stroke='currentColor'
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth='2'
                    className='h-4 w-4 text-muted-foreground'
                  >
                    <rect width='20' height='14' x='2' y='5' rx='2' />
                    <line x1='2' x2='22' y1='10' y2='10' />
                  </svg>
                </CardHeader>
                <CardContent>
                  <div className='text-2xl font-bold'>{formatCurrency(totals?.expense)}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
                  <CardTitle className='text-sm font-medium'>Remaining (This Month)</CardTitle>
                  <svg
                    xmlns='http://www.w3.org/2000/svg'
                    viewBox='0 0 24 24'
                    fill='none'
                    stroke='currentColor'
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth='2'
                    className='h-4 w-4 text-muted-foreground'
                  >
                    <path d='M12 2c-3 0-5.5 1.12-5.5 2.5S9 7 12 7s5.5-1.12 5.5-2.5S15 2 12 2Z' />
                    <path d='M12 7v1M7 16c0-4.42 3.58-8 8-8' />
                    <path d='M12 14a1 1 0 1 0 0 2 1 1 0 1 0 0-2Z' />
                    <path d='M12 22v-4M18.5 16.5a3.5 3.5 0 1 0-7 0' />
                  </svg>
                </CardHeader>
                <CardContent>
                  <div className={`text-2xl font-bold ${remaining < 0 ? 'text-red-500' : ''}`}>{formatCurrency(remaining)}</div>
                </CardContent>
              </Card>
            </div>
            <div className='grid grid-cols-1 gap-4 lg:grid-cols-7'>
              <Card className='col-span-1 lg:col-span-4'>
                <CardHeader>
                  <CardTitle>Income vs. Expense</CardTitle>
                </CardHeader>
                <CardContent className='pl-2'>
                  <IncomeExpenseOverview budgetIds={budgetIds} />
                </CardContent>
              </Card>
              <Card className='col-span-1 lg:col-span-3'>
                <CardHeader>
                  <CardTitle>Spending by Envelope</CardTitle>
                </CardHeader>
                <CardContent className='pl-0 md:pl-2'>
                  <EnvelopeSpendingBreakdown budgetIds={budgetIds} />
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </Main>
    </>
  )
}

type TopNavLink = {
  title: string
  href: keyof typeof routes
  isActive: boolean
  disabled: boolean
}

const topNav: TopNavLink[] = [
  {
    title: 'Overview',
    href: 'DashboardRoute',
    isActive: true,
    disabled: false,
  },
  {
    title: 'Budget',
    href: 'BudgetRoute',
    isActive: false,
    disabled: false,
  },
  {
    title: 'Transactions',
    href: 'TransactionsRoute',
    isActive: false,
    disabled: false,
  },
  {
    title: 'Settings',
    href: 'SettingsRoute',
    isActive: false,
    disabled: true,
  },
]
