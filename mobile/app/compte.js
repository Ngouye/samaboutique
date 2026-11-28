// Mon espace : avatar et étiquettes, chiffres avec jauge (commandes, avis), informations modifiables
// (nom, téléphone, adresse principale), adresses de livraison, raccourcis.
// Tout reste sur ce téléphone : aucun compte à créer.
import { useCallback, useState } from 'react';
import { Alert, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@expo/vector-icons/Ionicons';
import AddressSheet from '../src/components/AddressSheet';
import { Editorial, Glow, PressScale } from '../src/components/ui';
import { addressIcon, defaultAddress, getProfile, listAddresses, removeAddress, saveProfile, setDefaultAddress } from '../src/lib/profile';
import { listOrders } from '../src/lib/myOrders';
import { reviewsCount } from '../src/lib/reviews';
import { clearRecent, listRecent } from '../src/lib/recent';
import { useFavorites } from '../src/lib/favorites';
import { store } from '../src/lib/storage';
import { initials } from '../src/lib/format';
import { buzzLight, buzzSuccess } from '../src/lib/feedback';
import { COLORS, GRADIENTS, RADIUS, SHADOW, sheet } from '../src/theme';

const SIDE = 16;

// Jauge en graduations (comme une règle), avec un repère à la position « ratio » (0 à 1).
function Meter({ ratio, light = false }) {
  const marks = 26;
  const at = Math.round(Math.max(0, Math.min(1, ratio)) * (marks - 1));
  return (
    <View style={styles.meter}>
      {Array.from({ length: marks }, (_, i) => (
        <View
          key={i}
          style={[
            styles.mark,
            { height: i % 5 === 0 ? 16 : 10, backgroundColor: light ? 'rgba(26,16,51,0.35)' : 'rgba(255,255,255,0.28)' },
            i === at && { height: 22, width: 3, backgroundColor: light ? COLORS.ctaInk : COLORS.gold },
          ]}
        />
      ))}
    </View>
  );
}

// Ligne d'information modifiable : icône, libellé, valeur, crayon.
function InfoRow({ icon, label, value, placeholder, editing, draft, onDraft, onEdit, onSave, keyboardType }) {
  return (
    <View style={styles.infoRow}>
      <View style={styles.infoIcon}><Ionicons name={icon} size={17} color="#fff" /></View>
      <View style={{ flex: 1 }}>
        <Text style={styles.infoLabel}>{label}</Text>
        {editing ? (
          <TextInput value={draft} onChangeText={onDraft} placeholder={placeholder} placeholderTextColor="rgba(255,255,255,0.35)" style={styles.infoInput} keyboardType={keyboardType} keyboardAppearance="dark" autoFocus maxLength={80} />
        ) : (
          <Text style={[styles.infoValue, !value && styles.infoEmpty]} numberOfLines={2}>{value || placeholder}</Text>
        )}
      </View>
      <Pressable onPress={editing ? onSave : onEdit} style={[styles.editButton, editing && styles.editButtonOn]} accessibilityLabel={editing ? `Enregistrer ${label.toLowerCase()}` : `Modifier ${label.toLowerCase()}`} hitSlop={6}>
        <Ionicons name={editing ? 'checkmark' : 'pencil'} size={16} color={editing ? COLORS.ctaInk : '#fff'} />
      </Pressable>
    </View>
  );
}

export default function AccountScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const favorites = useFavorites();

  const [profile, setProfile] = useState(getProfile);
  const [editing, setEditing] = useState(null); // 'name' | 'phone' | null
  const [draft, setDraft] = useState('');
  const [addresses, setAddresses] = useState(listAddresses);
  const [sheetFor, setSheetFor] = useState(undefined); // undefined : fermée ; null : nouvelle ; objet : à modifier
  const [stats, setStats] = useState({ orders: 0, reviews: 0, categories: [] });

  // À chaque retour sur l'écran : chiffres, goûts et adresses à jour.
  useFocusEffect(useCallback(() => {
    setProfile(getProfile());
    setAddresses(listAddresses());
    const counts = new Map();
    listRecent().forEach((p) => { if (p.category) counts.set(p.category, (counts.get(p.category) || 0) + 1); });
    setStats({ orders: listOrders().length, reviews: reviewsCount(), categories: [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([c]) => c) });
  }, []));

  const startEdit = (field) => { buzzLight(); setDraft(profile[field] || ''); setEditing(field); };
  const saveEdit = () => {
    saveProfile({ ...profile, [editing]: draft });
    setProfile(getProfile());
    setEditing(null);
    buzzSuccess();
  };

  const confirmRemove = (a) => Alert.alert('Supprimer cette adresse ?', `${a.label} · ${a.address}`, [
    { text: 'Garder', style: 'cancel' },
    { text: 'Supprimer', style: 'destructive', onPress: () => { removeAddress(a.id); setAddresses(listAddresses()); } },
  ]);
  const makeDefault = (a) => { buzzLight(); setDefaultAddress(a.id); setAddresses(listAddresses()); };

  const forgetAll = () => Alert.alert(
    'Effacer mes informations ?',
    'Votre nom, votre téléphone, vos adresses et les produits consultés seront effacés de ce téléphone. Vos commandes, paniers et favoris sont gardés.',
    [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Effacer', style: 'destructive', onPress: () => {
          store.remove('client'); store.remove('addresses'); clearRecent();
          setProfile(getProfile()); setAddresses([]); setStats((s) => ({ ...s, categories: [] }));
        },
      },
    ],
  );

  const main = defaultAddress();
  const level = stats.orders >= 10 ? 'Client privilège' : stats.orders >= 3 ? 'Client fidèle' : stats.orders >= 1 ? 'Bon début' : 'Premiers pas';
  const tags = [level, ...stats.categories, main ? main.address.split(',')[0] : null].filter(Boolean);
  const shortcuts = [
    { icon: 'receipt-outline', label: 'Mes commandes', sub: 'Suivi, avis, commander à nouveau', onPress: () => router.navigate('/commandes') },
    { icon: 'heart-outline', label: 'Mes favoris', sub: `${favorites.count()} produit${favorites.count() > 1 ? 's' : ''} et boutiques gardés`, onPress: () => router.navigate('/favoris') },
    { icon: 'map-outline', label: 'Carte des boutiques', sub: 'Les boutiques autour de vous', onPress: () => router.push('/carte') },
    { icon: 'sparkles-outline', label: 'Revoir la présentation', sub: 'Les écrans de bienvenue', onPress: () => router.push('/bienvenue') },
  ];

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 40 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {/* Profil centré : avatar, nom, étiquettes */}
        <LinearGradient colors={GRADIENTS.hero} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.hero, { paddingTop: insets.top + 8 }]}>
          <Glow color={COLORS.brandVivid} size={340} opacity={0.5} style={{ top: -170, right: -120 }} />
          <Glow color={COLORS.gold} size={260} opacity={0.2} style={{ top: 40, left: -150 }} />
          <View style={styles.heroTop}>
            <Pressable onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} style={styles.round} accessibilityLabel="Retour" hitSlop={8}>
              <Ionicons name="chevron-back" size={22} color="#fff" />
            </Pressable>
            <Text style={styles.heroTitle}>Mon <Editorial>espace</Editorial></Text>
            <View style={{ width: 42 }} />
          </View>

          <View style={styles.identity}>
            <LinearGradient colors={GRADIENTS.gold} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.avatarRing}>
              <View style={styles.avatar}>
                {profile.name ? <Text style={styles.avatarText}>{initials(profile.name)}</Text> : <Ionicons name="person" size={38} color={COLORS.goldInk} />}
              </View>
            </LinearGradient>
            <Text style={styles.name} numberOfLines={1}>{profile.name || 'Client SamaBoutik'}</Text>
            <Text style={styles.role}>{profile.phone || 'Ajoutez votre téléphone pour commander plus vite'}</Text>
            <View style={styles.tags}>
              {tags.map((t) => <View key={t} style={styles.tag}><Text style={styles.tagText} numberOfLines={1}>{t}</Text></View>)}
            </View>
          </View>

          {/* Deux cartes de chiffres avec jauge */}
          <View style={styles.statCards}>
            <View style={[styles.statCard, styles.statLight]}>
              <Text style={styles.statLabelLight}>Commandes</Text>
              <Text style={styles.statValueLight}>{stats.orders}</Text>
              <Text style={styles.statHintLight}>{level}</Text>
              <Meter ratio={stats.orders / 10} light />
            </View>
            <View style={[styles.statCard, styles.statDark]}>
              <Text style={styles.statLabel}>Avis donnés</Text>
              <Text style={styles.statValue}>{stats.reviews}</Text>
              <Text style={styles.statHint}>{stats.reviews ? 'Merci pour vos avis' : 'Notez vos achats livrés'}</Text>
              <Meter ratio={stats.reviews / 10} />
            </View>
          </View>
        </LinearGradient>

        {/* Panneau « Informations » à bord arrondi */}
        <View style={styles.panel}>
          <View style={styles.panelHandle} />
          <View style={styles.panelHead}>
            <Text style={styles.panelTitle}>Informations</Text>
            <View style={styles.panelBadge}><Ionicons name="lock-closed" size={12} color={COLORS.goldInk} /><Text style={styles.panelBadgeText}>Sur ce téléphone</Text></View>
          </View>
          <InfoRow icon="person" label="Nom complet" value={profile.name} placeholder="Votre nom" editing={editing === 'name'} draft={draft} onDraft={setDraft} onEdit={() => startEdit('name')} onSave={saveEdit} />
          <InfoRow icon="call" label="Téléphone" value={profile.phone} placeholder="77 123 45 67" editing={editing === 'phone'} draft={draft} onDraft={setDraft} onEdit={() => startEdit('phone')} onSave={saveEdit} keyboardType="phone-pad" />
          <InfoRow icon="location" label="Adresse principale" value={main?.address} placeholder="Aucune adresse" editing={false} onEdit={() => setSheetFor(main || null)} />
        </View>

        {/* Adresses */}
        <View style={styles.sectionHead}>
          <Text style={styles.section}>Mes adresses</Text>
          <Pressable onPress={() => setSheetFor(null)} style={styles.addLink} hitSlop={6}>
            <Ionicons name="add" size={16} color={COLORS.ctaInk} /><Text style={styles.addLinkText}>Ajouter</Text>
          </Pressable>
        </View>
        <View style={{ paddingHorizontal: SIDE, gap: 10 }}>
          {addresses.length ? addresses.map((a) => (
            <View key={a.id} style={[styles.addressCard, a.isDefault && styles.addressDefault]}>
              <View style={styles.addressIcon}><Ionicons name={addressIcon(a.label)} size={18} color={a.isDefault ? COLORS.goldInk : COLORS.brand} /></View>
              <View style={{ flex: 1 }}>
                <View style={styles.addressTop}>
                  <Text style={styles.addressLabel}>{a.label}</Text>
                  {a.isDefault ? <Text style={styles.defaultBadge}>Principale</Text> : null}
                  {a.gps ? <View style={styles.gpsBadge}><Ionicons name="navigate" size={10} color={COLORS.green} /><Text style={styles.gpsText}>GPS</Text></View> : null}
                </View>
                <Text style={styles.addressText} numberOfLines={2}>{a.address}</Text>
                <View style={styles.addressActions}>
                  {!a.isDefault ? <Pressable onPress={() => makeDefault(a)} hitSlop={6}><Text style={styles.actionLink}>Principale</Text></Pressable> : null}
                  <Pressable onPress={() => setSheetFor(a)} hitSlop={6}><Text style={styles.actionLink}>Modifier</Text></Pressable>
                  <Pressable onPress={() => confirmRemove(a)} hitSlop={6}><Text style={[styles.actionLink, { color: COLORS.danger }]}>Supprimer</Text></Pressable>
                </View>
              </View>
            </View>
          )) : (
            <PressScale onPress={() => setSheetFor(null)} style={styles.emptyAddress} scaleTo={0.98}>
              <View style={styles.emptyIcon}><Ionicons name="location" size={22} color={COLORS.goldInk} /></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.emptyTitle}>Ajoutez votre adresse</Text>
                <Text style={styles.emptyText}>Elle se remplit toute seule à la commande, avec votre position GPS pour le livreur.</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={COLORS.faint} />
            </PressScale>
          )}
        </View>

        {/* Raccourcis */}
        <Text style={[styles.section, { paddingHorizontal: SIDE, marginTop: 26, marginBottom: 10 }]}>Raccourcis</Text>
        <View style={styles.list}>
          {shortcuts.map((s, i) => (
            <Pressable key={s.label} onPress={s.onPress} style={({ pressed }) => [styles.listRow, i > 0 && styles.listDivider, pressed && { opacity: 0.85 }]}>
              <View style={styles.listIcon}><Ionicons name={s.icon} size={18} color={COLORS.brand} /></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.listLabel}>{s.label}</Text>
                <Text style={styles.listSub}>{s.sub}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={COLORS.faint} />
            </Pressable>
          ))}
        </View>

        <Pressable onPress={forgetAll} style={styles.forget}>
          <Ionicons name="trash-outline" size={16} color={COLORS.danger} />
          <Text style={styles.forgetText}>Effacer mes informations de ce téléphone</Text>
        </Pressable>
        <View style={styles.privacy}>
          <Ionicons name="lock-closed" size={13} color={COLORS.faint} />
          <Text style={styles.privacyText}>Votre profil et vos adresses restent sur ce téléphone. Ils ne sont envoyés qu’à la boutique, avec vos commandes.</Text>
        </View>
      </ScrollView>

      <AddressSheet
        visible={sheetFor !== undefined}
        initial={sheetFor || null}
        onClose={() => setSheetFor(undefined)}
        onSaved={() => setAddresses(listAddresses())}
      />
    </View>
  );
}

const styles = sheet({
  screen: { flex: 1, backgroundColor: COLORS.bg },
  hero: { paddingHorizontal: SIDE, paddingBottom: 44, overflow: 'hidden' },
  heroTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  round: { width: 42, height: 42, borderRadius: 21, backgroundColor: 'rgba(255,255,255,0.07)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.13)', alignItems: 'center', justifyContent: 'center' },
  heroTitle: { color: '#fff', fontSize: 19, fontWeight: '800' },
  identity: { alignItems: 'center', marginTop: 14 },
  avatarRing: { width: 104, height: 104, borderRadius: 52, padding: 3 },
  avatar: { flex: 1, borderRadius: 50, backgroundColor: '#1a1640', alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: COLORS.goldInk, fontSize: 34, fontWeight: '800' },
  name: { color: '#fff', fontSize: 28, fontWeight: '800', letterSpacing: -0.7, marginTop: 14 },
  role: { color: 'rgba(255,255,255,0.6)', fontSize: 14, marginTop: 3, textAlign: 'center' },
  tags: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 7, marginTop: 14 },
  tag: { maxWidth: 180, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.1)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.14)' },
  tagText: { color: '#fff', fontSize: 12.5, fontWeight: '700' },
  statCards: { flexDirection: 'row', gap: 10, marginTop: 20 },
  statCard: { flex: 1, borderRadius: 22, padding: 14, overflow: 'hidden' },
  statLight: { backgroundColor: '#f6e7c4' },
  statDark: { backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' },
  statLabelLight: { color: 'rgba(26,16,51,0.6)', fontSize: 12.5, fontWeight: '700' },
  statValueLight: { color: COLORS.ctaInk, fontSize: 30, fontWeight: '900', marginTop: 4 },
  statHintLight: { color: '#b7651f', fontSize: 12, fontWeight: '800' },
  statLabel: { color: 'rgba(255,255,255,0.6)', fontSize: 12.5, fontWeight: '700' },
  statValue: { color: '#fff', fontSize: 30, fontWeight: '900', marginTop: 4 },
  statHint: { color: COLORS.goldInk, fontSize: 12, fontWeight: '800' },
  meter: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', height: 24, marginTop: 12 },
  mark: { width: 1.5, borderRadius: 1 },
  // Panneau Informations
  panel: {
    marginTop: -26, marginHorizontal: 0, paddingHorizontal: SIDE, paddingTop: 10, paddingBottom: 8,
    borderTopLeftRadius: 30, borderTopRightRadius: 30, backgroundColor: '#1b1747', borderTopWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },
  panelHandle: { alignSelf: 'center', width: 44, height: 5, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.2)', marginBottom: 12 },
  panelHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  panelTitle: { color: '#fff', fontSize: 19, fontWeight: '800', letterSpacing: -0.3 },
  panelBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999, backgroundColor: 'rgba(246,199,104,0.12)' },
  panelBadgeText: { color: COLORS.goldInk, fontSize: 11.5, fontWeight: '800' },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 11 },
  infoIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.08)', alignItems: 'center', justifyContent: 'center' },
  infoLabel: { color: 'rgba(255,255,255,0.5)', fontSize: 12, fontWeight: '700' },
  infoValue: { color: '#fff', fontSize: 15.5, fontWeight: '700', marginTop: 1 },
  infoEmpty: { color: 'rgba(255,255,255,0.35)', fontWeight: '600' },
  infoInput: { marginTop: 3, paddingHorizontal: 10, paddingVertical: 7, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: 1, borderColor: 'rgba(246,199,104,0.4)', color: '#fff', fontSize: 15 },
  editButton: { width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' },
  editButtonOn: { backgroundColor: COLORS.cta },
  // Adresses
  sectionHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: SIDE, marginTop: 24, marginBottom: 10 },
  section: { color: COLORS.ink, fontSize: 19, fontWeight: '800', letterSpacing: -0.4 },
  addLink: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, backgroundColor: COLORS.cta },
  addLinkText: { color: COLORS.ctaInk, fontSize: 13, fontWeight: '800' },
  addressCard: { flexDirection: 'row', gap: 12, padding: 14, borderRadius: RADIUS.lg, backgroundColor: COLORS.card, ...SHADOW },
  addressDefault: { borderColor: 'rgba(246,199,104,0.35)' },
  addressIcon: { width: 40, height: 40, borderRadius: 13, backgroundColor: COLORS.raised, alignItems: 'center', justifyContent: 'center' },
  addressTop: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  addressLabel: { color: COLORS.ink, fontSize: 15, fontWeight: '800' },
  defaultBadge: { color: COLORS.ctaInk, backgroundColor: COLORS.cta, fontSize: 10.5, fontWeight: '800', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 999, overflow: 'hidden' },
  gpsBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: COLORS.greenSoft, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 999 },
  gpsText: { color: COLORS.green, fontSize: 10.5, fontWeight: '800' },
  addressText: { color: COLORS.muted, fontSize: 13.5, marginTop: 3, lineHeight: 19 },
  addressActions: { flexDirection: 'row', gap: 16, marginTop: 8 },
  actionLink: { color: COLORS.brand, fontSize: 13, fontWeight: '800' },
  emptyAddress: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: RADIUS.lg, backgroundColor: COLORS.card, borderWidth: 1, borderStyle: 'dashed', borderColor: 'rgba(246,199,104,0.4)' },
  emptyIcon: { width: 42, height: 42, borderRadius: 14, backgroundColor: COLORS.goldSoft, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { color: COLORS.ink, fontSize: 15, fontWeight: '800' },
  emptyText: { color: COLORS.muted, fontSize: 12.5, marginTop: 2, lineHeight: 17 },
  list: { marginHorizontal: SIDE, borderRadius: RADIUS.lg, backgroundColor: COLORS.card, ...SHADOW, overflow: 'hidden' },
  listRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 13 },
  listDivider: { borderTopWidth: 1, borderTopColor: COLORS.line },
  listIcon: { width: 36, height: 36, borderRadius: 12, backgroundColor: COLORS.brandSoft, alignItems: 'center', justifyContent: 'center' },
  listLabel: { color: COLORS.ink, fontSize: 15, fontWeight: '700' },
  listSub: { color: COLORS.faint, fontSize: 12, marginTop: 1 },
  forget: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 22, paddingVertical: 12 },
  forgetText: { color: COLORS.danger, fontSize: 14, fontWeight: '700' },
  privacy: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, paddingHorizontal: 28, marginTop: 4 },
  privacyText: { flex: 1, color: COLORS.faint, fontSize: 12, lineHeight: 17, textAlign: 'center' },
});
