// Metro (le bundler d'Expo) : l'application réutilise les fonctions du site (dossier ../src/utils),
// sans les copier : numéro WhatsApp, produits en ligne, options des produits, paiements, livraison.
const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);
config.watchFolders = [...(config.watchFolders || []), path.resolve(__dirname, '..', 'src', 'utils')];

module.exports = config;
