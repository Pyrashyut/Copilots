// components/LocationPicker.tsx
import { Ionicons } from '@expo/vector-icons';
import React, { useRef, useState } from 'react';
import {
    Keyboard,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import Modal from 'react-native-modal';

export type LocationMode = 'fixed' | 'remote_country' | 'remote_anywhere';

export interface LocationValue {
  mode: LocationMode;
  city?: string;
  country?: string;
  display: string;
}

interface Props {
  value?: LocationValue | null;
  onChange: (value: LocationValue) => void;
  accentColor?: string;
}

const MODES = [
  {
    id: 'fixed' as LocationMode,
    icon: 'location' as const,
    iconColor: '#E8755A',
    title: 'Fixed Location',
    desc: "You're based in one city. Match with people nearby.",
  },
  {
    id: 'remote_country' as LocationMode,
    icon: 'flag' as const,
    iconColor: '#D4AF37',
    title: 'Remote (Country)',
    desc: 'You move between cities but stay in one country. Match nationally.',
  },
  {
    id: 'remote_anywhere' as LocationMode,
    icon: 'earth' as const,
    iconColor: '#2A9D8F',
    title: 'Remote (Anywhere)',
    desc: 'Location-independent. Match globally with anyone open to travel.',
  },
];

const COUNTRIES = [
  'Afghanistan','Albania','Algeria','Argentina','Australia','Austria','Azerbaijan',
  'Bahrain','Bangladesh','Belarus','Belgium','Bolivia','Bosnia and Herzegovina',
  'Brazil','Bulgaria','Cambodia','Canada','Chile','China','Colombia','Costa Rica',
  'Croatia','Cyprus','Czech Republic','Denmark','Ecuador','Egypt','Estonia',
  'Ethiopia','Finland','France','Georgia','Germany','Ghana','Greece','Guatemala',
  'Honduras','Hungary','Iceland','India','Indonesia','Iran','Iraq','Ireland',
  'Israel','Italy','Jamaica','Japan','Jordan','Kazakhstan','Kenya','Kosovo',
  'Kuwait','Latvia','Lebanon','Libya','Lithuania','Luxembourg','Malaysia',
  'Malta','Mexico','Moldova','Morocco','Netherlands','New Zealand','Nigeria',
  'North Macedonia','Norway','Oman','Pakistan','Panama','Paraguay','Peru',
  'Philippines','Poland','Portugal','Qatar','Romania','Russia','Saudi Arabia',
  'Senegal','Serbia','Singapore','Slovakia','Slovenia','South Africa',
  'South Korea','Spain','Sri Lanka','Sweden','Switzerland','Syria','Taiwan',
  'Thailand','Tunisia','Turkey','UAE','Uganda','Ukraine','United Kingdom',
  'United States','Uruguay','Uzbekistan','Venezuela','Vietnam','Yemen','Zimbabwe',
];

export const LocationPicker: React.FC<Props> = ({ value, onChange, accentColor = '#E8755A' }) => {
  const [showMain, setShowMain] = useState(false);
  const [showCountry, setShowCountry] = useState(false);

  const [selectedMode, setSelectedMode] = useState<LocationMode>(value?.mode || 'fixed');
  const [city, setCity] = useState(value?.city || '');
  const [country, setCountry] = useState(value?.country || '');
  const [search, setSearch] = useState('');

  const cityRef = useRef<TextInput>(null);

  const filtered = COUNTRIES.filter(c =>
    c.toLowerCase().includes(search.toLowerCase())
  );

  const buildDisplay = (mode: LocationMode, c?: string, co?: string) => {
    if (mode === 'remote_anywhere') return 'Remote (Anywhere)';
    if (mode === 'remote_country') return co ? `Remote · ${co}` : 'Remote (Country)';
    if (c && co) return `${c}, ${co}`;
    return co || 'Fixed Location';
  };

  const canConfirm = () => {
    if (selectedMode === 'remote_anywhere') return true;
    if (selectedMode === 'remote_country') return !!country;
    return !!(city.trim() && country);
  };

  const handleConfirm = () => {
    if (!canConfirm()) return;
    onChange({
      mode: selectedMode,
      city: city.trim() || undefined,
      country: country || undefined,
      display: buildDisplay(selectedMode, city.trim(), country),
    });
    setShowMain(false);
  };

  const openCountry = () => {
    Keyboard.dismiss();
    // Small delay so keyboard fully dismisses before opening country sheet
    setTimeout(() => setShowCountry(true), 150);
  };

  const selectCountry = (c: string) => {
    setCountry(c);
    setSearch('');
    setShowCountry(false);
  };

  const hasValue = !!value;

  return (
    <>
      {/* ── Trigger ── */}
      <TouchableOpacity
        style={[styles.trigger, hasValue && { borderColor: accentColor + '80' }]}
        onPress={() => setShowMain(true)}
        activeOpacity={0.8}
      >
        <View style={styles.triggerLeft}>
          <Ionicons
            name={hasValue ? (MODES.find(m => m.id === value?.mode)?.icon ?? 'location-outline') : 'location-outline'}
            size={18}
            color={hasValue ? accentColor : '#BBB'}
          />
          <Text style={[styles.triggerLabel, !hasValue && styles.placeholder]}>
            {value?.display || 'Set your location'}
          </Text>
        </View>
        <Ionicons name="chevron-down" size={14} color={hasValue ? accentColor : '#BBB'} />
      </TouchableOpacity>

      {/* ── Main Sheet ── */}
      <Modal
        isVisible={showMain}
        onBackdropPress={() => { Keyboard.dismiss(); setShowMain(false); }}
        onBackButtonPress={() => { Keyboard.dismiss(); setShowMain(false); }}
        style={styles.modal}
        avoidKeyboard            // ← react-native-modal built-in keyboard avoidance
        propagateSwipe
        useNativeDriverForBackdrop
      >
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <Text style={styles.sheetTitle}>Location Settings</Text>
          <Text style={styles.sheetSub}>How would you like to be matched?</Text>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.sheetScroll}
            keyboardShouldPersistTaps="handled"
          >
            {/* Mode cards */}
            {MODES.map(mode => {
              const active = selectedMode === mode.id;
              return (
                <TouchableOpacity
                  key={mode.id}
                  style={[styles.modeCard, active && { borderColor: accentColor, backgroundColor: accentColor + '08' }]}
                  onPress={() => setSelectedMode(mode.id)}
                  activeOpacity={0.8}
                >
                  <View style={[styles.modeIcon, { backgroundColor: mode.iconColor + '18' }]}>
                    <Ionicons name={mode.icon} size={22} color={mode.iconColor} />
                  </View>
                  <View style={styles.modeText}>
                    <Text style={[styles.modeTitle, active && { color: accentColor }]}>{mode.title}</Text>
                    <Text style={styles.modeDesc}>{mode.desc}</Text>
                  </View>
                  <View style={[styles.radio, active && { borderColor: accentColor }]}>
                    {active && <View style={[styles.radioDot, { backgroundColor: accentColor }]} />}
                  </View>
                </TouchableOpacity>
              );
            })}

            {/* Country selector */}
            {(selectedMode === 'fixed' || selectedMode === 'remote_country') && (
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Country</Text>
                {/* Use TouchableOpacity NOT inside another touchable — important */}
                <TouchableOpacity
                  style={[styles.selector, country && { borderColor: accentColor + '60' }]}
                  onPress={openCountry}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.selectorText, !country && styles.placeholder]}>
                    {country || 'Tap to select country'}
                  </Text>
                  <Ionicons name="chevron-forward" size={16} color={country ? accentColor : '#BBB'} />
                </TouchableOpacity>
              </View>
            )}

            {/* City input — only for Fixed */}
            {selectedMode === 'fixed' && (
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>City</Text>
                <TextInput
                  ref={cityRef}
                  style={[styles.textInput, city && { borderColor: accentColor + '60' }]}
                  placeholder="e.g. London"
                  placeholderTextColor="#BBB"
                  value={city}
                  onChangeText={setCity}
                  returnKeyType="done"
                  onSubmitEditing={() => Keyboard.dismiss()}
                />
              </View>
            )}

            {/* Remote Anywhere info */}
            {selectedMode === 'remote_anywhere' && (
              <View style={styles.infoBanner}>
                <Ionicons name="information-circle-outline" size={16} color="#2A9D8F" />
                <Text style={styles.infoText}>
                  You'll appear to all users globally — perfect for full-time nomads.
                </Text>
              </View>
            )}
          </ScrollView>

          <TouchableOpacity
            style={[styles.confirmBtn, { backgroundColor: canConfirm() ? '#161616' : '#CCC' }]}
            onPress={handleConfirm}
            disabled={!canConfirm()}
            activeOpacity={0.85}
          >
            <Text style={styles.confirmText}>Confirm Location</Text>
          </TouchableOpacity>
        </View>
      </Modal>

      {/* ── Country Picker Sheet ── */}
      <Modal
        isVisible={showCountry}
        onBackdropPress={() => { setSearch(''); setShowCountry(false); }}
        onBackButtonPress={() => { setSearch(''); setShowCountry(false); }}
        style={styles.modal}
        avoidKeyboard
        propagateSwipe
        useNativeDriverForBackdrop
      >
        <View style={[styles.sheet, { maxHeight: '75%' }]}>
          <View style={styles.handle} />
          <Text style={styles.sheetTitle}>Select Country</Text>

          {/* Search box — always visible above the list */}
          <View style={styles.searchBox}>
            <Ionicons name="search" size={16} color="#BBB" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search countries..."
              placeholderTextColor="#BBB"
              value={search}
              onChangeText={setSearch}
              autoFocus
              returnKeyType="search"
              clearButtonMode="while-editing"
            />
          </View>

          <ScrollView
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {filtered.length === 0 && (
              <Text style={styles.noResults}>No countries found</Text>
            )}
            {filtered.map(c => (
              <TouchableOpacity
                key={c}
                style={[styles.countryRow, c === country && { backgroundColor: accentColor + '12' }]}
                onPress={() => selectCountry(c)}
                activeOpacity={0.7}
              >
                <Text style={[styles.countryText, c === country && { color: accentColor, fontWeight: '700' }]}>
                  {c}
                </Text>
                {c === country && <Ionicons name="checkmark-circle" size={18} color={accentColor} />}
              </TouchableOpacity>
            ))}
            <View style={{ height: 30 }} />
          </ScrollView>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  trigger: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#F5F5F5', borderRadius: 14,
    paddingHorizontal: 16, paddingVertical: 16,
    borderWidth: 1.5, borderColor: '#F5F5F5',
  },
  triggerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  triggerLabel: { fontSize: 15, fontWeight: '600', color: '#161616', flex: 1 },
  placeholder: { color: '#BBB', fontWeight: '400' },

  modal: { justifyContent: 'flex-end', margin: 0 },

  sheet: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    paddingHorizontal: 24, paddingBottom: 44,
    maxHeight: '92%',
  },
  handle: {
    width: 40, height: 4, backgroundColor: '#E0E0E0',
    borderRadius: 2, alignSelf: 'center', marginTop: 14, marginBottom: 22,
  },
  sheetTitle: { fontSize: 21, fontWeight: '800', color: '#161616', marginBottom: 6 },
  sheetSub: { fontSize: 14, color: '#AAA', marginBottom: 22 },
  sheetScroll: { gap: 12, paddingBottom: 16 },

  modeCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    padding: 16, backgroundColor: '#F9F9F9',
    borderRadius: 16, borderWidth: 1.5, borderColor: 'transparent',
  },
  modeIcon: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  modeText: { flex: 1 },
  modeTitle: { fontSize: 15, fontWeight: '700', color: '#161616', marginBottom: 3 },
  modeDesc: { fontSize: 12, color: '#AAA', lineHeight: 17 },
  radio: {
    width: 20, height: 20, borderRadius: 10,
    borderWidth: 2, borderColor: '#DDD',
    justifyContent: 'center', alignItems: 'center',
  },
  radioDot: { width: 10, height: 10, borderRadius: 5 },

  fieldGroup: { gap: 8, marginTop: 4 },
  fieldLabel: {
    fontSize: 11, fontWeight: '700', color: '#AAA',
    textTransform: 'uppercase', letterSpacing: 0.8,
  },
  selector: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#F5F5F5', borderRadius: 14,
    paddingHorizontal: 16, paddingVertical: 16,
    borderWidth: 1.5, borderColor: '#F5F5F5',
  },
  selectorText: { fontSize: 15, fontWeight: '600', color: '#161616' },
  textInput: {
    backgroundColor: '#F5F5F5', borderRadius: 14,
    paddingHorizontal: 16, paddingVertical: 16,
    fontSize: 15, color: '#161616',
    borderWidth: 1.5, borderColor: '#F5F5F5',
  },

  infoBanner: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    backgroundColor: 'rgba(42,157,143,0.08)', padding: 14, borderRadius: 12,
  },
  infoText: { flex: 1, fontSize: 13, color: '#2A9D8F', lineHeight: 18, fontWeight: '500' },

  confirmBtn: {
    paddingVertical: 18, borderRadius: 28,
    alignItems: 'center', marginTop: 18,
  },
  confirmText: { color: '#FFF', fontWeight: '700', fontSize: 16 },

  // Country picker
  searchBox: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#F5F5F5', borderRadius: 14,
    paddingHorizontal: 14, paddingVertical: 13, marginBottom: 10,
  },
  searchInput: { flex: 1, fontSize: 15, color: '#161616' },
  noResults: { textAlign: 'center', color: '#CCC', marginTop: 30, fontSize: 15 },
  countryRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 15, paddingHorizontal: 4,
    borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.04)',
  },
  countryText: { fontSize: 15, color: '#333', fontWeight: '500' },
});