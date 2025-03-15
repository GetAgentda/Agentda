'use client';

import { useState, useMemo } from 'react';
import { format, startOfWeek, addDays, startOfMonth, endOfMonth, endOfWeek, isSameMonth, isSameDay, addMonths, subMonths, parseISO } from 'date-fns';
import { Meeting } from '@/types';
import Link from 'next/link';
import AIAssistant from './AIAssistant';

type CalendarView = 'month' | 'week' | 'day';

interface CalendarProps {
  meetings: Meeting[];
  onDateSelect?: (date: Date) => void;
}

export default function Calendar({ meetings, onDateSelect }: CalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<CalendarView>('month');
  const [refreshKey, setRefreshKey] = useState(0);

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);

  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const handlePrevious = () => {
    setCurrentDate(subMonths(currentDate, 1));
  };

  const handleNext = () => {
    setCurrentDate(addMonths(currentDate, 1));
  };

  const rows = useMemo(() => {
    const rows = [];
    let days = [];
    let day = startDate;

    while (day <= endDate) {
      for (let i = 0; i < 7; i++) {
        const cloneDay = day;
        const dayMeetings = meetings.filter(meeting => 
          isSameDay(parseISO(meeting.date.toDate().toISOString()), cloneDay)
        );

        days.push({
          date: cloneDay,
          isCurrentMonth: isSameMonth(day, monthStart),
          meetings: dayMeetings,
        });
        day = addDays(day, 1);
      }
      rows.push(days);
      days = [];
    }
    return rows;
  }, [currentDate, meetings, startDate, endDate, monthStart]);

  const handleAIAction = (action: 'refresh' | 'select-date', payload?: any) => {
    if (action === 'refresh') {
      setRefreshKey(prev => prev + 1);
    } else if (action === 'select-date' && payload) {
      onDateSelect?.(payload);
    }
  };

  const renderMonthView = () => (
    <div className="grid grid-cols-7 gap-px bg-gray-200">
      {weekDays.map(day => (
        <div key={day} className="bg-white p-2 text-center text-sm font-medium">
          {day}
        </div>
      ))}
      {rows.map((row, rowIndex) => (
        row.map((day, dayIndex) => (
          <div
            key={day.date.toString()}
            className={`min-h-[100px] bg-white p-2 ${
              !day.isCurrentMonth ? 'text-gray-400' : ''
            } ${
              isSameDay(day.date, new Date()) ? 'bg-blue-50' : ''
            }`}
            onClick={() => onDateSelect?.(day.date)}
          >
            <div className="font-medium mb-1">{format(day.date, 'd')}</div>
            <div className="space-y-1">
              {day.meetings.map(meeting => (
                <Link
                  key={meeting.id}
                  href={`/meetings/${meeting.id}`}
                  className="block text-xs p-1 rounded bg-blue-100 truncate"
                >
                  {meeting.title}
                  <span className={`ml-1 inline-block w-2 h-2 rounded-full ${
                    meeting.hasAgenda ? 'bg-green-500' : 'bg-yellow-500'
                  }`} />
                </Link>
              ))}
            </div>
          </div>
        ))
      ))}
    </div>
  );

  const renderWeekView = () => {
    const weekStart = startOfWeek(currentDate);
    const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

    return (
      <div className="grid grid-cols-7 gap-px bg-gray-200">
        {weekDays.map(day => (
          <div key={day} className="bg-white p-2 text-center text-sm font-medium">
            {day}
          </div>
        ))}
        {days.map(day => {
          const dayMeetings = meetings.filter(meeting =>
            isSameDay(parseISO(meeting.date.toDate().toISOString()), day)
          );

          return (
            <div
              key={day.toString()}
              className={`min-h-[400px] bg-white p-2 ${
                isSameDay(day, new Date()) ? 'bg-blue-50' : ''
              }`}
              onClick={() => onDateSelect?.(day)}
            >
              <div className="font-medium mb-2">{format(day, 'MMM d')}</div>
              <div className="space-y-2">
                {dayMeetings.map(meeting => (
                  <Link
                    key={meeting.id}
                    href={`/meetings/${meeting.id}`}
                    className="block p-2 rounded bg-blue-100"
                  >
                    <div className="font-medium">{meeting.title}</div>
                    <div className="text-sm text-gray-600">
                      {format(parseISO(meeting.date.toDate().toISOString()), 'h:mm a')}
                    </div>
                    <span className={`inline-block w-2 h-2 rounded-full ${
                      meeting.hasAgenda ? 'bg-green-500' : 'bg-yellow-500'
                    }`} />
                  </Link>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderDayView = () => {
    const dayMeetings = meetings.filter(meeting =>
      isSameDay(parseISO(meeting.date.toDate().toISOString()), currentDate)
    );

    const hours = Array.from({ length: 24 }, (_, i) => i);

    return (
      <div className="bg-white">
        <div className="text-xl font-medium mb-4">
          {format(currentDate, 'MMMM d, yyyy')}
        </div>
        <div className="space-y-4">
          {hours.map(hour => {
            const hourMeetings = dayMeetings.filter(
              meeting => parseISO(meeting.date.toDate().toISOString()).getHours() === hour
            );

            return (
              <div key={hour} className="grid grid-cols-[100px_1fr] gap-4">
                <div className="text-right text-gray-500">
                  {format(new Date().setHours(hour), 'h:mm a')}
                </div>
                <div className="border-l pl-4 min-h-[48px]">
                  {hourMeetings.map(meeting => (
                    <Link
                      key={meeting.id}
                      href={`/meetings/${meeting.id}`}
                      className="block p-2 rounded bg-blue-100 mb-2"
                    >
                      <div className="font-medium">{meeting.title}</div>
                      <div className="text-sm text-gray-600">
                        {format(parseISO(meeting.date.toDate().toISOString()), 'h:mm a')} - {meeting.duration} min
                      </div>
                      <span className={`inline-block w-2 h-2 rounded-full ${
                        meeting.hasAgenda ? 'bg-green-500' : 'bg-yellow-500'
                      }`} />
                    </Link>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <AIAssistant meetings={meetings} onAction={handleAIAction} />
      
      <div className="flex justify-between items-center mb-4 mt-6">
        <div className="flex space-x-4">
          <button
            onClick={() => setView('month')}
            className={`px-3 py-1 rounded ${
              view === 'month' ? 'bg-blue-500 text-white' : 'hover:bg-gray-100'
            }`}
          >
            Month
          </button>
          <button
            onClick={() => setView('week')}
            className={`px-3 py-1 rounded ${
              view === 'week' ? 'bg-blue-500 text-white' : 'hover:bg-gray-100'
            }`}
          >
            Week
          </button>
          <button
            onClick={() => setView('day')}
            className={`px-3 py-1 rounded ${
              view === 'day' ? 'bg-blue-500 text-white' : 'hover:bg-gray-100'
            }`}
          >
            Day
          </button>
        </div>
        <div className="flex items-center space-x-4">
          <button
            onClick={handlePrevious}
            className="p-1 hover:bg-gray-100 rounded"
          >
            ←
          </button>
          <h2 className="text-xl font-semibold">
            {format(currentDate, 'MMMM yyyy')}
          </h2>
          <button
            onClick={handleNext}
            className="p-1 hover:bg-gray-100 rounded"
          >
            →
          </button>
        </div>
      </div>

      {view === 'month' && renderMonthView()}
      {view === 'week' && renderWeekView()}
      {view === 'day' && renderDayView()}
    </div>
  );
} 