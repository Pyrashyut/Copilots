// components/BirthdayPicker.tsx
import { Ionicons } from '@expo/vector-icons';
import React, { useMemo, useState } from 'react';
import {
    FlatList,
    Modal,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

// ─── Data ─────────────────────────────────────────────────────────────────────

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: 100 }, (_, i) => (CURRENT_YEAR - i).toString());

export interface BirthdayValue {
  day: string; month: string; year: string; age: number; valid: boolean;
}

interface Props {
  onChange?: (value: BirthdayValue) => void;
  accentColor?: string;
}

// ─── Helper ───────────────────────────────────────────────────────────────────

function getDaysInMonth(month: string | null, year: string | null): number {
  if (!month || !year) return 31;
  // Day 0 of next month = last day of current month
  return new Date(parseInt(year), MONTHS.indexOf(month) + 1, 0).getDate();
}

function calcAge(day: string, month: string, year: string): number {
  const today = new Date();
  const mIdx = MONTHS.indexOf(month);
  let age = today.getFullYear() - parseInt(year);
  const birthdayPassedThisYear =
    today.getMonth() > mIdx ||
    (today.getMonth() === mIdx && today.getDate() >= parseInt(day));
  if (!birthdayPassedThisYear) age--;
  return age;
}

// ─── Dropdown ─────────────────────────────────────────────────────────────────

interface DropdownProps {
  label: string;
  value: string | null;
  options: string[];
  onSelect: (v: string) => void;
  accentColor: string;
  flex?: number;
}

const Dropdown: React.FC<DropdownProps> = ({ label, value, options, onSelect, accentColor, flex = 1 }) => {
  const [open, setOpen] = useState(false);
  return (
    <>
      <TouchableOpacity
        style={[s.trigger, { flex }, !!value && { borderColor: accentColor }]}
        onPress={() => setOpen(true)}
        activeOpacity={0.8}
      >
        <Text style={[s.triggerLabel, !value && s.placeholder]}>{value ?? label}</Text>
        <Ionicons name="chevron-down" size={14} color={value ? accentColor : '#BBB'} />
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <TouchableOpacity style={s.backdrop} activeOpacity={1} onPress={() => setOpen(false)} />
        <View style={s.sheet}>
          <View style={s.sheetHeader}>
            <Text style={s.sheetTitle}>{label}</Text>
            <TouchableOpacity onPress={() => setOpen(false)}>
              <Ionicons name="close" size={20} color="#666" />
            </TouchableOpacity>
          </View>
          <FlatList
            data={options}
            keyExtractor={item => item}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => {
              const selected = item === value;
              return (
                <TouchableOpacity
                  style={[s.option, selected && { backgroundColor: accentColor + '15' }]}
                  onPress={() => { onSelect(item); setOpen(false); }}
                  activeOpacity={0.7}
                >
                  <Text style={[s.optionText, selected && { color: accentColor, fontWeight: '800' }]}>{item}</Text>
                  {selected && <Ionicons name="checkmark" size={16} color={accentColor} />}
                </TouchableOpacity>
              );
            }}
          />
        </View>
      </Modal>
    </>
  );
};

// ─── Main ─────────────────────────────────────────────────────────────────────

export const BirthdayPicker: React.FC<Props> = ({ onChange, accentColor = '#E8755A' }) => {
  const [day, setDay]     = useState<string | null>(null);
  const [month, setMonth] = useState<string | null>(null);
  const [year, setYear]   = useState<string | null>(null);

  // KEY FIX: days list is derived from current month+year state, not computed
  // ad-hoc in a handler. This means the Day dropdown ALWAYS shows the correct
  // number of days for the currently selected month and year.
  const maxDays = useMemo(() => getDaysInMonth(month, year), [month, year]);
  const days = useMemo(
    () => Array.from({ length: maxDays }, (_, i) => (i + 1).toString().padStart(2, '0')),
    [maxDays],
  );

  // Notify parent, clamping day if needed
  const notify = (d: string | null, m: string | null, y: string | null) => {
    if (!d || !m || !y) return;
    // Clamp: if day > days-in-month for this m/y, snap to last valid day
    const max = getDaysInMonth(m, y);
    const safeDay = Math.min(parseInt(d), max).toString().padStart(2, '0');
    const age = calcAge(safeDay, m, y);
    onChange?.({ day: safeDay, month: m, year: y, age, valid: age >= 18 });
  };

  const handleDay = (v: string) => {
    setDay(v);
    notify(v, month, year);
  };

  const handleMonth = (v: string) => {
    // When month changes, clamp the already-chosen day immediately in state
    const max = getDaysInMonth(v, year);
    const clampedDay = day ? (parseInt(day) > max ? max.toString().padStart(2, '0') : day) : null;
    setMonth(v);
    if (clampedDay !== day) setDay(clampedDay); // update day state if clamped
    notify(clampedDay, v, year);
  };

  const handleYear = (v: string) => {
    // Feb 29 → Feb 28 if new year is not a leap year
    const max = getDaysInMonth(month, v);
    const clampedDay = day ? (parseInt(day) > max ? max.toString().padStart(2, '0') : day) : null;
    setYear(v);
    if (clampedDay !== day) setDay(clampedDay);
    notify(clampedDay, month, v);
  };

  const allPicked = day && month && year;
  const age = allPicked ? calcAge(day, month, year) : null;
  const valid = age !== null && age >= 18;

  return (
    <View style={s.root}>
      <View style={s.row}>
        <Dropdown label="Day"   value={day}   options={days}   onSelect={handleDay}   accentColor={accentColor} flex={0.8} />
        <Dropdown label="Month" value={month} options={MONTHS} onSelect={handleMonth} accentColor={accentColor} flex={1.1} />
        <Dropdown label="Year"  value={year}  options={YEARS}  onSelect={handleYear}  accentColor={accentColor} flex={1} />
      </View>

      {allPicked && (
        <View style={[s.chip, { backgroundColor: valid ? accentColor + '18' : '#FFE5E3' }]}>
          <View style={[s.chipDot, { backgroundColor: valid ? accentColor : '#E03724' }]} />
          <Text style={[s.chipText, { color: valid ? accentColor : '#E03724' }]}>
            {valid ? `${age} years old ✓` : `Must be 18+ · you are ${age}`}
          </Text>
        </View>
      )}
    </View>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root: { gap: 10 },
  row:  { flexDirection: 'row', gap: 8 },

  trigger: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#F5F5F5', borderRadius: 14,
    paddingHorizontal: 12, paddingVertical: 14,
    borderWidth: 1.5, borderColor: '#F5F5F5',
  },
  triggerLabel: { fontSize: 15, fontWeight: '700', color: '#161616' },
  placeholder:  { color: '#C0C0C0', fontWeight: '600' },

  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.35)' },
  sheet: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: '#FFF', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    maxHeight: '55%', paddingBottom: 34,
  },
  sheetHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 20, borderBottomWidth: 1, borderColor: '#F0F0F0',
  },
  sheetTitle: { fontSize: 16, fontWeight: '800', color: '#161616' },

  option: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 14,
  },
  optionText: { fontSize: 16, color: '#333', fontWeight: '600' },

  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 7,
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 30, alignSelf: 'flex-start',
  },
  chipDot:  { width: 7, height: 7, borderRadius: 4 },
  chipText: { fontWeight: '700', fontSize: 13 },
});