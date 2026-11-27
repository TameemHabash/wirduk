import { DateTimePickerAndroid } from '@react-native-community/datetimepicker';

import { formatTime, parseTime } from './time';

/**
 * Android's time dialog (12 hours, as the app shows times), set to `time` ("HH:MM").
 * `onPick` gets the time chosen, "HH:MM" (24 hours, as the settings store it).
 */
export function openTimePicker(time: string, onPick: (time: string) => void): void {
  const { hour, minute } = parseTime(time);
  const value = new Date();
  value.setHours(hour, minute, 0, 0);
  DateTimePickerAndroid.open({
    mode: 'time',
    value,
    is24Hour: false,
    onValueChange: (_event, date) => onPick(formatTime(date.getHours(), date.getMinutes())),
  });
}
