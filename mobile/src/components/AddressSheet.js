// Fenêtre « Nouvelle adresse » / « Modifier l'adresse » : type (Maison, Bureau, Autre), adresse,
// position GPS du téléphone (le livreur reçoit l'itinéraire exact), adresse principale.
import { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { GradientButton } from './ui';
import { ADDRESS_LABELS, locateMe, saveAddress } from '../lib/profile';
import { buzzLight, buzzSuccess } from '../lib/feedback';
import { COLORS, RADIUS, sheet } from '../theme';

function AddressForm({ initial, onClose, onSaved }) {
  const [label, setLabel] = useState(initial?.label || 'Maison');
  const [address, setAddress] = useState(initial?.address || '');
  const [gps, setGps] = useState(initial?.gps || null);
  const [isDefault, setIsDefault] = useState(Boolean(initial?.isDefault));
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState('');

  const locate = async () => {
    buzzLight();
    setError('');
    setLocating(true);
    try {
      const found = await locateMe();
      setGps(found.gps);
      if (found.text && !address.trim()) setAddress(found.text);
    } catch (e) {
      setError(e?.message || 'Position introuvable. Vérifiez que la localisation est activée.');
    } finally {
      setLocating(false);
    }
  };

  const save = () => {
    if (address.trim().length < 2) { setError('Indiquez le quartier, la rue ou un point de repère.'); return; }
    const saved = saveAddress({ id: initial?.id, label, address, gps, isDefault });
    buzzSuccess();
    onSaved?.(saved);
    onClose();
  };

  return (
    <>
      <Text style={styles.kicker}>{initial?.id ? 'MODIFIER L’ADRESSE' : 'NOUVELLE ADRESSE'}</Text>
      <Text style={styles.title}>Où vous livrer ?</Text>

      <View style={styles.labels}>
        {ADDRESS_LABELS.map(([name, icon]) => {
          const on = label === name;
          return (
            <Pressable key={name} onPress={() => setLabel(name)} style={[styles.labelChip, on && styles.labelChipOn]} accessibilityState={{ selected: on }}>
              <Ionicons name={icon} size={15} color={on ? COLORS.ctaInk : COLORS.muted} />
              <Text style={[styles.labelText, on && styles.labelTextOn]}>{name}</Text>
            </Pressable>
          );
        })}
      </View>

      <Text style={styles.fieldLabel}>Adresse</Text>
      <TextInput
        value={address}
        onChangeText={setAddress}
        placeholder="Quartier, rue, point de repère…"
        placeholderTextColor={COLORS.faint}
        style={[styles.input, styles.inputMulti]}
        multiline
        keyboardAppearance="dark"
        maxLength={300}
      />

      <Pressable onPress={locate} disabled={locating} style={[styles.locate, gps && styles.locateOn]} accessibilityLabel="Utiliser ma position">
        {locating ? <ActivityIndicator size="small" color={COLORS.goldInk} /> : <Ionicons name={gps ? 'checkmark-circle' : 'navigate'} size={18} color={gps ? COLORS.green : COLORS.goldInk} />}
        <View style={{ flex: 1 }}>
          <Text style={styles.locateTitle}>{gps ? 'Position GPS enregistrée' : 'Utiliser ma position'}</Text>
          <Text style={styles.locateText}>{gps ? 'Le livreur aura l’itinéraire exact jusqu’à vous.' : 'Pour que le livreur trouve l’adresse sans appeler.'}</Text>
        </View>
        {gps ? <Pressable onPress={() => setGps(null)} hitSlop={8}><Text style={styles.remove}>Retirer</Text></Pressable> : null}
      </Pressable>

      <Pressable onPress={() => setIsDefault(!isDefault)} style={styles.defaultRow} accessibilityRole="checkbox" accessibilityState={{ checked: isDefault }}>
        <Ionicons name={isDefault ? 'checkbox' : 'square-outline'} size={20} color={isDefault ? COLORS.gold : COLORS.faint} />
        <Text style={styles.defaultText}>Adresse principale (proposée en premier à la commande)</Text>
      </Pressable>

      {error ? <Text style={styles.error}>{error}</Text> : null}
      <GradientButton title="Enregistrer l’adresse" icon="checkmark" onPress={save} style={{ marginTop: 14 }} />
    </>
  );
}

// initial : adresse à modifier (ou null pour une nouvelle). visible : fenêtre ouverte.
export default function AddressSheet({ visible, initial, onClose, onSaved }) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Fermer" />
        <View style={[styles.sheet, { paddingBottom: insets.bottom + 18 }]}>
          <View style={styles.handle} />
          <Pressable onPress={onClose} style={styles.close} hitSlop={8} accessibilityLabel="Fermer"><Ionicons name="close" size={20} color={COLORS.muted} /></Pressable>
          {visible ? <AddressForm key={initial?.id || 'nouvelle'} initial={initial} onClose={onClose} onSaved={onSaved} /> : null}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = sheet({
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(4,3,16,0.65)' },
  sheet: {
    backgroundColor: COLORS.card, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 20, paddingTop: 10,
    borderWidth: 1, borderBottomWidth: 0, borderColor: 'rgba(255,255,255,0.1)',
  },
  handle: { alignSelf: 'center', width: 44, height: 5, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.18)', marginBottom: 14 },
  close: { position: 'absolute', right: 14, top: 14, width: 34, height: 34, borderRadius: 17, backgroundColor: COLORS.raised, alignItems: 'center', justifyContent: 'center' },
  kicker: { color: COLORS.goldInk, fontSize: 11, fontWeight: '800', letterSpacing: 1.4 },
  title: { color: COLORS.ink, fontSize: 21, fontWeight: '800', marginTop: 4, letterSpacing: -0.4 },
  labels: { flexDirection: 'row', gap: 8, marginTop: 16 },
  labelChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 999, backgroundColor: COLORS.raised, borderWidth: 1, borderColor: COLORS.line },
  labelChipOn: { backgroundColor: COLORS.cta, borderColor: COLORS.cta },
  labelText: { color: COLORS.muted, fontSize: 13.5, fontWeight: '700' },
  labelTextOn: { color: COLORS.ctaInk, fontWeight: '800' },
  fieldLabel: { color: COLORS.muted, fontSize: 13, fontWeight: '700', marginTop: 16, marginBottom: 6 },
  input: { backgroundColor: COLORS.bg, borderWidth: 1, borderColor: COLORS.line, borderRadius: RADIUS.sm + 2, paddingHorizontal: 12, paddingVertical: 11, color: COLORS.ink, fontSize: 15 },
  inputMulti: { minHeight: 76, textAlignVertical: 'top' },
  locate: {
    flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 12, padding: 12, borderRadius: RADIUS.md,
    backgroundColor: COLORS.goldSoft, borderWidth: 1, borderColor: 'rgba(246,199,104,0.3)',
  },
  locateOn: { backgroundColor: COLORS.greenSoft, borderColor: 'rgba(52,211,153,0.35)' },
  locateTitle: { color: COLORS.ink, fontSize: 14, fontWeight: '800' },
  locateText: { color: COLORS.muted, fontSize: 12, marginTop: 2 },
  remove: { color: COLORS.danger, fontSize: 13, fontWeight: '800' },
  defaultRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 14 },
  defaultText: { flex: 1, color: COLORS.ink, fontSize: 13.5 },
  error: { color: COLORS.danger, fontSize: 13, fontWeight: '700', marginTop: 12 },
});
