// Position GPS de l'appareil, demandée uniquement après un clic de l'utilisateur.
export function getCurrentPosition() {
  return new Promise((resolve, reject) => {
    if (!('geolocation' in navigator)) {
      reject(new Error("Votre navigateur ne permet pas la géolocalisation."));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy }),
      (err) => reject(new Error(
        err.code === 1
          ? "Autorisation refusée. Vous pourrez localiser votre boutique plus tard depuis vos paramètres."
          : "Position introuvable. Réessayez dans quelques instants, idéalement près d'une fenêtre."
      )),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  });
}

export const googleMapsUrl = (lat, lng) => `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
