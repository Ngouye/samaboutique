// Fonctions communes au site et à l'application (fichiers du site, dans ../src/utils).
// Les modifier change aussi le site : les tests du site les vérifient (npm test à la racine).
export { whatsappNumber, canonicalPhone } from '../../../src/utils/phone';
export { isLive } from '../../../src/utils/productVisibility';
export { productOptions, needsChoice } from '../../../src/utils/productOptions';
export {
  MOBILE_CHANNELS, isMobileChannel, DEPOSIT_PERCENT, depositFor, isDeposit, depositAmount, depositPaid,
} from '../../../src/utils/payments';
