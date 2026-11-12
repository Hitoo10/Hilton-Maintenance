// Arabic RTL bootstrap. Keep global locale stable for date formatting.
import { I18nManager } from 'react-native';
if (!I18nManager.isRTL) I18nManager.forceRTL(true);
I18nManager.allowRTL(true);
