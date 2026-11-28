// Fenêtre « Donner mon avis » sur un produit reçu : étoiles, commentaire, prénom.
// Envoyé avec le numéro de la commande livrée : l'avis porte le badge « Achat vérifié ».
import { useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { GradientButton } from './ui';
import { submitReview } from '../lib/reviews';
import { getProfile } from '../lib/profile';
import { buzzLight, buzzSuccess } from '../lib/feedback';
import { COLORS, GRADIENTS, RADIUS, sheet } from '../theme';

const WORDS = ['Touchez une étoile', 'Décevant', 'Moyen', 'Bien', 'Très bien', 'Excellent !'];

function ReviewForm({ product, orderId, onClose, onDone }) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [name, setName] = useState(() => getProfile().name);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);

  const send = async () => {
    setError('');
    setSending(true);
    const result = await submitReview({ productId: product.id, rating, comment, name, orderId });
    setSending(false);
    if (!result.ok) { setError(result.error); return; }
    buzzSuccess();
    setSent(true);
    onDone?.(product.id);
  };

  if (sent) {
    return (
      <View style={styles.done}>
        <LinearGradient colors={GRADIENTS.gold} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.doneIcon}>
          <Ionicons name="heart" size={30} color={COLORS.ctaInk} />
        </LinearGradient>
        <Text style={styles.doneTitle}>Merci pour votre avis !</Text>
        <Text style={styles.doneText}>Il aide les autres clients à bien choisir et encourage la boutique.</Text>
        <GradientButton title="Fermer" icon="checkmark" onPress={onClose} style={{ alignSelf: 'stretch', marginTop: 18 }} />
      </View>
    );
  }

  return (
    <>
      <Text style={styles.kicker}>VOTRE AVIS</Text>
      <Text style={styles.title} numberOfLines={2}>{product.name}</Text>

      <View style={styles.stars} accessibilityRole="adjustable" accessibilityLabel={`Note : ${rating} sur 5`}>
        {[1, 2, 3, 4, 5].map((n) => (
          <Pressable key={n} onPress={() => { buzzLight(); setRating(n); }} hitSlop={6} accessibilityLabel={`${n} étoile${n > 1 ? 's' : ''}`}>
            <Ionicons name={n <= rating ? 'star' : 'star-outline'} size={38} color={n <= rating ? COLORS.gold : COLORS.faint} />
          </Pressable>
        ))}
      </View>
      <Text style={[styles.word, rating > 0 && { color: COLORS.goldInk }]}>{WORDS[rating]}</Text>

      <Text style={styles.label}>Votre commentaire</Text>
      <TextInput
        value={comment}
        onChangeText={(t) => setComment(t.slice(0, 1000))}
        placeholder="Qualité, taille, livraison… qu’en avez-vous pensé ?"
        placeholderTextColor={COLORS.faint}
        style={[styles.input, styles.inputMulti]}
        multiline
        keyboardAppearance="dark"
      />
      <Text style={styles.count}>{comment.trim().length}/1000</Text>

      <Text style={styles.label}>Votre prénom (affiché avec l’avis)</Text>
      <TextInput value={name} onChangeText={setName} placeholder="Ex. Fatou" placeholderTextColor={COLORS.faint} style={styles.input} keyboardAppearance="dark" maxLength={80} />

      {error ? <Text style={styles.error}>{error}</Text> : null}
      <GradientButton title="Publier mon avis" icon="send" onPress={send} loading={sending} disabled={!rating || comment.trim().length < 3} style={{ marginTop: 16 }} />
      <View style={styles.verified}>
        <Ionicons name="shield-checkmark" size={14} color={COLORS.green} />
        <Text style={styles.verifiedText}>Commande livrée : votre avis portera le badge « Achat vérifié ».</Text>
      </View>
    </>
  );
}

export default function ReviewSheet({ product, orderId, onClose, onDone }) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={Boolean(product)} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Fermer" />
        <View style={[styles.sheet, { paddingBottom: insets.bottom + 18 }]}>
          <View style={styles.handle} />
          <Pressable onPress={onClose} style={styles.close} hitSlop={8} accessibilityLabel="Fermer"><Ionicons name="close" size={20} color={COLORS.muted} /></Pressable>
          {product ? <ReviewForm key={product.id} product={product} orderId={orderId} onClose={onClose} onDone={onDone} /> : null}
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
  title: { color: COLORS.ink, fontSize: 20, fontWeight: '800', marginTop: 4, marginRight: 40, letterSpacing: -0.4 },
  stars: { flexDirection: 'row', justifyContent: 'center', gap: 10, marginTop: 20 },
  word: { color: COLORS.faint, fontSize: 14, fontWeight: '700', textAlign: 'center', marginTop: 8 },
  label: { color: COLORS.muted, fontSize: 13, fontWeight: '700', marginTop: 16, marginBottom: 6 },
  input: {
    backgroundColor: COLORS.bg, borderWidth: 1, borderColor: COLORS.line, borderRadius: RADIUS.sm + 2,
    paddingHorizontal: 12, paddingVertical: 11, color: COLORS.ink, fontSize: 15,
  },
  inputMulti: { minHeight: 96, textAlignVertical: 'top' },
  count: { color: COLORS.faint, fontSize: 11.5, textAlign: 'right', marginTop: 4 },
  error: { color: COLORS.danger, fontSize: 13, fontWeight: '700', marginTop: 12 },
  verified: { flexDirection: 'row', alignItems: 'center', gap: 6, justifyContent: 'center', marginTop: 12 },
  verifiedText: { color: COLORS.muted, fontSize: 12 },
  done: { alignItems: 'center', paddingVertical: 18 },
  doneIcon: { width: 68, height: 68, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  doneTitle: { color: COLORS.ink, fontSize: 21, fontWeight: '800', marginTop: 14 },
  doneText: { color: COLORS.muted, fontSize: 14, textAlign: 'center', marginTop: 6, lineHeight: 20 },
});
