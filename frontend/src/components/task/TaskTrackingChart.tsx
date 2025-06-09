import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { getTaskTrackingSummary, type TaskTrackingSummary } from '../../api/task';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Label } from '../ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { useAuth } from '../../context/AuthContext';
import { DateTime } from 'luxon';

interface TaskTrackingChartProps {
  workspaceId?: string;
  goalId?: string;
}

const TaskTrackingChart: React.FC<TaskTrackingChartProps> = ({ workspaceId, goalId }) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [summaryData, setSummaryData] = useState<TaskTrackingSummary[]>([]);
  const [period, setPeriod] = useState<'day' | 'month' | 'year'>('day');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSummary = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getTaskTrackingSummary(period, workspaceId, goalId);
      setSummaryData(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary();
  }, [period, workspaceId, goalId]); // Add workspaceId and goalId to dependencies

  const formatYAxisTick = (value: number) => {
    const hours = Math.floor(value / 3600);
    const minutes = Math.floor((value % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  const formatTooltipLabel = (label: string) => {
    if (!user?.timezone) return label; // Fallback if timezone is not set

    // Use fromSQL to parse the PostgreSQL timestamp string
    const dt = DateTime.fromSQL(label, { zone: user.timezone });

    if (!dt.isValid) {
      console.error("Invalid DateTime object:", dt.invalidExplanation);
      return "Invalid DateTime"; // Return a fallback string for invalid dates
    }

    switch (period) {
      case 'day':
        return dt.toLocaleString(DateTime.DATE_FULL);
      case 'month':
        return dt.toLocaleString({ month: 'long', year: 'numeric' });
      case 'year':
        return dt.toLocaleString({ year: 'numeric' });
      default:
        return label;
    }
  };

  const formatTooltipValue = (value: number, name: string) => {
    const hours = Math.floor(value / 3600);
    const minutes = Math.floor((value % 3600) / 60);
    const seconds = value % 60;
    return [`${hours}h ${minutes}m ${seconds}s`, name];
  };

  if (loading) {
    return <Card><CardContent>{t('tasks.loadingSummary')}</CardContent></Card>;
  }

  if (error) {
    return <Card><CardContent className="text-red-500">{t('workspace.error')}: {error}</CardContent></Card>;
  }

  return (
    <Card className="p-4">
      <CardHeader>
        <CardTitle>{t('tasks.trackingSummary')}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="mb-4">
          <Label htmlFor="period-select">{t('tasks.selectPeriod')}</Label>
          <Select value={period} onValueChange={(value: 'day' | 'month' | 'year') => setPeriod(value)}>
            <SelectTrigger id="period-select" className="w-[180px]">
              <SelectValue placeholder={t('tasks.selectPeriod')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="day">{t('tasks.period.day')}</SelectItem>
              <SelectItem value="month">{t('tasks.period.month')}</SelectItem>
              <SelectItem value="year">{t('tasks.period.year')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {summaryData.length === 0 ? (
          <p>{t('tasks.noTrackingData')}</p>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={summaryData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="period" tickFormatter={formatTooltipLabel} />
              <YAxis tickFormatter={formatYAxisTick} label={{ value: t('tasks.totalTime'), angle: -90, position: 'insideLeft' }} />
              <Tooltip formatter={formatTooltipValue} labelFormatter={formatTooltipLabel} />
              <Legend />
              <Bar dataKey="totalDurationSeconds" name={t('tasks.timeSpent')} fill="#8884d8" />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
};

export default TaskTrackingChart;
