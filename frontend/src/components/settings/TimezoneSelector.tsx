import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { DateTime } from 'luxon';
import timezonesData, { type TimeZone } from 'timezones-list';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Label } from '../ui/label';
import { Button } from '../ui/button';
import { updateTimezone } from '../../api/user';
import { useAuth } from '../../context/AuthContext'; // Assuming an AuthContext for user data and token

interface TimezoneOption {
  value: string;
  label: string;
}

const TimezoneSelector: React.FC = () => {
  const { t } = useTranslation();
  const { user, token, setUser } = useAuth(); // Assuming useAuth provides user and token
  const [selectedTimezone, setSelectedTimezone] = useState<string>(user?.timezone || '');
  const [timezones, setTimezones] = useState<TimezoneOption[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [isError, setIsError] = useState<boolean>(false);

  useEffect(() => {
    // Generate a list of common timezones from the imported data
    const allTimezones = timezonesData.map((tz: TimeZone) => ({
      value: tz.tzCode, // Assuming 'tzCode' is the timezone identifier
      label: tz.label, // Assuming 'label' is the display name
    }));
    setTimezones(allTimezones.sort((a: TimezoneOption, b: TimezoneOption) => a.label.localeCompare(b.label)));

    if (user?.timezone) {
      setSelectedTimezone(user.timezone);
    } else {
      // If user has no timezone set, try to default to system timezone
      setSelectedTimezone(DateTime.local().zoneName);
    }
  }, [user?.timezone]);

  const handleSaveTimezone = async () => {
    if (!token) {
      setMessage(t('timezone.error.notAuthenticated'));
      setIsError(true);
      return;
    }
    try {
      const response = await updateTimezone(selectedTimezone, token);
      setMessage(t('timezone.success.updated'));
      setIsError(false);
      // Update user context with new timezone
      if (setUser) {
        setUser(response.user); // Use the full user object from the API response
      }
    } catch (error: any) {
      setMessage(error.message || t('timezone.error.failedToUpdate'));
      setIsError(true);
    }
  };

  return (
    <div className="space-y-4">
      <Label htmlFor="timezone-select">{t('timezone.label')}</Label>
      <Select value={selectedTimezone} onValueChange={setSelectedTimezone}>
        <SelectTrigger id="timezone-select" className="w-full">
          <SelectValue placeholder={t('timezone.selectPlaceholder')} />
        </SelectTrigger>
        <SelectContent>
          {timezones.map((tz) => (
            <SelectItem key={tz.value} value={tz.value}>
              {tz.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button onClick={handleSaveTimezone}>{t('timezone.saveButton')}</Button>
      {message && (
        <p className={`text-sm ${isError ? 'text-red-500' : 'text-green-500'}`}>
          {message}
        </p>
      )}
    </div>
  );
};

export default TimezoneSelector;
