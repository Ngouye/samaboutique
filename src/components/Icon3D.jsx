import React from 'react';

const EMOJI_MAP = {
  'rocket': 'Rocket/3D/rocket_3d.png',
  'cart': 'Shopping%20cart/3D/shopping_cart_3d.png',
  'bags': 'Shopping%20bags/3D/shopping_bags_3d.png',
  'package': 'Package/3D/package_3d.png',
  'gift': 'Wrapped%20gift/3D/wrapped_gift_3d.png',
  'star': 'Star/3D/star_3d.png',
  'fire': 'Fire/3D/fire_3d.png',
  'money': 'Money%20bag/3D/money_bag_3d.png',
  'card': 'Credit%20card/3D/credit_card_3d.png',
  'truck': 'Delivery%20truck/3D/delivery_truck_3d.png',
  'megaphone': 'Megaphone/3D/megaphone_3d.png',
  'check': 'Check%20mark%20button/3D/check_mark_button_3d.png',
  'store': 'Convenience%20store/3D/convenience_store_3d.png',
  'heart': 'Sparkling%20heart/3D/sparkling_heart_3d.png',
  'crown': 'Crown/3D/crown_3d.png',
  'party': 'Party%20popper/3D/party_popper_3d.png',
  'locked': 'Locked/3D/locked_3d.png',
  'shield': 'Shield/3D/shield_3d.png',
  'gem': 'Gem%20stone/3D/gem_stone_3d.png',
  'eyes': 'Eyes/3D/eyes_3d.png'
};

export default function Icon3D({ name, className = "w-8 h-8", alt = "" }) {
  const path = EMOJI_MAP[name];
  
  if (!path) {
    console.warn(`3D Icon not found for: ${name}`);
    return null;
  }
  
  return (
    <img 
      src={`https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/${path}`} 
      alt={alt || name} 
      className={`inline-block drop-shadow-sm ${className}`}
      loading="lazy"
    />
  );
}
