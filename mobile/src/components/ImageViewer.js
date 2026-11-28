// Photos d'un produit en plein écran : on glisse d'une photo à l'autre ; sur iPhone, on pince pour zoomer.
import { useState } from 'react';
import { FlatList, Modal, Platform, Pressable, ScrollView, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import Ionicons from '@expo/vector-icons/Ionicons';
import { thumbUrl } from '../lib/format';
import { sheet } from '../theme';

function Viewer({ images, start, onClose }) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [index, setIndex] = useState(start);
  return (
    <View style={styles.screen}>
      <FlatList
        data={images}
        horizontal
        pagingEnabled
        initialScrollIndex={start}
        getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
        keyExtractor={(uri, i) => `${i}-${uri}`}
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(e) => setIndex(Math.round(e.nativeEvent.contentOffset.x / width))}
        renderItem={({ item }) => (
          <ScrollView
            style={{ width, height }}
            contentContainerStyle={{ width, height, alignItems: 'center', justifyContent: 'center' }}
            maximumZoomScale={3}
            minimumZoomScale={1}
            centerContent
            showsHorizontalScrollIndicator={false}
            showsVerticalScrollIndicator={false}
          >
            <Image source={item} placeholder={thumbUrl(item)} style={{ width, height: height * 0.78 }} contentFit="contain" transition={150} />
          </ScrollView>
        )}
      />
      <View style={[styles.top, { top: insets.top + 10 }]} pointerEvents="box-none">
        <Text style={styles.counter}>{index + 1} / {images.length}</Text>
        <Pressable onPress={onClose} style={styles.close} accessibilityLabel="Fermer les photos" hitSlop={10}>
          <Ionicons name="close" size={24} color="#fff" />
        </Pressable>
      </View>
      <Text style={[styles.hint, { bottom: insets.bottom + 18 }]}>
        {images.length > 1 ? 'Glissez pour voir les autres photos' : ''}{images.length > 1 && Platform.OS === 'ios' ? ' · ' : ''}{Platform.OS === 'ios' ? 'Pincez pour zoomer' : ''}
      </Text>
    </View>
  );
}

// start : photo ouverte (null : visionneuse fermée).
export default function ImageViewer({ images, start, onClose }) {
  return (
    <Modal visible={start != null} animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      {start != null ? <Viewer key={start} images={images} start={start} onClose={onClose} /> : null}
    </Modal>
  );
}

const styles = sheet({
  screen: { flex: 1, backgroundColor: '#05040f' },
  top: { position: 'absolute', left: 16, right: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  counter: {
    color: '#fff', fontSize: 14, fontWeight: '800', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  close: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center' },
  hint: { position: 'absolute', left: 0, right: 0, textAlign: 'center', color: 'rgba(255,255,255,0.55)', fontSize: 12.5, fontWeight: '600' },
});
