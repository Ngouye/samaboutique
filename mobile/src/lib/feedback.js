// Petite vibration du téléphone pour confirmer une action (sans effet sur le web).
import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';

const on = Platform.OS !== 'web';
export const buzzSuccess = () => { if (on) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {}); };
export const buzzWarning = () => { if (on) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {}); };
export const buzzLight = () => { if (on) Haptics.selectionAsync().catch(() => {}); };
