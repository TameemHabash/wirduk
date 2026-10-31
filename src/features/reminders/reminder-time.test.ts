import { displayTime, formatTime, parseTime } from './reminder-time';

describe('reminder times', () => {
  it('reads and writes "HH:MM"', () => {
    expect(parseTime('06:30')).toEqual({ hour: 6, minute: 30 });
    expect(parseTime('23:59')).toEqual({ hour: 23, minute: 59 });
    expect(formatTime(6, 5)).toBe('06:05');
    expect(formatTime(17, 0)).toBe('17:00');
  });

  it('refuses a bad time', () => {
    for (const bad of ['6:30', '24:00', '12:60', '', 'ab:cd']) {
      expect(() => parseTime(bad)).toThrow();
    }
  });

  it('shows 12 hours with ص / م', () => {
    expect(displayTime('06:05', 'ص', 'م')).toBe('6:05 ص');
    expect(displayTime('00:00', 'ص', 'م')).toBe('12:00 ص');
    expect(displayTime('12:00', 'ص', 'م')).toBe('12:00 م');
    expect(displayTime('17:30', 'ص', 'م')).toBe('5:30 م');
  });
});
